import { clamp, Rng } from './rng';
import { bonusProgress, bonusReward, initMechanic, runMechanic } from './operations';
import { isDeployment } from './deployment';
import { supportValue } from './tasking';
import { seatFactor } from './councilEffects';
import type {
  GameState,
  LogNote,
  MissionDef,
  MissionOutcome,
  MissionRequirements,
} from './types';
import { MISSIONS, missionDef } from '../data/missions';
import { isAvailable } from './crew';
import { autoAssign, computeTasking } from './tasking';
import { equipmentBonus } from './equipmentEffects';
import { beginOutboundTransit, beginReturnTransit, isInPort } from './status';

export interface RequirementCheck {
  label: string;
  required: number;
  actual: number;
  met: boolean;
}

/** Compare current readiness against a mission's stated minimums. */
export function checkRequirements(state: GameState, def: MissionDef): RequirementCheck[] {
  const r = state.readiness;
  const totalAircraft = Math.max(1, state.aircraft.length);
  const readyPct = (state.aircraft.filter((a) => a.state === 'ready').length / totalAircraft) * 100;

  const map: [keyof MissionRequirements, string, number][] = [
    ['aircraftReady', 'Aircraft Ready', readyPct],
    ['crewReadiness', 'Crew Readiness', r.crew],
    ['engineering', 'Engineering', r.engineering],
    ['operations', 'Operations', r.operations],
    ['fuel', 'Aviation Fuel', state.supplies.fuel],
    ['overall', 'Carrier Readiness', r.overall],
  ];

  const out: RequirementCheck[] = [];
  for (const [key, label, actual] of map) {
    const required = def.requirements[key];
    if (required === undefined) continue;
    out.push({ label, required, actual, met: actual >= required });
  }
  return out;
}

/**
 * Estimated chance of at least a Success outcome, shown before accepting.
 *
 * Preparation dominates: a well-prepared ship sits around 90%, a badly
 * prepared one around 50%, and neither is ever a certainty (spec section 82).
 */
export function successProbability(state: GameState, def: MissionDef): number {
  const checks = checkRequirements(state, def);
  const unmet = checks.filter((c) => !c.met);

  // Margin above (or below) each requirement, averaged.
  const margin =
    checks.length === 0
      ? 0.2
      : checks.reduce((s, c) => s + clamp((c.actual - c.required) / 100, -0.6, 0.4), 0) /
        checks.length;

  const base = 0.62 + margin * 0.85;
  const difficultyPenalty = (def.difficulty - 2) * 0.055;
  const unmetPenalty = unmet.length * 0.09;
  const riskPenalty = (state.mission?.riskModifier ?? 0) * 0.004;

  return clamp(base - difficultyPenalty - unmetPenalty - riskPenalty, 0.06, 0.96);
}

export function startMission(state: GameState, defId: string): boolean {
  if (state.mission) return false;
  // A mission is committed to at the moment the ship sails, so it can only
  // be accepted alongside.
  if (!isInPort(state)) return false;
  const def = missionDef(defId);
  if (state.prestige < effectiveMinPrestige(state, def)) return false;
  state.mission = {
    defId,
    startedDay: state.day,
    progress: 0,
    daysElapsed: 0,
    log: [
      {
        day: state.day,
        note: { key: 'Mission accepted: {title}', tvars: { title: def.title } },
      },
    ],
    progressModifier: 0,
    riskModifier: 0,
  };
  initMechanic(state.mission, def, Rng.stream(state.seed, state.day, `mech|${defId}`));
  state.missionOffers = state.missionOffers.filter((id) => id !== defId);
  beginOutboundTransit(state, def.transitDays);
  // Lay on a workable tasking order immediately — the player can rework it,
  // but accepting a mission should never leave the deck idle by accident.
  autoAssign(state);
  return true;
}

/**
 * One day of mission progress (spec section 45).
 *
 * Deliberately not deterministic — but the random band is narrow compared
 * with the preparation term, so a ready ship reliably out-performs a
 * ragged one.
 */
