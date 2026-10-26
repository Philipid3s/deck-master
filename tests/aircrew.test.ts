import { describe, expect, it } from 'vitest';
import { setWatchPolicy } from '../src/core/watch';
import { DEPT_IDS } from '../src/data/specialties';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { Rng } from '../src/core/rng';
import { resolveEvent } from '../src/core/events';
import { startMission } from '../src/core/missions';
import { autoAssign, computeTasking, setDuty } from '../src/core/tasking';
import {
  assignAircrew,
  assignedAircraft,
  autoCrew,
  autoCrewAircraft,
  canFillSeat,
  clearSeat,
  crewFactor,
  fillVacantSeats,
  crewQuality,
  isAircrew,
  isCrewed,
  seatCount,
  seatOccupant,
  unassignAircrew,
} from '../src/core/aircrew';
import { aircraftType } from '../src/data/aircraft';
import { isMissionCapable } from '../src/core/aircraft';
import type { GameState } from '../src/core/types';

function answerAll(state: GameState): void {
  const rng = new Rng(state.day * 7919);
  while (state.pendingEvents.length > 0) resolveEvent(state, rng, 0, 0);
}

/** Put the ship on station on a mission, with the wing tasked and manned. */
function deploy(state: GameState, missionId = 'm-crisis'): void {
  state.prestige = 3000;
  expect(startMission(state, missionId)).toBe(true);
  state.status = 'onstation';
  autoAssign(state);
}

const pilots = (s: GameState) => s.crew.filter((c) => c.primary === 'pilot');

describe('aircrew are named people in seats', () => {
  it('mans every seat of the starting wing', () => {
    const s = newCampaign(4242);
    for (const a of s.aircraft) {
      expect(a.crewIds).toHaveLength(aircraftType(a.typeId).crewRequired);
      expect(isCrewed(s, a), `#${a.tail} has no commander`).toBe(true);
      for (let seat = 0; seat < seatCount(a); seat++) {
        expect(a.crewIds[seat], `#${a.tail} seat ${seat}`).not.toBe('');
      }
    }
  });

  it('generates enough aircrew to leave a rotation margin', () => {
    const s = newCampaign(7);
    const seated = new Set(s.aircraft.flatMap((a) => a.crewIds).filter((id) => id !== ''));
    const crews = s.crew.filter(isAircrew);
    expect(crews.length).toBeGreaterThan(seated.size);
  });

  it('puts a pilot in the commander seat of every airframe', () => {
    const s = newCampaign(11);
    for (const a of s.aircraft) {
      const commander = seatOccupant(s, a, 0);
      expect(commander?.primary, `#${a.tail}`).toBe('pilot');
    }
  });

  it('only lets a pilot command, but lets anyone crew a mission seat', () => {
    const s = newCampaign(12);
    const pilot = pilots(s)[0]!;
    const backseater = s.crew.find((c) => c.primary === 'aircrew')!;
    const technician = s.crew.find((c) => c.primary === 'avionics')!;

    expect(canFillSeat(pilot, 0)).toBe(true);
    expect(canFillSeat(backseater, 0)).toBe(false);
    expect(canFillSeat(backseater, 1)).toBe(true);
    expect(canFillSeat(pilot, 1)).toBe(true);
    expect(canFillSeat(technician, 0)).toBe(false);
    expect(canFillSeat(technician, 1)).toBe(false);
  });

  it('refuses to seat someone the seat is not for', () => {
    const s = newCampaign(13);
    const hawkeye = s.aircraft.find((a) => a.typeId === 'e2d')!;
    const technician = s.crew.find((c) => c.primary === 'avionics')!;
    const backseater = s.crew.find((c) => c.primary === 'aircrew')!;

    expect(assignAircrew(s, hawkeye.id, 0, technician.id)).toBe(false);
    expect(assignAircrew(s, hawkeye.id, 0, backseater.id)).toBe(false);
    expect(assignAircrew(s, hawkeye.id, 9, backseater.id)).toBe(false);
  });

  it('never leaves one person in two cockpits', () => {
    const s = newCampaign(14);
    const [first, second] = s.aircraft.filter((a) => aircraftType(a.typeId).crewRequired >= 1);
    const pilot = seatOccupant(s, first!, 0)!;

    expect(assignAircrew(s, second!.id, 0, pilot.id)).toBe(true);
    expect(assignedAircraft(s, pilot.id)?.id).toBe(second!.id);
    expect(first!.crewIds[0]).toBe('');
    expect(s.aircraft.filter((a) => a.crewIds.includes(pilot.id))).toHaveLength(1);
  });

  it('clears a seat and empties the airframe of its commander', () => {
    const s = newCampaign(15);
    const a = s.aircraft[0]!;
    expect(clearSeat(s, a.id, 0)).toBe(true);
    expect(isCrewed(s, a)).toBe(false);
    expect(crewFactor(s, a)).toBe(0);
  });
});

