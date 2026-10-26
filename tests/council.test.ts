import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import {
  SEATS,
  adviceFor,
  appointOfficer,
  ensureCouncil,
  recordDecision,
  relieveOfficer,
  runDelegations,
  setDelegated,
} from '../src/core/council';
import { seatFactor } from '../src/core/councilEffects';
import { watchPolicy } from '../src/core/watch';
import { sortieCapacity } from '../src/core/tasking';
import { eventDef } from '../src/data/events';
import { DEPT_IDS } from '../src/data/specialties';
import type { GameState } from '../src/core/types';

function withEvent(s: GameState, defId: string): number {
  const def = eventDef(defId)!;
  s.pendingEvents = [
    {
      defId,
      subjectId: s.crew[0]!.id,
      subjectName: s.crew[0]!.name,
      title: def.title,
      body: { key: def.body },
      category: def.category,
    },
  ];
  return 0;
}

describe('the council', () => {
  it('seats all ten officers when a campaign starts, deterministically', () => {
    const a = newCampaign(1);
    const b = newCampaign(1);
    expect(Object.keys(a.council!.seats).sort()).toEqual(SEATS.map((s) => s.id).sort());
    expect(a.council!.seats.xo!.name).toBe(b.council!.seats.xo!.name);
    expect(a.council!.candidates.length).toBeGreaterThan(0);
  });

  it('gives an old save a council the first time it is touched', () => {
    const s = newCampaign(2);
    delete s.council;
    expect(seatFactor(s, 'airboss')).toBe(0);
    ensureCouncil(s);
    expect(s.council!.seats.airboss).toBeDefined();
  });

  it('turns competence into a standing effect, and a vacant seat into a penalty', () => {
    const s = newCampaign(3);
    s.council!.seats.airboss!.competence = 95;
    const good = sortieCapacity(s);
    s.council!.seats.airboss!.competence = 50;
    const average = sortieCapacity(s);
    relieveOfficer(s, 'airboss');
    const vacant = sortieCapacity(s);
    expect(good).toBeGreaterThanOrEqual(average);
    expect(vacant).toBeLessThanOrEqual(average);
    expect(seatFactor(s, 'airboss')).toBeLessThan(0);
  });

  it('advises on decisions in its domain with a valid choice and a reason', () => {
    const s = newCampaign(4);
    const i = withEvent(s, 'ev-leave-request');
    const advice = adviceFor(s, i);
    expect(advice.length).toBeGreaterThan(0);
    const def = eventDef('ev-leave-request')!;
    for (const a of advice) {
      expect(a.choiceIndex).toBeGreaterThanOrEqual(0);
      expect(a.choiceIndex).toBeLessThan(def.choices.length);
      expect(a.reason.length).toBeGreaterThan(0);
    }
    // Same day, same card: the same advice.
    expect(adviceFor(s, i)).toEqual(advice);
  });

  it('thinks better of a captain who takes its advice than of one who does not', () => {
    const taken = newCampaign(5);
    const ignored = newCampaign(5);
    const i = withEvent(taken, 'ev-leave-request');
    withEvent(ignored, 'ev-leave-request');
    const advice = adviceFor(taken, i)[0]!;
    const before = taken.council!.seats[advice.seat]!.opinion;
    recordDecision(taken, i, advice.choiceIndex);
    const other = (advice.choiceIndex + 1) % eventDef('ev-leave-request')!.choices.length;
    recordDecision(ignored, i, other);
    expect(taken.council!.seats[advice.seat]!.opinion).toBeGreaterThan(before);
    expect(ignored.council!.seats[advice.seat]!.opinion).toBeLessThan(before);
  });

  it('answers the decisions of a delegated domain on its own', () => {
    const s = newCampaign(6);
    withEvent(s, 'ev-leave-request');
    for (const seat of ['xo', 'cmc'] as const) setDelegated(s, seat, true);
    const notes = runDelegations(s);
    expect(s.pendingEvents.length).toBe(0);
    expect(notes.some((n) => n.key.includes('handled'))).toBe(true);
  });

  it('runs the watch bill when the XO is left in charge', () => {
    const s = newCampaign(7);
    s.council!.seats.xo!.temperament = 10; // cautious: rotates early
    s.council!.seats.xo!.competence = 100; // and rarely misjudges
    for (const c of s.crew) c.fatigue = 70;
    setDelegated(s, 'xo', true);
    runDelegations(s);
    expect(DEPT_IDS.some((d) => watchPolicy(s, d) === 'rotation')).toBe(true);
  });

  it('takes an operation when Operations is left in charge and the ship is ready', () => {
    const s = newCampaign(8);
    s.council!.seats.ops!.temperament = 90;
    s.council!.seats.ops!.competence = 100;
    s.readiness.overall = 90;
    setDelegated(s, 'ops', true);
    runDelegations(s);
    expect(s.mission).not.toBeNull();
  });

  it('misjudges more often the less competent the officer', () => {
    let poor = 0;
    let gifted = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const [competence, bump] of [[25, () => poor++], [95, () => gifted++]] as const) {
        const s = newCampaign(seed);
        s.council!.seats.airboss!.competence = competence;
        s.status = 'onstation';
        s.tempo = 'maximum';
        setDelegated(s, 'airboss', true);
        runDelegations(s);
        if (s.tempo === 'maximum') bump();
      }
    }
    expect(poor).toBeGreaterThan(gifted);
  });

  it('only changes officers alongside', () => {
    const s = newCampaign(9);
    const candidate = s.council!.candidates[0]!;
    s.status = 'outbound';
    expect(appointOfficer(s, candidate.id)).toBe(false);
    s.status = 'port';
    expect(appointOfficer(s, candidate.id)).toBe(true);
    expect(s.council!.seats[candidate.seat]!.id).toBe(candidate.id);
  });

  it('keeps the campaign replayable from its seed with delegation on', () => {
    const a = newCampaign(10);
    const b = newCampaign(10);
    for (const s of [a, b]) for (const seat of SEATS) setDelegated(s, seat.id, true);
    for (let d = 0; d < 10; d++) {
      for (const s of [a, b]) endDay(s);
    }
    expect(a.credits).toBe(b.credits);
    expect(a.council!.seats.xo!.opinion).toBe(b.council!.seats.xo!.opinion);
    expect(a.mission?.defId).toBe(b.mission?.defId);
  });
});