export function advanceMission(
  state: GameState,
  rng: Rng,
): { delta: number; note: LogNote | null; notes?: LogNote[] } {
  const mission = state.mission;
  if (!mission) return { delta: 0, note: null };
  const def = missionDef(mission.defId);

  const checks = checkRequirements(state, def);
  const unmet = checks.filter((c) => !c.met).length;

  // Baseline rate: enough to finish in `days` at full readiness.
  const nominal = 100 / def.days;

  // The tasking order is the dominant term: the right airframes on the right
  // duty are what actually achieve the mission. Readiness and crew now shape
  // how well that tasking performs rather than substituting for it.
  const tasking = computeTasking(state);
  const taskingTerm = tasking.ratio;

  const readinessTerm = clamp(state.readiness.overall / 78, 0.45, 1.15);
  const unmetTerm = clamp(1 - unmet * 0.16, 0.35, 1);
  const crewTerm = clamp(
    state.crew.filter(isAvailable).length / Math.max(1, state.crew.length * 0.72),
    0.45,
    1.15,
  );

  // Where a submarine is part of the threat, nobody hunting it is felt: the
  // group slows to protect itself, and the risk builds.
  const unwatched = (def.dutyWeights.asw ?? 0) > 0 && supportValue(state, 'asw') <= 0;
  if (unwatched) mission.riskModifier += 3;
  const aswTerm = unwatched ? 0.85 : 1;

  // The operation's own mechanic: contacts, raids, casualties, the strike
  // window, or the tension of a crisis.
  const mechanic = runMechanic(state, def, rng);
  for (const n of mechanic.notes) mission.log.push({ day: state.day, note: n });

  const jitter = rng.range(0.88, 1.12);
  // Operations runs the plan; information warfare sharpens it.
  const staffTerm = 1 + 0.05 * seatFactor(state, 'ops') + 0.03 * seatFactor(state, 'it');
  let delta =
    nominal * taskingTerm * readinessTerm * unmetTerm * crewTerm * staffTerm * aswTerm * mechanic.multiplier * jitter +
    mechanic.bonus;

  // Aircraft held on deck alert shave accumulated risk off the operation, and
  // so does equipment bought for exactly that purpose.
  const riskRelief =
    // A real deck alert: each airframe ready to launch at five minutes.
    tasking.alertCount * 1.2 +
    equipmentBonus(state, 'missionRisk') +
    // The warfare officer reads the threat and takes some of it off the table.
    Math.max(0, 0.4 * (1 + seatFactor(state, 'warfare'))) +
    // Jamming ahead of a strike, and submarine hunting where a submarine is
    // part of the threat, both take risk off as well.
    (def.dutyWeights.strike ? supportValue(state, 'escort') * 0.6 : 0) +
    (def.dutyWeights.asw ? supportValue(state, 'asw') * 0.5 : 0);
  if (riskRelief > 0) {
    mission.riskModifier = Math.max(0, mission.riskModifier - riskRelief);
  }
  delta += mission.progressModifier;
  mission.progressModifier = 0;

  delta = clamp(delta, -8, 34);
  mission.progress = clamp(mission.progress + delta, 0, 100);
  mission.daysElapsed++;

  // Occasional narrative note when a day goes notably well or badly.
  let note: LogNote | null = null;
  if (unwatched) {
    note = { key: 'No anti-submarine cover — the group slows and the submarine threat goes unwatched.' };
  } else if (delta > nominal * 1.15) {
    note = { key: 'Exceptional day — the cycle ran clean and ahead of plan.' };
  } else if (tasking.ratio < 0.45) {
    note = { key: 'Little progress — the air tasking order did not cover the objective.' };
  } else if (delta < nominal * 0.5) {
    note = { key: 'Slow day — degraded readiness held the operation back.' };
  }
  if (note) mission.log.push({ day: state.day, note });

  return { delta, note: note ?? mechanic.notes[0] ?? null, notes: mechanic.notes };
}

export function missionShouldResolve(state: GameState): boolean {
  const m = state.mission;
  if (!m) return false;
  const def = missionDef(m.defId);
  return m.progress >= 100 || m.daysElapsed >= def.days + 4;
}

/**
 * Final outcome. Progress at the deadline is the primary term; readiness,
 * casualties and accumulated risk shift the band.
 */