describe('crew quality drives what a sortie is worth', () => {
  it('scores a rested expert crew above a wrecked one', () => {
    const s = newCampaign(21);
    const a = s.aircraft.find((x) => aircraftType(x.typeId).crewRequired === 1)!;
    const pilot = seatOccupant(s, a, 0)!;

    pilot.skills.pilot = 95;
    pilot.attrs.technical = 90;
    pilot.fatigue = 5;
    pilot.morale = 90;
    const good = crewQuality(s, a);

    pilot.skills.pilot = 25;
    pilot.attrs.technical = 30;
    pilot.fatigue = 95;
    pilot.morale = 20;
    const bad = crewQuality(s, a);

    expect(good).toBeGreaterThan(bad * 2);
    expect(crewFactor(s, a)).toBeGreaterThan(0);
  });

  it('counts an empty mission seat as lost contribution', () => {
    const s = newCampaign(22);
    const hawkeye = s.aircraft.find((a) => a.typeId === 'e2d')!;
    const full = crewQuality(s, hawkeye);

    for (let seat = 1; seat < seatCount(hawkeye); seat++) clearSeat(s, hawkeye.id, seat);
    const pilotOnly = crewQuality(s, hawkeye);

    expect(pilotOnly).toBeLessThan(full);
    expect(pilotOnly).toBeGreaterThan(0);
  });

  it('treats an unfit crew member as an empty seat', () => {
    const s = newCampaign(23);
    const a = s.aircraft.find((x) => aircraftType(x.typeId).crewRequired === 1)!;
    const pilot = seatOccupant(s, a, 0)!;
    expect(isCrewed(s, a)).toBe(true);

    pilot.status = 'resting';
    expect(isCrewed(s, a)).toBe(false);
    expect(crewQuality(s, a)).toBe(0);
  });

  it('feeds the tasking order: a better crew covers more of the objective', () => {
    const weak = newCampaign(24);
    const strong = newCampaign(24);
    for (const s of [weak, strong]) deploy(s);

    for (const c of weak.crew.filter(isAircrew)) {
      c.skills[c.primary] = 20;
      c.attrs.technical = 25;
      c.fatigue = 85;
      c.morale = 30;
    }
    for (const c of strong.crew.filter(isAircrew)) {
      c.skills[c.primary] = 92;
      c.attrs.technical = 88;
      c.fatigue = 8;
      c.morale = 88;
    }

    const weakCover = computeTasking(weak).contribution;
    const strongCover = computeTasking(strong).contribution;
    expect(strongCover).toBeGreaterThan(weakCover);
  });

  it('grounds an airframe nobody is left to fly', () => {
    const s = newCampaign(25);
    deploy(s);
    const before = computeTasking(s);
    expect(before.flyable).toBeGreaterThan(0);
    expect(before.uncrewed).toBe(0);

    for (const a of s.aircraft) unassignAircrew(s, a.crewIds[0] ?? '');
    for (const a of s.aircraft) clearSeat(s, a.id, 0);

    const after = computeTasking(s);
    expect(after.flyable).toBe(0);
    expect(after.contribution).toBe(0);
    expect(after.uncrewed).toBeGreaterThan(0);
    expect(after.warnings.length).toBeGreaterThan(0);
  });
});

describe('flying wears aircrew out', () => {
  it('charges the crew that flew, and not the crew that did not', () => {
    const s = newCampaign(31);
    deploy(s);
    // One airframe flies; everything else is secured.
    for (const a of s.aircraft) setDuty(s, a.id, 'standdown');
    const flyer = s.aircraft.find(
      (a) => a.typeId === 'fa18e' && isMissionCapable(a) && isCrewed(s, a),
    )!;
    expect(setDuty(s, flyer.id, 'cap')).toBe(true);

    const pilot = seatOccupant(s, flyer, 0)!;
    const grounded = pilots(s).find((c) => c.id !== pilot.id && c.status === 'working')!;
    pilot.fatigue = 20;
    grounded.fatigue = 20;
    const sortiesBefore = pilot.sortiesFlown;

    answerAll(s);
    endDay(s);

    expect(pilot.sortiesFlown).toBe(sortiesBefore + 1);
    expect(pilot.consecutiveFlyingDays).toBe(1);
    expect(grounded.consecutiveFlyingDays).toBe(0);
    expect(pilot.fatigue).toBeGreaterThan(grounded.fatigue);
  });

  it('compounds: a week of repeated tasking exhausts the wing', () => {
    const surged = newCampaign(32);
    const rested = newCampaign(32);
    for (const s of [surged, rested]) {
      deploy(s, 'm-crisis');
      for (const c of s.crew) c.fatigue = 15;
      // Measure the raw mechanic: no watch bill standing anyone down.
      for (const d of DEPT_IDS) setWatchPolicy(s, d, 'surge');
    }
    // The rested ship keeps its wing on deck instead of flying it.
    for (const a of rested.aircraft) setDuty(rested, a.id, 'alert');

    for (let day = 0; day < 7; day++) {
      for (const s of [surged, rested]) {
        s.status = 'onstation';
        answerAll(s);
        endDay(s);
      }
      // Re-task the surged wing every day; leave the other one alone.
      autoAssign(surged);
    }

    const fatigue = (s: GameState) => {
      const crews = s.crew.filter(isAircrew);
      return crews.reduce((t, c) => t + c.fatigue, 0) / crews.length;
    };
    expect(fatigue(surged)).toBeGreaterThan(fatigue(rested));

    const streak = Math.max(...surged.crew.filter(isAircrew).map((c) => c.consecutiveFlyingDays));
    expect(streak).toBeGreaterThan(2);
  });

  it('resets the streak the moment a crew stands down', () => {
    const s = newCampaign(33);
    deploy(s);
    const flyer = s.aircraft.find(
      (a) => a.typeId === 'fa18e' && isMissionCapable(a) && isCrewed(s, a),
    )!;
    const pilot = seatOccupant(s, flyer, 0)!;

    for (const a of s.aircraft) setDuty(s, a.id, 'standdown');
    setDuty(s, flyer.id, 'cap');
    answerAll(s);
    endDay(s);
    expect(pilot.consecutiveFlyingDays).toBe(1);

    s.status = 'onstation';
    setDuty(s, flyer.id, 'standdown');
    answerAll(s);
    endDay(s);
    expect(pilot.consecutiveFlyingDays).toBe(0);
  });
});

