import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { Rng } from '../src/core/rng';
import { resolveEvent } from '../src/core/events';
import { startMission } from '../src/core/missions';
import {
  autoAssign,
  bestDutyFor,
  computeTasking,
  setDuty,
  sortieCapacity,
} from '../src/core/tasking';
import { isAircrew } from '../src/core/aircrew';
import { aircraftType } from '../src/data/aircraft';
import { MISSIONS } from '../src/data/missions';
import type { AircraftDuty, GameState } from '../src/core/types';

function answerAll(state: GameState): void {
  const rng = new Rng(state.day * 7919);
  while (state.pendingEvents.length > 0) resolveEvent(state, rng, 0, 0);
}

function runDays(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    answerAll(state);
    endDay(state);
  }
}

function setAll(state: GameState, duty: AircraftDuty): void {
  for (const a of state.aircraft) setDuty(state, a.id, duty);
}

/**
 * Accept a mission, granting the prestige it is gated behind. Asserting the
 * result matters: `startMission` returns false for a gated mission, which
 * would otherwise leave the test running against no mission at all.
 */
function begin(state: GameState, id: string): void {
  state.prestige = 2000;
  expect(startMission(state, id), `mission ${id} did not start`).toBe(true);
}


/**
 * Accept a mission and put the ship in the operating area.
 *
 * Contribution is deliberately zero during the outbound passage, so a test
 * about tasking has to actually be on station.
 */
function deploy(state: GameState, id: string): void {
  begin(state, id);
  expect(state.status).toBe('outbound');
  state.status = 'onstation';
  state.statusDaysLeft = 0;
}

describe('air tasking order', () => {
  it('gives every airframe a duty from day one', () => {
    const s = newCampaign(1234);
    for (const a of s.aircraft) {
      expect(a.duty).toBeDefined();
    }
    // Airframes with open work orders belong in the shops, not on alert.
    for (const a of s.aircraft) {
      if (s.workOrders.some((w) => w.aircraftId === a.id)) {
        expect(a.duty).toBe('maintenance');
      }
    }
  });

  it('contributes nothing when no mission is active', () => {
    const s = newCampaign(11);
    setAll(s, 'strike');
    const tasking = computeTasking(s);
    expect(tasking.contribution).toBe(0);
    expect(tasking.required).toBe(0);
    expect(tasking.ratio).toBe(0);
  });

  it('only counts duties the mission actually rewards', () => {
    const s = newCampaign(22);
    // Disaster relief is carried by lift, not by strike.
    deploy(s, 'm-relief');

    setAll(s, 'strike');
    const strikeCover = computeTasking(s).contribution;

    setAll(s, 'lift');
    const liftCover = computeTasking(s).contribution;

    expect(liftCover).toBeGreaterThan(strikeCover);
  });

  it('only counts airframes suited to the duty', () => {
    const s = newCampaign(33);
    deploy(s, 'm-relief');

    // Fighters cannot carry relief cargo; helicopters and transports can.
    setAll(s, 'standdown');
    for (const a of s.aircraft) {
      if (aircraftType(a.typeId).role === 'fighter') setDuty(s, a.id, 'lift');
    }
    expect(computeTasking(s).contribution).toBe(0);

    setAll(s, 'standdown');
    for (const a of s.aircraft) {
      const role = aircraftType(a.typeId).role;
      if (role === 'helo' || role === 'transport') setDuty(s, a.id, 'lift');
    }
    expect(computeTasking(s).contribution).toBeGreaterThan(0);
  });

  it('does not count airframes that cannot fly', () => {
    const s = newCampaign(44);
    deploy(s, 'm-patrol');
    autoAssign(s);
    const before = computeTasking(s).contribution;
    expect(before).toBeGreaterThan(0);

    // Break the avionics on every aircraft: tasked, but unable to launch.
    for (const a of s.aircraft) a.systems.avionics = 5;
    const after = computeTasking(s);
    expect(after.contribution).toBe(0);
    expect(after.unableToFly).toBeGreaterThan(0);
    expect(after.warnings.length).toBeGreaterThan(0);
  });

  it('caps sorties at what the deck can actually turn', () => {
    const s = newCampaign(55);
    deploy(s, 'm-crisis');
    setAll(s, 'cap');

    // Strip out the people who launch and recover aircraft, but leave the
    // aircrew fit — the point here is deck capacity, not empty cockpits.
    for (const c of s.crew) {
      if (isAircrew(c)) continue;
      if (c.department === 'DECK' || c.department === 'AIR') {
        c.health = 'injured';
        c.status = 'injured';
        c.awayDays = 20;
      }
    }
    const tasking = computeTasking(s);
    expect(tasking.sortieCapacity).toBeLessThan(tasking.flyable);
    expect(tasking.capacityLimited).toBe(true);
  });

  it('picks a sensible duty for each airframe type', () => {
    const s = newCampaign(66);
    deploy(s, 'm-relief');
    for (const a of s.aircraft) {
      if (!s.workOrders.some((w) => w.aircraftId === a.id) && a.state !== 'damaged') {
        const role = aircraftType(a.typeId).role;
        const duty = bestDutyFor(s, a);
        if (role === 'helo' || role === 'transport') expect(duty).toBe('lift');
        if (role === 'fighter') expect(duty).not.toBe('lift');
      }
    }
  });
});

