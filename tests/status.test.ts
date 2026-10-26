import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { startMission } from '../src/core/missions';
import { isInPort, isOnStation, missionTotalDays } from '../src/core/status';
import {
  canBuyAircraft,
  canBuyEquipment,
  orderAircraft,
  orderEquipment,
} from '../src/core/procurement';
import { purchaseSupply, purchaseUpgrade, recruit } from '../src/core/economy';
import { autoAssign, computeTasking } from '../src/core/tasking';
import { Rng } from '../src/core/rng';
import { MISSIONS, missionDef } from '../src/data/missions';
import { aircraftType } from '../src/data/aircraft';
import type { CarrierStatus, GameState } from '../src/core/types';

function quietDays(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    state.pendingEvents = [];
    endDay(state);
  }
}

/** Run until the ship reaches a given status, or give up. */
function runUntil(state: GameState, status: CarrierStatus, limit = 60): number {
  for (let i = 0; i < limit; i++) {
    if (state.status === status) return i;
    state.pendingEvents = [];
    endDay(state);
  }
  throw new Error(`never reached ${status}; stuck in ${state.status}`);
}

describe('the mission cycle', () => {
  it('starts alongside in port', () => {
    const s = newCampaign(1234);
    expect(s.status).toBe('port');
    expect(isInPort(s)).toBe(true);
    expect(s.mission).toBeNull();
  });

  it('runs port -> outbound -> on station -> inbound -> port', () => {
    const s = newCampaign(11);
    s.prestige = 2000;
    const def = missionDef('m-workups');

    expect(startMission(s, 'm-workups')).toBe(true);
    expect(s.status).toBe('outbound');
    expect(s.statusDaysLeft).toBe(def.transitDays);

    // The passage out is spent before any work begins.
    const toStation = runUntil(s, 'onstation');
    expect(toStation).toBe(def.transitDays);
    expect(isOnStation(s)).toBe(true);

    // Then the work, then the passage home.
    runUntil(s, 'inbound');
    expect(s.mission).toBeNull();
    expect(s.statusDaysLeft).toBe(def.transitDays);

    runUntil(s, 'port');
    expect(isInPort(s)).toBe(true);
    expect(s.missionHistory).toHaveLength(1);
  });

  it('takes at least the transit-plus-work time to complete a mission', () => {
    const s = newCampaign(22);
    s.prestige = 2000;
    expect(startMission(s, 'm-workups')).toBe(true);
    const startDay = s.day;

    runUntil(s, 'port');
    const elapsed = s.day - startDay;

    // Two passages plus at least one day on station.
    const def = missionDef('m-workups');
    expect(elapsed).toBeGreaterThanOrEqual(def.transitDays * 2 + 1);
  });

  it('exposes the full duration including both passages', () => {
    for (const def of MISSIONS) {
      expect(def.transitDays).toBeGreaterThanOrEqual(1);
      expect(missionTotalDays(def.id)).toBe(def.days + def.transitDays * 2);
      // The user-facing minimum: sail out, work a day, sail home.
      expect(missionTotalDays(def.id)).toBeGreaterThanOrEqual(3);
    }
  });

  it('reopens the mission board only once alongside', () => {
    const s = newCampaign(33);
    s.prestige = 2000;
    expect(startMission(s, 'm-workups')).toBe(true);
    expect(s.missionOffers).not.toContain('m-workups');

    runUntil(s, 'inbound');
    // Still at sea: cannot take on anything new.
    expect(startMission(s, 'm-patrol')).toBe(false);

    runUntil(s, 'port');
    expect(s.missionOffers.length).toBeGreaterThan(0);
    expect(startMission(s, s.missionOffers[0]!)).toBe(true);
  });

  it('reports the phase change in the daily report', () => {
    const s = newCampaign(44);
    s.prestige = 2000;
    startMission(s, 'm-workups');

    let sawChange = false;
    for (let i = 0; i < 40 && !sawChange; i++) {
      s.pendingEvents = [];
      const report = endDay(s);
      if (report.statusAfter !== report.statusBefore) {
        sawChange = true;
        expect(report.statusBefore).toBe('outbound');
        expect(report.statusAfter).toBe('onstation');
      }
    }
    expect(sawChange).toBe(true);
  });
});

describe('the mission only advances on station', () => {
  it('makes no progress during the outbound passage', () => {
    const s = newCampaign(55);
    s.prestige = 2000;
    startMission(s, 'm-elint'); // three-day passage each way
    autoAssign(s);

    quietDays(s, 2);
    expect(s.status).toBe('outbound');
    expect(s.mission!.progress).toBe(0);
    // Sorties count for nothing until the ship arrives.
    expect(computeTasking(s).contribution).toBe(0);

    quietDays(s, 1);
    expect(s.status).toBe('onstation');
    autoAssign(s);
    expect(computeTasking(s).contribution).toBeGreaterThan(0);

    quietDays(s, 1);
    expect(s.mission!.progress).toBeGreaterThan(0);
  });
});

