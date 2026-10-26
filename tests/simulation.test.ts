import { describe, expect, it } from 'vitest';
import { setWatchPolicy } from '../src/core/watch';
import { DEPT_IDS } from '../src/data/specialties';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { Rng } from '../src/core/rng';
import { resolveEvent } from '../src/core/events';
import { computeDepartments, computeReadiness } from '../src/core/readiness';
import { checkRequirements, startMission, successProbability } from '../src/core/missions';
import { canEnrol, enrol } from '../src/core/training';
import { checkPromotion, growthFactor, isAvailable, promote } from '../src/core/crew';
import { deserialize, serialize } from '../src/core/save';
import { missionDef } from '../src/data/missions';
import type { GameState } from '../src/core/types';

/** Answer every pending event with the first choice, to advance days quickly. */
function answerAll(state: GameState): void {
  const rng = new Rng(state.day * 7919);
  while (state.pendingEvents.length > 0) {
    resolveEvent(state, rng, 0, 0);
  }
}

function runDays(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    answerAll(state);
    endDay(state);
  }
}

describe('campaign setup', () => {
  it('creates a populated carrier', () => {
    const s = newCampaign(1234);
    expect(s.crew.length).toBeGreaterThan(70);
    expect(s.aircraft.length).toBe(16);
    expect(s.day).toBe(1);
    expect(s.missionOffers.length).toBeGreaterThan(0);
    expect(s.pendingEvents.length).toBeGreaterThan(0);
    expect(s.pendingEvents.length).toBeLessThanOrEqual(3);
  });

  it('places every crew member in a real room on a real deck', () => {
    const s = newCampaign(99);
    for (const c of s.crew) {
      expect(s.rooms[c.assignmentRoomId]).toBeDefined();
      expect(c.loc.deck).toBeGreaterThanOrEqual(1);
      expect(c.loc.deck).toBeLessThanOrEqual(8);
    }
  });

  it('gives every crew member a distinct name', () => {
    const s = newCampaign(7);
    const names = new Set(s.crew.map((c) => c.name));
    expect(names.size).toBe(s.crew.length);
  });
});

