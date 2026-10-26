import { clamp, Rng } from './rng';
import type { ActiveMission, GameState, LogNote, MechanicId, MissionDef } from './types';
import { computeTasking, supportValue } from './tasking';
import { seatFactor } from './councilEffects';

/**
 * What makes each operation play differently.
 *
 * Every mission still advances on the tasking order — the right airframes on
 * the right duties — but most carry a mechanic of their own on top, run once
 * a day on station, that asks for something more than "cover the
 * requirement":
 *
 *  - contacts   (patrol, intelligence): recon finds contacts and has to
 *               identify them; unidentified contacts pile up as risk.
 *  - threat     (convoy, air defence): a raid comes every day, forecast the
 *               evening before; CAP and the deck alert meet it, and what
 *               gets through costs risk and progress.
 *  - casualties (relief, evacuation): lift brings evacuees and injured
 *               aboard; food and medical stores pay for them.
 *  - window     (strike): recon builds a targeting picture until a
 *               two-day window opens, when strike counts for far more.
 *  - escalation (crisis): tension rises on its own; presence in the air
 *               and the captain's choices bring it down. At 90, a flashpoint.
 *
 * Each also has one bonus objective, paid on a successful outcome.
 */

export interface BonusDef {
  /** English source string, with {target}. */
  label: string;
  target: number;
}

const BONUS: Record<string, BonusDef> = {
  'm-workups': { label: 'Finish within {target} days on station', target: 5 },
  'm-patrol': { label: 'Identify {target} contacts', target: 8 },
  'm-elint': { label: 'Identify {target} contacts', target: 10 },
  'm-convoy': { label: 'Let no more than {target} raiders through', target: 1 },
  'm-airdefence': { label: 'Let no more than {target} raiders through', target: 0 },
  'm-relief': { label: 'Bring {target} people to safety', target: 110 },
  'm-evacuation': { label: 'Bring {target} people to safety', target: 160 },
  'm-strike': { label: 'Finish within {target} days on station', target: 7 },
  'm-crisis': { label: 'End with tension at {target} or below', target: 30 },
};

export function bonusFor(defId: string): BonusDef | null {
  return BONUS[defId] ?? null;
}

/** Where the mission stands against its bonus objective. */
export function bonusProgress(mission: ActiveMission, def: MissionDef): { current: number; met: boolean } | null {
  const bonus = bonusFor(def.id);
  if (!bonus) return null;
  const m = mission.mech ?? {};
  switch (def.mechanic) {
    case 'contacts':
      return { current: m.identified ?? 0, met: (m.identified ?? 0) >= bonus.target };
    case 'threat':
      return { current: m.leakers ?? 0, met: (m.leakers ?? 0) <= bonus.target };
    case 'casualties':
      return { current: m.evacuees ?? 0, met: (m.evacuees ?? 0) >= bonus.target };
    case 'escalation':
      return { current: Math.round(m.tension ?? 50), met: (m.tension ?? 50) <= bonus.target };
    default:
      return { current: mission.daysElapsed, met: mission.progress >= 100 && mission.daysElapsed <= bonus.target };
  }
}

/** Set up the mechanic when the mission is accepted. */
export function initMechanic(mission: ActiveMission, def: MissionDef, rng: Rng): void {
  switch (def.mechanic) {
    case 'contacts':
      mission.mech = { found: 0, identified: 0 };
      break;
    case 'threat':
      mission.mech = { threatTomorrow: rng.int(1, 2), threat: 0, leakers: 0 };
      break;
    case 'casualties':
      mission.mech = { evacuees: 0, injured: 0 };
      break;
    case 'window':
      mission.mech = { intel: 0, windowDays: 0, windows: 0 };
      break;
    case 'escalation':
      mission.mech = { tension: 50 };
      break;
    default:
      mission.mech = {};
  }
}

export const THREAT_LABELS = ['NONE', 'LIGHT', 'HEAVY', 'MAJOR'];

/** Air defence on hand against a raid: the CAP aloft and the deck alert. */
export function airDefence(state: GameState): number {
  return supportValue(state, 'cap') + computeTasking(state).alertCount * 0.7;
}

/** Air defence a raid of this level needs to be met in full. */
export function defenceNeeded(threat: number): number {
  return threat * 1.6;
}

export interface MechanicResult {
  /** Multiplies the day's progress. */
  multiplier: number;
  /** Added to the day's progress. */
  bonus: number;
  notes: LogNote[];
}