describe('nothing comes aboard at sea', () => {
  const atSea: CarrierStatus[] = ['outbound', 'onstation', 'inbound'];

  it('refuses every purchase while deployed', () => {
    for (const status of atSea) {
      const s = newCampaign(66);
      s.credits = 20_000_000;
      s.prestige = 3000;
      s.candidates = [
        {
          id: 'cand-test',
          name: 'Test Candidate',
          rank: 2,
          primary: 'avionics',
          department: 'MAINT',
          attrs: {
            technical: 70,
            discipline: 70,
            speed: 60,
            stamina: 60,
            leadership: 40,
            stress: 60,
            experience: 50,
          },
          traits: { ambition: 50, teamwork: 50, risk: 50, adaptability: 50, loyalty: 50 },
          skills: { avionics: 70 },
          costPrestige: 10,
          costCredits: 10000,
        },
      ];
      s.status = status;

      expect(canBuyAircraft(s, 'fa18e').ok, `aircraft while ${status}`).toBe(false);
      expect(orderAircraft(s, 'fa18e'), `order aircraft while ${status}`).toBe(false);
      expect(canBuyEquipment(s, 'eq-tractor').ok, `equipment while ${status}`).toBe(false);
      expect(orderEquipment(s, 'eq-tractor'), `order equipment while ${status}`).toBe(false);
      expect(purchaseSupply(s, 'fuel', 10), `supplies while ${status}`).toBe(false);
      expect(purchaseUpgrade(s, 'up-avionics'), `upgrade while ${status}`).toBe(false);
      expect(recruit(s, new Rng(1), 'cand-test'), `recruit while ${status}`).toBe(false);
      expect(s.deliveries).toHaveLength(0);
    }
  });

  it('allows every purchase alongside', () => {
    const s = newCampaign(77);
    s.credits = 20_000_000;
    s.prestige = 3000;
    expect(isInPort(s)).toBe(true);
    expect(orderAircraft(s, 'fa18e')).toBe(true);
    expect(orderEquipment(s, 'eq-tractor')).toBe(true);
    expect(purchaseSupply(s, 'fuel', 5)).toBe(true);
    expect(purchaseUpgrade(s, 'up-avionics')).toBe(true);
  });

  it('holds a delivery that comes due at sea until the ship is alongside', () => {
    const s = newCampaign(88);
    s.credits = 20_000_000;
    s.prestige = 3000;

    // Order something with a short lead, then sail on a long deployment.
    expect(orderEquipment(s, 'eq-bunks')).toBe(true); // two-day lead
    expect(startMission(s, 'm-elint')).toBe(true); // three-day passage

    quietDays(s, 4);
    expect(s.status).toBe('onstation');
    // Due days ago, but the ship is at sea, so it waits.
    expect(s.deliveries).toHaveLength(1);
    expect(s.equipment['eq-bunks']).toBeUndefined();

    runUntil(s, 'port');
    // Alongside again: it comes aboard on the day of arrival or the next.
    quietDays(s, 1);
    expect(s.equipment['eq-bunks']).toBe(1);
    expect(s.deliveries).toHaveLength(0);
  });
});

describe('port is the recovery phase', () => {
  it('rests the crew faster alongside than at sea', () => {
    const inPort = newCampaign(99);
    const atSea = newCampaign(99);
    atSea.status = 'onstation';

    for (const s of [inPort, atSea]) {
      s.tempo = 'low';
      for (const c of s.crew) {
        c.fatigue = 80;
        c.status = 'resting';
      }
      s.pendingEvents = [];
      endDay(s);
    }

    const fatigue = (s: GameState) => s.crew.reduce((t, c) => t + c.fatigue, 0);
    expect(fatigue(inPort)).toBeLessThan(fatigue(atSea));
  });

  it('works the maintenance backlog faster alongside', () => {
    const inPort = newCampaign(2024);
    const atSea = newCampaign(2024);
    atSea.status = 'onstation';

    for (const s of [inPort, atSea]) {
      s.supplies.parts = 100;
      s.pendingEvents = [];
      endDay(s);
    }

    const labour = (s: GameState) => s.workOrders.reduce((t, w) => t + w.labourDone, 0);
    expect(labour(inPort)).toBeGreaterThan(labour(atSea));
  });
});

describe('status persistence', () => {
  it('survives a save/load mid-passage', () => {
    const s = newCampaign(1357);
    s.prestige = 2000;
    startMission(s, 'm-strike');
    quietDays(s, 1);
    expect(s.status).toBe('outbound');

    const restored = JSON.parse(JSON.stringify(s)) as GameState;
    expect(restored.status).toBe('outbound');
    expect(restored.statusDaysLeft).toBe(s.statusDaysLeft);

    quietDays(s, 3);
    quietDays(restored, 3);
    expect(restored.status).toBe(s.status);
  });

  it('never leaves a mission running once alongside', () => {
    const s = newCampaign(2468);
    s.prestige = 2000;
    startMission(s, 'm-workups');
    runUntil(s, 'port');
    expect(s.mission).toBeNull();

    // And a second cycle works the same way.
    expect(startMission(s, s.missionOffers[0]!)).toBe(true);
    runUntil(s, 'port');
    expect(s.mission).toBeNull();
    expect(s.missionHistory).toHaveLength(2);
  });

  it('keeps aircraft parked and tasked across a full cycle', () => {
    const s = newCampaign(31337);
    s.prestige = 2000;
    startMission(s, 'm-patrol');
    runUntil(s, 'port');
    for (const a of s.aircraft) {
      expect(a.duty).toBeDefined();
      expect(a.deck === 1 || a.deck === 2).toBe(true);
    }
    expect(aircraftType(s.aircraft[0]!.typeId)).toBeDefined();
  });
});
