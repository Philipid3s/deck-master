import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import {
  DEPLOYMENT_DAYS,
  deploymentObjectives,
  deploymentStars,
  isDeployment,
} from '../src/core/deployment';
import type { GameState, MissionOutcome } from '../src/core/types';

function record(state: GameState, outcome: MissionOutcome): void {
  state.missionHistory.push({
    defId: 'm-workups',
    title: 'Work-ups',
    startedDay: 1,
    endedDay: 2,
    outcome,
    prestige: 0,
    credits: 0,
  });
}

/** Keep the ship solvent and ready so only the deployment clock can end it. */
function keepAfloat(state: GameState): void {
  state.credits = 10_000_000;
}

describe('30-day deployment', () => {
  it('is the mode a deployment campaign starts in, and careers are not', () => {
    expect(isDeployment(newCampaign(1, 'deployment'))).toBe(true);
    expect(isDeployment(newCampaign(1))).toBe(false);
  });

  it('ends after the last day, not before', () => {
    const s = newCampaign(7, 'deployment');
    // Hold the ship clear of the sustained-failure conditions so only the
    // deployment clock can end it.
    while (s.day < DEPLOYMENT_DAYS) {
      s.pendingEvents = [];
      keepAfloat(s);
      s.flags['criticalDays'] = 0;
      endDay(s);
      expect(s.campaignEnd).toBeNull();
    }
    s.pendingEvents = [];
    endDay(s);
    expect(s.campaignEnd?.day).toBe(DEPLOYMENT_DAYS);
  });

  it('is won on two successful operations and lost on fewer', () => {
    const win = newCampaign(3, 'deployment');
    record(win, 'success');
    record(win, 'outstanding');
    win.day = DEPLOYMENT_DAYS;
    keepAfloat(win);
    win.pendingEvents = [];
    endDay(win);
    expect(win.campaignEnd?.won).toBe(true);

    const lose = newCampaign(3, 'deployment');
    record(lose, 'success');
    record(lose, 'partial');
    lose.day = DEPLOYMENT_DAYS;
    keepAfloat(lose);
    lose.pendingEvents = [];
    endDay(lose);
    expect(lose.campaignEnd?.won).toBe(false);
    expect(lose.campaignEnd?.stars).toBe(0);
  });

  it('grades with one star per secondary objective met', () => {
    const s = newCampaign(5, 'deployment');
    s.prestige = 400;
    for (const c of s.crew) c.morale = 95;
    s.readiness.overall = 30;
    expect(deploymentStars(s)).toBe(2);
    const ops = deploymentObjectives(s).find((o) => o.primary)!;
    expect(ops.current).toBe(0);
    expect(ops.met).toBe(false);
  });

  it('never ends a career on the deployment clock', () => {
    const s = newCampaign(9);
    keepAfloat(s);
    record(s, 'success');
    record(s, 'success');
    s.day = DEPLOYMENT_DAYS;
    s.pendingEvents = [];
    endDay(s);
    expect(s.campaignEnd).toBeNull();
  });
});
