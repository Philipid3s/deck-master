/**
 * Scripted players for the 30-day deployment.
 *
 * Shared by `npm run balance:deployment`, which prints what each achieves,
 * and by the balance test, which holds them in order: a player who manages
 * the watch bill must beat one who sets it once, who must beat one who
 * touches nothing.
 */
import type { GameState, WatchPolicy } from '../src/core/types';
import { newCampaign } from '../src/core/newGame';
import { startMission, successProbability } from '../src/core/missions';
import { autoAssign, trainOnPassage } from '../src/core/tasking';
import { endDay } from '../src/core/simulation';
import { resolveEvent } from '../src/core/events';
import { missionDef } from '../src/data/missions';
import { Rng } from '../src/core/rng';
import { setWatchPolicy, watchSummary } from '../src/core/watch';
import { DEPT_IDS } from '../src/data/specialties';
import { SEATS, setDelegated } from '../src/core/council';

export type Bot =
  /** Touches nothing: the standard watch bill, auto-tasking, sails at once. */
  | 'passive'
  /** Nobody ever rests unless told to. */
  | 'surge'
  /** One decision: three watches everywhere, on day one, and nothing else. */
  | 'rotation'
  /**
   * Manages the watch bill department by department as fatigue moves, and
   * flies work-ups on the passage out.
   */
  | 'careful'
  /** Hands every domain to the council and does nothing itself. */
  | 'delegate';

export const BOTS: Bot[] = ['passive', 'surge', 'rotation', 'careful', 'delegate'];

export interface BotResult {
  seed: number;
  won: boolean;
  stars: number;
  state: GameState;
}

function setAll(s: GameState, policy: WatchPolicy): void {
  for (const d of DEPT_IDS) setWatchPolicy(s, d, policy);
}

/** Plays one deployment to its end with the given player. */
export function playDeployment(seed: number, bot: Bot, choice = 0): BotResult {
  const s = newCampaign(seed, 'deployment');
  if (bot === 'delegate') for (const seat of SEATS) setDelegated(s, seat.id, true);
  if (bot === 'surge') setAll(s, 'surge');
  if (bot === 'rotation') setAll(s, 'rotation');

  while (s.day <= 30 && !s.campaignEnd) {
    if (bot === 'delegate') {
      endDay(s);
      continue;
    }
    if (bot === 'careful') {
      // Reads the watch bill panel each morning: a department running
      // tired goes to three watches, a fresh one back to standard.
      for (const d of DEPT_IDS) {
        const { fatigue } = watchSummary(s, d);
        if (fatigue > 40) setWatchPolicy(s, d, 'rotation');
        else if (fatigue < 25) setWatchPolicy(s, d, 'standard');
      }
    }
    if (s.status === 'port' && !s.mission && s.missionOffers.length > 0) {
      const best = [...s.missionOffers]
        .filter((id) => s.prestige >= missionDef(id).minPrestige)
        .sort((a, b) => successProbability(s, missionDef(b)) - successProbability(s, missionDef(a)))[0];
      if (best) startMission(s, best);
    }
    autoAssign(s);
    if (bot === 'careful' && s.status === 'outbound') trainOnPassage(s);
    while (s.pendingEvents.length > 0) {
      const def = s.pendingEvents[0];
      resolveEvent(s, Rng.stream(s.seed, s.day, 'choice'), 0, choice);
      if (s.pendingEvents[0] === def) s.pendingEvents.shift();
    }
    endDay(s);
  }
  return { seed, won: s.campaignEnd?.won ?? false, stars: s.campaignEnd?.stars ?? 0, state: s };
}

/** Wins and mean stars for one player across seeds. */
export function botRecord(bot: Bot, seeds: number[]): { wins: number; stars: number; results: BotResult[] } {
  const results = seeds.map((seed) => playDeployment(seed, bot));
  return {
    wins: results.filter((r) => r.won).length,
    stars: results.reduce((a, r) => a + r.stars, 0) / results.length,
    results,
  };
}