export function resolveMission(
  state: GameState,
  rng: Rng,
): { outcome: MissionOutcome; credits: number; prestige: number; notes: LogNote[] } {
  const mission = state.mission!;
  const def = missionDef(mission.defId);

  const progress = mission.progress;
  const risk = mission.riskModifier;
  const readiness = state.readiness.overall;

  // Score 0..1.
  let score = progress / 100;
  score += (readiness - 60) / 400;
  score -= risk / 320;
  score -= state.crew.filter((c) => c.health !== 'healthy').length * 0.006;
  score += rng.range(-0.07, 0.07);
  score = clamp(score, 0, 1.3);

  let outcome: MissionOutcome;
  if (progress >= 100 && score >= 1.05) outcome = 'outstanding';
  else if (progress >= 96) outcome = 'success';
  else if (progress >= 72) outcome = 'partial';
  else if (progress >= 40) outcome = 'failure';
  else outcome = 'catastrophic';

  const multipliers: Record<MissionOutcome, { credits: number; prestige: number }> = {
    outstanding: { credits: 1.4, prestige: 1.6 },
    success: { credits: 1.0, prestige: 1.0 },
    partial: { credits: 0.55, prestige: 0.3 },
    failure: { credits: 0.2, prestige: -0.75 },
    catastrophic: { credits: 0, prestige: -1.5 },
  };

  const mult = multipliers[outcome];
  let credits = Math.round(def.rewardCredits * mult.credits);
  let prestige = Math.round(def.rewardPrestige * mult.prestige);

  // The bonus objective pays only on a successful outcome.
  const bonus = bonusProgress(mission, def);
  const bonusMet = !!bonus?.met && (outcome === 'success' || outcome === 'outstanding');
  if (bonusMet) {
    const extra = bonusReward(def);
    credits += extra.credits;
    prestige += extra.prestige;
  }

  state.credits += credits;
  state.prestige = Math.max(0, state.prestige + prestige);

  const notes: LogNote[] = [];
  notes.push({
    key: '{title} — {outcome}',
    tvars: { title: def.title, outcome: OUTCOME_LABELS[outcome] },
  });
  if (bonusMet) notes.push({ key: 'Bonus objective met — extra reward paid' });

  // Consequences beyond the reward line.
  for (const c of state.crew) {
    if (outcome === 'outstanding') c.morale = clamp(c.morale + 12, 0, 100);
    else if (outcome === 'success') c.morale = clamp(c.morale + 7, 0, 100);
    else if (outcome === 'partial') c.morale = clamp(c.morale + 1, 0, 100);
    else if (outcome === 'failure') c.morale = clamp(c.morale - 9, 0, 100);
    else c.morale = clamp(c.morale - 18, 0, 100);
  }

  state.missionHistory.unshift({
    defId: def.id,
    title: def.title,
    startedDay: mission.startedDay,
    endedDay: state.day,
    outcome,
    prestige,
    credits,
  });

  state.mission = null;
  // Offers are refreshed when the ship is alongside again, not out here.
  notes.push(beginReturnTransit(state, def.transitDays));

  return { outcome, credits, prestige, notes };
}

export const OUTCOME_LABELS: Record<MissionOutcome, string> = {
  outstanding: 'OUTSTANDING SUCCESS',
  success: 'SUCCESS',
  partial: 'PARTIAL SUCCESS',
  failure: 'FAILURE',
  catastrophic: 'CATASTROPHIC FAILURE',
};

/**
 * Rebuild the mission board. Prestige gates access to better work, which is
 * the main way prestige functions as a currency (spec section 64).
 */
export function refreshMissionOffers(state: GameState, rng: Rng): void {
  const available = MISSIONS.filter((m) => state.prestige >= effectiveMinPrestige(state, m));
  const recent = new Set(state.missionHistory.slice(0, 2).map((h) => h.defId));
  const pool = available.filter((m) => !recent.has(m.id));
  const source = pool.length >= 3 ? pool : available;

  const picked: string[] = [];
  const shuffled = rng.shuffle(source.slice());
  // Always offer at least one low-difficulty option so the player is never
  // forced into a mission they cannot survive.
  const safe = shuffled.find((m) => m.difficulty <= 2);
  if (safe) picked.push(safe.id);
  for (const m of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.includes(m.id)) picked.push(m.id);
  }
  state.missionOffers = picked;
}

/**
 * The standing an operation needs before it is offered. On a deployment the
 * fleet assigns work beyond the ship's reputation — thirty days is too short
 * to earn the board one operation at a time — so the bar is lower.
 */
export function effectiveMinPrestige(state: GameState, def: MissionDef): number {
  return isDeployment(state) ? Math.max(0, def.minPrestige - 150) : def.minPrestige;
}

export function missionProgressLabel(state: GameState): string {
  if (!state.mission) return 'NO ACTIVE MISSION';
  const def = missionDef(state.mission.defId);
  return `${def.title} — ${Math.round(state.mission.progress)}%`;
}