describe('tasking drives mission achievement', () => {
  it('advances a mission far faster when correctly tasked', () => {
    const good = newCampaign(4242);
    const bad = newCampaign(4242);

    deploy(good, 'm-relief');
    deploy(bad, 'm-relief');

    for (let i = 0; i < 6; i++) {
      good.pendingEvents = [];
      bad.pendingEvents = [];
      autoAssign(good); // right airframes on lift
      setAll(bad, 'standdown'); // the whole wing chained to the deck
      endDay(good);
      endDay(bad);
    }

    expect(good.mission!.progress).toBeGreaterThan(bad.mission!.progress + 20);
    // A stood-down wing makes essentially no progress.
    expect(bad.mission!.progress).toBeLessThan(12);
  });

  it('flies sorties only for airframes tasked to fly', () => {
    const s = newCampaign(777);
    deploy(s, 'm-patrol');
    setAll(s, 'standdown');
    s.pendingEvents = [];
    const report = endDay(s);
    expect(report.sortiesLaunched).toBe(0);

    autoAssign(s);
    s.pendingEvents = [];
    const report2 = endDay(s);
    expect(report2.sortiesLaunched).toBeGreaterThan(0);
  });

  it('spares airframe life when the wing stands down', () => {
    const flying = newCampaign(88);
    const rested = newCampaign(88);
    deploy(flying, 'm-crisis');
    deploy(rested, 'm-crisis');

    for (let i = 0; i < 8; i++) {
      flying.pendingEvents = [];
      rested.pendingEvents = [];
      autoAssign(flying);
      setAll(rested, 'standdown');
      endDay(flying);
      endDay(rested);
    }

    const wear = (s: GameState) =>
      s.aircraft.reduce((t, a) => t + a.systems.engine + a.systems.airframe, 0);
    expect(wear(rested)).toBeGreaterThan(wear(flying));
  });

  it('reports the tasking outcome in the daily report', () => {
    const s = newCampaign(99);
    deploy(s, 'm-patrol');
    autoAssign(s);
    s.pendingEvents = [];
    const report = endDay(s);
    expect(report.tasking.required).toBeGreaterThan(0);
    expect(report.tasking.ratio).toBeGreaterThan(0);
  });

  it('keeps deck alert aircraft off the sortie count but useful', () => {
    const s = newCampaign(2468);
    deploy(s, 'm-convoy');
    setAll(s, 'alert');
    const tasking = computeTasking(s);
    expect(tasking.flyable).toBe(0);
    expect(tasking.alertCount).toBeGreaterThan(0);

    s.mission!.riskModifier = 30;
    s.pendingEvents = [];
    endDay(s);
    // Alert aircraft shave accumulated risk.
    expect(s.mission!.riskModifier).toBeLessThan(30);
  });
});

describe('mission achievability', () => {
  /**
   * A requirement the starting wing cannot physically reach is not a
   * difficulty curve, it is a wall. Every mission must be clearable by a
   * healthy, well-tasked ship — `scripts/balance-tasking.mjs` prints the
   * same figures for tuning.
   */
  it('lets a healthy, well-tasked ship cover every mission objective', () => {
    for (const def of MISSIONS) {
      const covers: number[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const s = newCampaign(seed);
        s.prestige = 2000;
        for (const c of s.crew) {
          c.fatigue = 10;
          c.morale = 80;
        }
        for (const a of s.aircraft) {
          a.systems.engine = 95;
          a.systems.avionics = 95;
          a.systems.airframe = 95;
          a.fuel = 95;
        }
        s.workOrders.length = 0;
        expect(startMission(s, def.id)).toBe(true);
        s.status = 'onstation';
        autoAssign(s);
        covers.push(computeTasking(s).ratio);
      }
      const avg = covers.reduce((a, b) => a + b, 0) / covers.length;
      expect(avg, `${def.id} averages only ${(avg * 100).toFixed(0)}% cover`).toBeGreaterThan(0.95);
    }
  });

  it('does not let a mission be cleared by ignoring its duty mix', () => {
    for (const def of MISSIONS) {
      const s = newCampaign(7);
      s.prestige = 2000;
      expect(startMission(s, def.id)).toBe(true);
      s.status = 'onstation';
      // Everything stood down: no mission should be satisfiable this way.
      setAll(s, 'standdown');
      expect(computeTasking(s).ratio).toBe(0);
    }
  });
});

describe('turn-based integrity', () => {
  it('never advances state without endDay', () => {
    const s = newCampaign(31337);
    const before = JSON.stringify(s);
    // Simulate a long wall-clock pause: read the state repeatedly.
    for (let i = 0; i < 50; i++) {
      computeTasking(s);
      sortieCapacity(s);
    }
    expect(JSON.stringify(s)).toBe(before);
  });

  it('carries the tasking order across days until changed', () => {
    const s = newCampaign(1357);
    deploy(s, 'm-patrol');
    setAll(s, 'recon');
    const duties = s.aircraft.map((a) => a.duty);
    runDays(s, 3);
    expect(s.aircraft.map((a) => a.duty)).toEqual(duties);
  });

  it('survives a save/load round trip with duties intact', () => {
    const s = newCampaign(2024);
    deploy(s, 'm-elint');
    autoAssign(s);
    const json = JSON.stringify(s);
    const restored = JSON.parse(json) as GameState;
    expect(computeTasking(restored).contribution).toBeCloseTo(
      computeTasking(s).contribution,
      6,
    );
  });
});