/** One day of the mission's own mechanic, on station. */
export function runMechanic(state: GameState, def: MissionDef, rng: Rng): MechanicResult {
  const mission = state.mission!;
  if (!mission.mech) initMechanic(mission, def, rng);
  const m = mission.mech!;
  const notes: LogNote[] = [];
  let multiplier = 1;
  let bonus = 0;

  switch (def.mechanic) {
    case 'contacts': {
      const recon = supportValue(state, 'recon');
      const found = Math.round(recon * 0.9 + rng.range(0, 1.6));
      m.found = (m.found ?? 0) + found;
      const open = (m.found ?? 0) - (m.identified ?? 0);
      const ided = Math.min(open, Math.floor(recon * 0.7 + rng.range(0, 1)));
      m.identified = (m.identified ?? 0) + ided;
      bonus += ided * 1.2;
      const unidentified = (m.found ?? 0) - (m.identified ?? 0);
      if (found > 0) {
        notes.push({ key: '{found} new contacts, {ided} identified', vars: { found, ided } });
      }
      if (unidentified >= 4) {
        mission.riskModifier += 1.5;
        notes.push({ key: '{n} contacts unidentified — the picture is going stale', vars: { n: unidentified } });
      }
      break;
    }

    case 'threat': {
      const threat = m.threatTomorrow ?? 1;
      m.threat = threat;
      const defence = airDefence(state);
      const need = defenceNeeded(threat);
      if (threat > 0 && defence < need) {
        const leakers = Math.max(1, Math.ceil((need - defence) / 1.6));
        m.leakers = (m.leakers ?? 0) + leakers;
        mission.riskModifier += leakers * 3;
        multiplier = Math.max(0.6, 1 - 0.12 * leakers);
        notes.push({ key: 'Raid met short: {n} raiders through the screen', vars: { n: leakers } });
      } else if (threat > 0) {
        bonus += threat * 0.8;
        notes.push({ key: 'Raid met in full by the CAP and the alert' });
      }
      // Tomorrow's forecast: the raids grow heavier as the operation wears on.
      const drift = rng.int(-1, 1) + (mission.daysElapsed >= 3 && rng.chance(0.4) ? 1 : 0);
      m.threatTomorrow = clamp(threat + drift, 0, 3);
      break;
    }

    case 'casualties': {
      const lift = supportValue(state, 'lift');
      const evac = Math.round(lift * 12 * rng.range(0.8, 1.2));
      const injured = Math.round(evac * 0.18);
      m.evacuees = (m.evacuees ?? 0) + evac;
      m.injured = (m.injured ?? 0) + injured;
      state.supplies.food = clamp(state.supplies.food - evac * 0.03, 0, state.suppliesMax.food);
      state.supplies.medical = clamp(state.supplies.medical - injured * 0.35, 0, state.suppliesMax.medical);
      if (evac > 0) notes.push({ key: '{evac} people brought aboard, {injured} of them hurt', vars: { evac, injured } });
      if (state.supplies.medical < 15) {
        multiplier = 0.8;
        notes.push({ key: 'Sick bay is out of medical stores — the casualty flow slows everything' });
      }
      break;
    }

    case 'window': {
      if ((m.windowDays ?? 0) > 0) {
        multiplier = 1.6;
        m.windowDays = (m.windowDays ?? 0) - 1;
        if (m.windowDays === 0) {
          m.intel = 25;
          notes.push({ key: 'The strike window has closed; the targeting picture must be rebuilt' });
        }
      } else {
        const recon = supportValue(state, 'recon');
        // Information warfare sharpens the picture.
        m.intel = clamp((m.intel ?? 0) + recon * (14 + 4 * seatFactor(state, 'it')), 0, 100);
        multiplier = 0.35;
        if ((m.intel ?? 0) >= 100) {
          m.windowDays = 2;
          m.windows = (m.windows ?? 0) + 1;
          notes.push({ key: 'Strike window open: two days to put the package on target' });
        }
      }
      break;
    }

    case 'escalation': {
      const presence =
        supportValue(state, 'cap') + supportValue(state, 'asw') * 0.8 + supportValue(state, 'recon') * 0.4;
      m.tension = clamp((m.tension ?? 50) + 4 - presence * 0.6 + rng.range(-2, 2), 0, 100);
      if ((m.tension ?? 0) >= 90) {
        mission.riskModifier += 8;
        multiplier = 0.7;
        notes.push({ key: 'Flashpoint: tension at {n}', vars: { n: Math.round(m.tension ?? 0) } });
      } else if ((m.tension ?? 0) > 70) {
        multiplier = 0.85;
      } else if ((m.tension ?? 0) <= 20) {
        bonus += 3;
        notes.push({ key: 'The crisis is de-escalating' });
      }
      break;
    }

    default:
      break;
  }

  return { multiplier, bonus, notes };
}

/** Bonus reward on a successful outcome, when the bonus objective is met. */
export function bonusReward(def: MissionDef): { credits: number; prestige: number } {
  return { credits: Math.round(def.rewardCredits * 0.25), prestige: Math.round(def.rewardPrestige * 0.3) };
}

export const MECHANIC_LABELS: Record<MechanicId, string> = {
  contacts: 'Contacts to find and identify',
  threat: 'Daily raids, forecast the evening before',
  casualties: 'Evacuees and injured brought aboard',
  window: 'Targeting, then a two-day strike window',
  escalation: 'Tension that rises on its own',
};