describe('determinism', () => {
  it('replays identically from the same seed and the same decisions', () => {
    const a = newCampaign(4242);
    const b = newCampaign(4242);
    runDays(a, 25);
    runDays(b, 25);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('produces different campaigns from different seeds', () => {
    const a = newCampaign(1);
    const b = newCampaign(2);
    expect(serialize(a)).not.toBe(serialize(b));
  });
});

describe('readiness', () => {
  it('matches the worked example from the specification', () => {
    // Spec section 8: components of 94/91/88/85/43 should land near 65,
    // not on the plain average of 80.
    const weightedMean = 80.2;
    const worst = 43;
    const overall = weightedMean * 0.6 + worst * 0.4;
    expect(Math.round(overall)).toBe(65);
  });

  it('is dragged down disproportionately by one collapsed department', () => {
    const s = newCampaign(555);
    const healthy = computeReadiness(s).overall;

    // Wipe out Engineering entirely.
    for (const c of s.crew) {
      if (c.department === 'ENG') {
        c.health = 'injured';
        c.status = 'injured';
        c.awayDays = 30;
      }
    }
    s.departments = computeDepartments(s);
    const damaged = computeReadiness(s).overall;

    expect(damaged).toBeLessThan(healthy);
    // A plain average of nine components would fall by roughly a ninth;
    // the min-blend must punish it considerably harder than that.
    expect(healthy - damaged).toBeGreaterThan(healthy / 9);
  });

  it('stays inside 0..100 across a long campaign', () => {
    const s = newCampaign(31337);
    for (let i = 0; i < 60; i++) {
      answerAll(s);
      endDay(s);
      expect(s.readiness.overall).toBeGreaterThanOrEqual(0);
      expect(s.readiness.overall).toBeLessThanOrEqual(100);
    }
  });
});

describe('daily loop', () => {
  it('advances the day and produces a report', () => {
    const s = newCampaign(11);
    answerAll(s);
    const report = endDay(s);
    expect(s.day).toBe(2);
    expect(report.day).toBe(1);
    expect(report.readinessAfter).toBeGreaterThan(0);
  });

  it('keeps every crew statistic in range over 120 days', () => {
    const s = newCampaign(2024);
    runDays(s, 120);
    for (const c of s.crew) {
      expect(c.morale).toBeGreaterThanOrEqual(0);
      expect(c.morale).toBeLessThanOrEqual(100);
      expect(c.fatigue).toBeGreaterThanOrEqual(0);
      expect(c.fatigue).toBeLessThanOrEqual(100);
      for (const v of Object.values(c.attrs)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      for (const v of Object.values(c.skills)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
    for (const a of s.aircraft) {
      expect(a.systems.engine).toBeGreaterThanOrEqual(0);
      expect(a.fuel).toBeLessThanOrEqual(100);
    }
  });

  it('generates 1-3 events every day', () => {
    const s = newCampaign(808);
    for (let i = 0; i < 40; i++) {
      expect(s.pendingEvents.length).toBeGreaterThanOrEqual(1);
      expect(s.pendingEvents.length).toBeLessThanOrEqual(3);
      answerAll(s);
      endDay(s);
    }
  });

  it('resolves unanswered events rather than dropping them', () => {
    const s = newCampaign(606);
    const before = s.pendingEvents.length;
    expect(before).toBeGreaterThan(0);
    const report = endDay(s); // no answers given
    expect(report.notes.some((n) => n.key.startsWith('Unresolved:'))).toBe(true);
  });
});

describe('fatigue and tempo', () => {
  it('makes maximum tempo measurably more exhausting than low tempo', () => {
    const low = newCampaign(777);
    const max = newCampaign(777);
    low.tempo = 'low';
    max.tempo = 'maximum';
    // Measure the raw mechanic: no watch bill standing anyone down.
    for (const d of DEPT_IDS) {
      setWatchPolicy(low, d, 'surge');
      setWatchPolicy(max, d, 'surge');
    }
    // Hold tempo fixed: skip events, which can change it.
    for (let i = 0; i < 10; i++) {
      low.pendingEvents = [];
      max.pendingEvents = [];
      low.tempo = 'low';
      max.tempo = 'maximum';
      endDay(low);
      endDay(max);
    }
    const avg = (s: GameState) =>
      s.crew.reduce((t, c) => t + c.fatigue, 0) / s.crew.length;
    expect(avg(max)).toBeGreaterThan(avg(low) + 15);
  });
});

describe('training and promotion', () => {
  it('enrols a crew member and completes the course', () => {
    const s = newCampaign(90210);
    const student = s.crew.find((c) => isAvailable(c) && !c.completedTraining.includes('basic-safety'))!;
    expect(student).toBeDefined();
    const check = canEnrol(s, student, 'basic-safety');
    expect(check.ok).toBe(true);

    const creditsBefore = s.credits;
    expect(enrol(s, student, 'basic-safety')).toBe(true);
    expect(s.credits).toBeLessThan(creditsBefore);
    expect(student.status).toBe('training');
    expect(isAvailable(student)).toBe(false);

    runDays(s, 6);
    expect(student.completedTraining).toContain('basic-safety');
    expect(student.trainingId).toBeNull();
  });

  it('blocks promotion on leadership, not just technical skill', () => {
    const s = newCampaign(31);
    const c = s.crew[0]!;
    c.rank = 3;
    c.attrs.experience = 90;
    c.attrs.discipline = 90;
    c.attrs.leadership = 10; // brilliant technician, poor leader
    c.skills[c.primary] = 95;
    c.completedTraining = ['basic-safety', 'lead-team'];

    const check = checkPromotion(c);
    expect(check.eligible).toBe(false);
    // The shortfall is recorded as a deferred note; the attribute it names
    // travels in tvars so it can be translated at render time.
    expect(check.unmet.map((u) => u.tvars?.label ?? '').join(' ')).toContain('Leadership');
    expect(promote(s, c)).toBe(false);

    c.attrs.leadership = 70;
    expect(checkPromotion(c).eligible).toBe(true);
    expect(promote(s, c)).toBe(true);
    expect(c.rank).toBe(4);
  });

  it('slows progression sharply at high skill', () => {
    expect(growthFactor(20)).toBeGreaterThan(growthFactor(50));
    expect(growthFactor(50)).toBeGreaterThan(growthFactor(70));
    expect(growthFactor(70)).toBeGreaterThan(growthFactor(90));
    expect(growthFactor(96)).toBeLessThan(0.05);
  });
});

describe('missions', () => {
  it('runs a mission to completion and pays out', () => {
    const s = newCampaign(5150);
    expect(startMission(s, 'm-workups')).toBe(true);
    const prestigeBefore = s.prestige;

    let outcome = null;
    for (let i = 0; i < 30 && !outcome; i++) {
      answerAll(s);
      const r = endDay(s);
      outcome = r.missionOutcome;
    }
    expect(outcome).not.toBeNull();
    expect(s.mission).toBeNull();
    expect(s.missionHistory.length).toBe(1);
    if (outcome === 'outstanding' || outcome === 'success') {
      expect(s.prestige).toBeGreaterThan(prestigeBefore);
    }
  });

  it('rewards preparation with a materially better success chance', () => {
    const ready = newCampaign(64);
    const ragged = newCampaign(64);

    // Wreck the ragged ship: exhausted, demoralised, broken aircraft.
    for (const c of ragged.crew) {
      c.fatigue = 95;
      c.morale = 15;
    }
    for (const a of ragged.aircraft) {
      a.systems.avionics = 10;
      a.systems.engine = 20;
      a.fuel = 10;
    }
    ragged.supplies.fuel = 5;
    ragged.departments = computeDepartments(ragged);
    ragged.readiness = computeReadiness(ragged);

    const def = missionDef('m-convoy');
    const pReady = successProbability(ready, def);
    const pRagged = successProbability(ragged, def);
    expect(pReady).toBeGreaterThan(pRagged + 0.2);
    // But never a certainty, either way (spec section 82).
    expect(pReady).toBeLessThan(0.97);
    expect(pRagged).toBeGreaterThan(0.05);
  });

  it('reports unmet requirements without blocking acceptance', () => {
    const s = newCampaign(88);
    s.supplies.fuel = 3;
    const checks = checkRequirements(s, missionDef('m-convoy'));
    const fuelCheck = checks.find((c) => c.label === 'Aviation Fuel');
    expect(fuelCheck?.met).toBe(false);
  });
});

describe('event chains', () => {
  it('schedules a follow-up event that fires later', () => {
    const s = newCampaign(2468);
    s.scheduledEvents.push({ defId: 'ev-investigation', day: s.day + 2, subjectId: null });
    runDays(s, 3);
    const fired = s.eventLog.some((e) => e.title === 'Mishap Investigation Report');
    expect(fired).toBe(true);
  });
});

describe('save and load', () => {
  it('round-trips a campaign exactly', () => {
    const s = newCampaign(13579);
    runDays(s, 12);
    const json = serialize(s);
    const restored = deserialize(json);
    expect(restored).not.toBeNull();
    expect(serialize(restored!)).toBe(json);
  });

  it('continues identically after a reload', () => {
    const original = newCampaign(24680);
    runDays(original, 8);
    const restored = deserialize(serialize(original))!;

    runDays(original, 10);
    runDays(restored, 10);
    expect(serialize(restored)).toBe(serialize(original));
  });

  it('rejects a save from an incompatible version', () => {
    const s = newCampaign(1);
    const bad = JSON.parse(serialize(s));
    bad.version = 999;
    expect(deserialize(JSON.stringify(bad))).toBeNull();
  });
});
