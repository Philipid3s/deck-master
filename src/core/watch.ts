import type { CrewMember, DeptId, GameState, LogNote, WatchPolicy } from './types';
import { DEPT_IDS } from '../data/specialties';

/**
 * The watch bill: how each department rotates its people through rest.
 *
 * Resting tired people is the single decision that most decides whether a
 * deployment succeeds, and doing it one person at a time from a crew panel
 * turned the winning strategy into the most tedious one. The watch bill
 * makes it a department-level decision the player takes once and revisits
 * when the situation changes:
 *
 *  - Surge: nobody is stood down automatically. Everyone is available today;
 *    the ship pays for it in fatigue, mistakes and injuries later.
 *  - Standard: the worn-out are stood down, a few at a time.
 *  - Three watches: people rest well before they are exhausted, so fewer
 *    hands are on duty on any day but the ones who are, are sharp.
 *
 * Someone resting works at half rate (`RESTING_OUTPUT`), so three watches
 * costs output today for a fresher crew tomorrow — a setting to move with
 * each department's fatigue, not one to leave on.
 *
 * Applied once at the end of each day, after the day's fatigue has landed,
 * so the player sees tomorrow's rota and can still override anyone by hand.
 * A person the player sends to rest stays resting until rested, whatever
 * the policy; a person the player returns to duty may be stood down again
 * at the next change of watch if they are still over the threshold.
 */

interface PolicyDef {
  /** Fatigue at which someone is stood down. Infinity: never. */
  restAt: number;
  /** Fatigue under which a resting person returns to duty. */
  returnAt: number;
  /** Most of the department that may be resting at once. */
  maxResting: number;
}

export const WATCH_POLICIES: Record<WatchPolicy, PolicyDef> = {
  surge: { restAt: Infinity, returnAt: 18, maxResting: 0 },
  standard: { restAt: 82, returnAt: 30, maxResting: 0.15 },
  rotation: { restAt: 52, returnAt: 24, maxResting: 0.4 },
};

export const WATCH_POLICY_ORDER: WatchPolicy[] = ['surge', 'standard', 'rotation'];

export const WATCH_POLICY_LABELS: Record<WatchPolicy, string> = {
  surge: 'SURGE',
  standard: 'STANDARD',
  rotation: '3 WATCHES',
};

export const DEFAULT_WATCH_POLICY: WatchPolicy = 'standard';

export function watchPolicy(state: GameState, dept: DeptId): WatchPolicy {
  return state.watchPolicy?.[dept] ?? DEFAULT_WATCH_POLICY;
}

/**
 * Sets a department's policy. Moving to a harder-working policy recalls
 * everyone resting who would not have been stood down under it — so
 * switching from three watches to standard on arriving on station brings
 * the watch below back to work today rather than days later. Nobody past
 * the standard threshold is turned out of their rack, even for a surge.
 * Returns how many were recalled.
 */
export function setWatchPolicy(state: GameState, dept: DeptId, policy: WatchPolicy): number {
  const previous = watchPolicy(state, dept);
  state.watchPolicy = { ...(state.watchPolicy ?? {}), [dept]: policy };
  if (WATCH_POLICIES[policy].restAt <= WATCH_POLICIES[previous].restAt) return 0;

  const threshold = Math.min(WATCH_POLICIES[policy].restAt, WATCH_POLICIES.standard.restAt);
  let recalled = 0;
  for (const c of state.crew) {
    if (c.department === dept && c.status === 'resting' && rotatable(c) && c.fatigue < threshold) {
      c.status = 'working';
      recalled++;
    }
  }
  return recalled;
}

/** Whether the watch bill may move this person at all. */
function rotatable(c: CrewMember): boolean {
  return c.health === 'healthy' && c.awayDays <= 0 && (c.status === 'working' || c.status === 'resting');
}

/**
 * Change of watch. Returns how many people were stood down and returned,
 * and a note for the daily report when anything moved.
 */
export function applyWatchBill(state: GameState): { stoodDown: number; returned: number; notes: LogNote[] } {
  let stoodDown = 0;
  let returned = 0;

  for (const dept of DEPT_IDS) {
    const policy = WATCH_POLICIES[watchPolicy(state, dept)];
    const members = state.crew.filter((c) => c.department === dept);
    const pool = members.filter(rotatable);
    if (pool.length === 0) continue;

    // Rested people come back first, so they free up rest slots.
    for (const c of pool) {
      if (c.status === 'resting' && c.fatigue < policy.returnAt) {
        c.status = 'working';
        returned++;
      }
    }

    if (policy.maxResting <= 0) continue;
    const cap = Math.floor(members.length * policy.maxResting);
    let resting = pool.filter((c) => c.status === 'resting').length;
    const candidates = pool
      .filter((c) => c.status === 'working' && c.fatigue >= policy.restAt)
      .sort((a, b) => b.fatigue - a.fatigue);
    for (const c of candidates) {
      if (resting >= cap) break;
      c.status = 'resting';
      resting++;
      stoodDown++;
    }
  }

  const notes: LogNote[] = [];
  if (stoodDown > 0 || returned > 0) {
    notes.push({
      key: 'Change of watch: {down} stood down to rest, {up} back on duty',
      vars: { down: stoodDown, up: returned },
    });
  }
  return { stoodDown, returned, notes };
}

/** Per-department figures for the watch bill panel. */
export function watchSummary(state: GameState, dept: DeptId): {
  members: number;
  onDuty: number;
  resting: number;
  fatigue: number;
} {
  const members = state.crew.filter((c) => c.department === dept);
  const aboard = members.filter((c) => c.awayDays <= 0 && c.health === 'healthy');
  const resting = aboard.filter((c) => c.status === 'resting').length;
  const onDuty = aboard.filter((c) => c.status === 'working' || c.status === 'mentoring').length;
  const fatigue = aboard.length === 0 ? 0 : aboard.reduce((s, c) => s + c.fatigue, 0) / aboard.length;
  return { members: members.length, onDuty, resting, fatigue };
}