describe('posting aircrew automatically', () => {
  it('fills every seat it can and never double-books', () => {
    const s = newCampaign(41);
    for (const a of s.aircraft) {
      for (let seat = 0; seat < seatCount(a); seat++) clearSeat(s, a.id, seat);
    }
    autoCrew(s);

    const seated = s.aircraft.flatMap((a) => a.crewIds).filter((id) => id !== '');
    expect(new Set(seated).size).toBe(seated.length);
    for (const a of s.aircraft) expect(isCrewed(s, a)).toBe(true);
  });

  it('leaves unfit people on the ground', () => {
    const s = newCampaign(42);
    for (const c of s.crew.filter(isAircrew).slice(0, 5)) {
      c.health = 'sick';
      c.status = 'sick';
      c.awayDays = 4;
    }
    autoCrew(s);
    for (const a of s.aircraft) {
      for (const id of a.crewIds) {
        if (!id) continue;
        const c = s.crew.find((x) => x.id === id)!;
        expect(c.health).toBe('healthy');
      }
    }
  });

  it('leaves a hand-picked crew alone when the tasking order runs', () => {
    const s = newCampaign(45);
    deploy(s);
    const target = s.aircraft.find((a) => seatCount(a) > 1)!;
    // Deliberately post a weak commander, the way a player might.
    const weakest = s.crew
      .filter((c) => c.primary === 'pilot')
      .sort((p, q) => p.attrs.technical - q.attrs.technical)[0]!;
    expect(assignAircrew(s, target.id, 0, weakest.id)).toBe(true);

    autoAssign(s);
    expect(target.crewIds[0]).toBe(weakest.id);

    // Asking for it explicitly is what re-seats the wing: the weakest pilot
    // loses the seat to someone better.
    autoCrew(s);
    expect(target.crewIds[0]).not.toBe(weakest.id);
  });

  it('fills the gaps the tasking order finds, without touching the rest', () => {
    const s = newCampaign(46);
    const target = s.aircraft.find((a) => seatCount(a) > 1)!;
    const other = s.aircraft.find((a) => a.id !== target.id)!;
    const otherCrew = other.crewIds.slice();
    for (let seat = 0; seat < seatCount(target); seat++) clearSeat(s, target.id, seat);

    fillVacantSeats(s);
    expect(isCrewed(s, target)).toBe(true);
    expect(other.crewIds).toEqual(otherCrew);
  });

  it('fills one airframe without disturbing the rest', () => {
    const s = newCampaign(43);
    const target = s.aircraft.find((a) => seatCount(a) > 1)!;
    const other = s.aircraft.find((a) => a.id !== target.id)!;
    const otherCrew = other.crewIds.slice();

    for (let seat = 0; seat < seatCount(target); seat++) clearSeat(s, target.id, seat);
    autoCrewAircraft(s, target.id);

    expect(isCrewed(s, target)).toBe(true);
    expect(other.crewIds).toEqual(otherCrew);
  });

  it('survives a save round trip with its seats intact', async () => {
    const { serialize, deserialize } = await import('../src/core/save');
    const s = newCampaign(44);
    const seats = s.aircraft.map((a) => a.crewIds.join(','));
    const loaded = deserialize(serialize(s))!;
    expect(loaded).not.toBeNull();
    expect(loaded.aircraft.map((a) => a.crewIds.join(','))).toEqual(seats);
  });
});
