import type { GameState, LogNote } from './types';

/**
 * The 30-day deployment: the short campaign a new player starts with.
 *
 * The open career has no horizon; a deployment has one, and that is what
 * gives the first hour a shape. The ship sails with orders — complete two
 * operations successfully inside thirty days — and is graded on how it
 * comes home.
 *
 * Tuned with `npm run balance:deployment`: a player who auto-tasks and
 * never rests anyone typically lands one success and comes home ragged; a
 * player who rotates tired crews and lets the ship recover alongside lands
 * two and earns some of the stars. The top grade needs more than that.
 */

export const DEPLOYMENT_DAYS = 30;
export const DEPLOYMENT_REQUIRED_OPS = 2;

/** Sustained failure is judged faster on a short horizon than in a career. */
export const DEPLOYMENT_BANKRUPT_DAYS = 5;
export const DEPLOYMENT_CRITICAL_DAYS = 7;

export interface Objective {
  id: string;
  /** English source string; the UI translates it. */
  label: string;
  /** Formatted current value and target, for the readout. */
  current: number;
  target: number;
  unit: '' | '%';
  met: boolean;
  /** The order itself. The others are stars on top of it. */
  primary: boolean;
  /**
   * Where it stands. The secondaries are judged on the last day, so before
   * then they are on track or at risk, never "done"; the order is done the
   * moment the second success lands.
   */
  state: ObjectiveState;
}

export type ObjectiveState = 'done' | 'ontrack' | 'atrisk' | 'failed';

/**
 * Days an operation typically takes door to door, from accepting it to
 * the ship being back alongside and able to take the next one. Used only
 * to warn that the clock is running out, never to judge.
 */
export const TYPICAL_OPERATION_DAYS = 11;

export function isDeployment(state: GameState): boolean {
  return state.campaign?.mode === 'deployment';
}

/** Day of the deployment, clamped to its length. */
export function deploymentDay(state: GameState): number {
  return Math.min(state.day, DEPLOYMENT_DAYS);
}

function successfulOps(state: GameState): number {
  return state.missionHistory.filter((m) => m.outcome === 'success' || m.outcome === 'outstanding').length;
}

function averageMorale(state: GameState): number {
  if (state.crew.length === 0) return 0;
  return state.crew.reduce((s, c) => s + c.morale, 0) / state.crew.length;
}

export function deploymentObjectives(state: GameState): Objective[] {
  const ops = successfulOps(state);
  const morale = Math.round(averageMorale(state));
  const readiness = Math.round(state.readiness.overall);
  return withStates(state, [
    {
      id: 'ops',
      label: 'Complete operations with Success or better',
      current: ops,
      target: DEPLOYMENT_REQUIRED_OPS,
      unit: '',
      met: ops >= DEPLOYMENT_REQUIRED_OPS,
      primary: true,
    },
    {
      id: 'prestige',
      label: 'Raise the ship’s prestige',
      current: state.prestige,
      target: 175,
      unit: '',
      met: state.prestige >= 175,
      primary: false,
    },
    {
      id: 'morale',
      label: 'Bring the crew home in good heart (morale)',
      current: morale,
      target: 70,
      unit: '%',
      met: morale >= 70,
      primary: false,
    },
    {
      id: 'readiness',
      label: 'Bring the ship home ready (readiness)',
      current: readiness,
      target: 60,
      unit: '%',
      met: readiness >= 60,
      primary: false,
    },
  ]);
}

function withStates(state: GameState, list: Omit<Objective, 'state'>[]): Objective[] {
  const ended = state.campaignEnd !== null;
  const daysLeft = Math.max(0, DEPLOYMENT_DAYS - state.day + 1);
  return list.map((o) => {
    let st: ObjectiveState;
    if (o.primary) {
      if (o.met) st = 'done';
      else if (ended) st = 'failed';
      else {
        // An operation under way is roughly half done, door to door.
        const remaining = o.target - o.current;
        const underway = state.mission ? 0.5 : 0;
        st = daysLeft >= (remaining - underway) * TYPICAL_OPERATION_DAYS ? 'ontrack' : 'atrisk';
      }
    } else if (ended) {
      st = o.met ? 'done' : 'failed';
    } else {
      st = o.met ? 'ontrack' : 'atrisk';
    }
    return { ...o, state: st };
  });
}

export function deploymentStars(state: GameState): number {
  return deploymentObjectives(state).filter((o) => !o.primary && o.met).length;
}

/**
 * Called at the end of each day of a deployment, after the day has been
 * resolved. Ends the deployment on the last day, judged on the orders.
 */
export function checkDeploymentEnd(state: GameState, notes: LogNote[]): void {
  if (state.campaignEnd || !isDeployment(state)) return;
  // `state.day` has already advanced: the day just played is day - 1.
  if (state.day - 1 < DEPLOYMENT_DAYS) return;

  const objectives = deploymentObjectives(state);
  const won = objectives.find((o) => o.primary)!.met;
  const stars = won ? deploymentStars(state) : 0;
  state.campaignEnd = {
    day: state.day - 1,
    won,
    stars,
    reason: won
      ? 'Deployment accomplished. The Resolute is relieved on station and heads home.'
      : 'Deployment not accomplished. Fleet expected two successful operations.',
  };
  notes.push({ key: state.campaignEnd.reason });
  // The deployment is over: tomorrow's decisions will never be taken.
  state.pendingEvents = [];
}
