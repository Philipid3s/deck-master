import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { advanceMission, effectiveMinPrestige, refreshMissionOffers, startMission } from '../src/core/missions';
import { autoAssign } from '../src/core/tasking';
import { airDefence, bonusProgress, defenceNeeded, runMechanic } from '../src/core/operations';
import { buildContext } from '../src/core/events';
import { Rng } from '../src/core/rng';
import { MISSIONS, missionDef } from '../src/data/missions';
import type { GameState } from '../src/core/types';

function onStation(seed: number, id: string): GameState {
  const s = newCampaign(seed);
  s.prestige = 2000;
  expect(startMission(s, id)).toBe(true);
  s.status = 'onstation';
  autoAssign(s);
  return s;
}

const day = (s: GameState, n = 0) => Rng.stream(s.seed, s.day + n, 'test');

describe('mission mechanics', () => {
  it('gives every operation but the work-ups a mechanic of its own', () => {
    for (const m of MISSIONS) {
      if (m.id === 'm-workups') continue;
      expect(m.mechanic).toBeDefined();
    }
  });

  it('contacts: recon finds and identifies, and identifying advances the operation', () => {
    const s = onStation(1, 'm-patrol');
    for (let i = 0; i < 4; i++) runMechanic(s, missionDef('m-patrol'), day(s, i));
    const m = s.mission!.mech!;
    expect(m.found!).toBeGreaterThan(0);
    expect(m.identified!).toBeLessThanOrEqual(m.found!);
    expect(m.identified!).toBeGreaterThan(0);
  });

  it('contacts: without recon they pile up as risk', () => {
    const s = onStation(2, 'm-patrol');
    for (const a of s.aircraft) if (a.duty === 'recon') a.duty = 'standdown';
    s.mission!.mech = { found: 6, identified: 0 };
    const before = s.mission!.riskModifier;
    runMechanic(s, missionDef('m-patrol'), day(s));
    expect(s.mission!.riskModifier).toBeGreaterThan(before);
  });

  it('threat: a raid met short lets raiders through and costs progress', () => {
    const s = onStation(3, 'm-convoy');
    for (const a of s.aircraft) a.duty = 'standdown';
    s.mission!.mech = { threatTomorrow: 3, threat: 0, leakers: 0 };
    expect(airDefence(s)).toBeLessThan(defenceNeeded(3));
    const r = runMechanic(s, missionDef('m-convoy'), day(s));
    expect(s.mission!.mech!.leakers!).toBeGreaterThan(0);
    expect(r.multiplier).toBeLessThan(1);
  });

  it('threat: a raid met in full lets nothing through', () => {
    const s = onStation(4, 'm-convoy');
    s.mission!.mech = { threatTomorrow: 1, threat: 0, leakers: 0 };
    expect(airDefence(s)).toBeGreaterThanOrEqual(defenceNeeded(1));
    runMechanic(s, missionDef('m-convoy'), day(s));
    expect(s.mission!.mech!.leakers).toBe(0);
  });

  it('casualties: lift brings people aboard and stores pay for them', () => {
    const s = onStation(5, 'm-relief');
    const food = s.supplies.food;
    runMechanic(s, missionDef('m-relief'), day(s));
    expect(s.mission!.mech!.evacuees!).toBeGreaterThan(0);
    expect(s.supplies.food).toBeLessThan(food);
  });

  it('window: targeting first, then a window where strike counts for more', () => {
    const s = onStation(6, 'm-strike');
    const def = missionDef('m-strike');
    expect(runMechanic(s, def, day(s)).multiplier).toBeLessThan(1);
    s.mission!.mech!.intel = 99.9;
    s.mission!.mech!.windowDays = 0;
    runMechanic(s, def, day(s, 1));
    // Intel crossed 100 the day before or now: the window is open.
    s.mission!.mech!.windowDays = 2;
    expect(runMechanic(s, def, day(s, 2)).multiplier).toBeGreaterThan(1);
  });

  it('escalation: presence brings tension down, absence lets it climb', () => {
    const quiet = onStation(7, 'm-crisis');
    const busy = onStation(7, 'm-crisis');
    for (const a of quiet.aircraft) a.duty = 'standdown';
    for (let i = 0; i < 4; i++) {
      runMechanic(quiet, missionDef('m-crisis'), day(quiet, i));
      runMechanic(busy, missionDef('m-crisis'), day(busy, i));
    }
    expect(quiet.mission!.mech!.tension!).toBeGreaterThan(busy.mission!.mech!.tension!);
  });

  it('feeds the mechanic into the day’s progress', () => {
    const s = onStation(8, 'm-strike');
    const r = advanceMission(s, day(s));
    expect(r.delta).toBeGreaterThanOrEqual(0);
    expect(s.mission!.mech).toBeDefined();
  });

  it('tracks the bonus objective', () => {
    const s = onStation(9, 'm-relief');
    s.mission!.mech = { evacuees: 200, injured: 30 };
    expect(bonusProgress(s.mission!, missionDef('m-relief'))!.met).toBe(true);
  });

  it('exposes the mechanic to event conditions only on station', () => {
    const s = onStation(10, 'm-crisis');
    expect(buildContext(s).mechanic).toBe('escalation');
    s.status = 'outbound';
    expect(buildContext(s).mechanic).toBeNull();
  });
});

describe('the deployment board', () => {
  it('offers work beyond the ship’s standing on a deployment', () => {
    const career = newCampaign(11);
    const deployment = newCampaign(11, 'deployment');
    const convoy = missionDef('m-convoy');
    expect(effectiveMinPrestige(deployment, convoy)).toBeLessThan(effectiveMinPrestige(career, convoy));
    // Over many boards, a deployment sees more than the three entry operations.
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      refreshMissionOffers(deployment, Rng.stream(11, i, 'board'));
      for (const id of deployment.missionOffers) seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});
