import { clamp, Rng } from './rng';
import { seatFactor } from './councilEffects';
import type { Candidate, GameState, LogNote, SpecialtyId, SupplyId } from './types';
import { UPGRADES, UPGRADES_BY_ID } from '../data/missions';
import { SPECIALTIES, SPECIALTY_IDS } from '../data/specialties';
import { rank } from '../data/ranks';
import { createCrewMember, isAvailable, positionTitle, rollRank } from './crew';
import { isInPort } from './status';

// ---------------------------------------------------------------------------
// Prestige tiers (spec section 7)
// ---------------------------------------------------------------------------

export interface PrestigeTier {
  name: string;
  min: number;
  max: number;
  unlocks: string;
}

export const PRESTIGE_TIERS: PrestigeTier[] = [
  { name: 'Unknown', min: 0, max: 99, unlocks: 'Basic missions, standard recruits' },
  { name: 'Respected', min: 100, max: 249, unlocks: 'More mission choices, better recruits' },
  { name: 'Established', min: 250, max: 499, unlocks: 'Experienced personnel, advanced training' },
  { name: 'Distinguished', min: 500, max: 999, unlocks: 'Elite specialists, advanced equipment' },
  { name: 'Elite', min: 1000, max: 1999, unlocks: 'High-value missions, rare recruits' },
  { name: 'Legendary', min: 2000, max: Infinity, unlocks: 'Special missions, unique upgrades' },
];

export function prestigeTier(prestige: number): PrestigeTier {
  return PRESTIGE_TIERS.find((t) => prestige >= t.min && prestige <= t.max) ?? PRESTIGE_TIERS[0]!;
}

export function tierIndex(prestige: number): number {
  return PRESTIGE_TIERS.findIndex((t) => prestige >= t.min && prestige <= t.max);
}

// ---------------------------------------------------------------------------
// Daily economy
// ---------------------------------------------------------------------------

/** Daily wage bill, upkeep and command funding. */
export function runEconomy(state: GameState): { delta: number; notes: LogNote[] } {
  const notes: LogNote[] = [];
  let delta = 0;

  const wages = state.crew.reduce((s, c) => s + rank(c.rank).wage, 0);
  delta -= wages;

  // Operating costs scale with tempo — the direct cost of pushing the ship.
  const tempoUpkeep = { low: 6000, normal: 11000, high: 17000, maximum: 24000 }[state.tempo];
  delta -= tempoUpkeep;

  // Maintenance consumables.
  delta -= state.workOrders.length * 900;

  // Fleet funding arrives weekly and scales with prestige tier. The embarked
  // air wing is funded as its own command, so most of its aircrew pay comes
  // with an allowance rather than landing on the ship's books; the carrier
  // still carries a share of what it costs to keep squadrons aboard.
  if (state.day % 7 === 0) {
    const aircrewWages = state.crew
      .filter((c) => c.primary === 'pilot' || c.primary === 'aircrew')
      .reduce((sum, c) => sum + rank(c.rank).wage, 0);
    const wingAllowance = Math.round(aircrewWages * 7 * 0.85);
    const funding = 60000 + tierIndex(state.prestige) * 22000 + wingAllowance;
    delta += funding;
    notes.push({ key: 'Weekly command funding: +{amount} Credits', vars: { amount: funding } });
  }

  state.credits += delta;
  return { delta, notes };
}

/** Daily supply consumption (spec section 54). */
export function consumeSupplies(state: GameState): LogNote[] {
  const notes: LogNote[] = [];
  const crewCount = state.crew.length;
  const tempoFactor = { low: 0.7, normal: 1.0, high: 1.3, maximum: 1.6 }[state.tempo];
  const sortieLoad = state.aircraft.filter((a) => a.state === 'ready').length;

  const burn: Record<SupplyId, number> = {
    food: crewCount * 0.011,
    medical: 0.35 + state.crew.filter((c) => c.health !== 'healthy').length * 0.22,
    parts: state.workOrders.length * 0.35 + 0.4,
    fuel: sortieLoad * 0.18 * tempoFactor,
    general: crewCount * 0.006 * tempoFactor,
    ammo: state.mission ? 0.5 * tempoFactor : 0.1,
  };

  // A sharp supply officer wastes less.
  const thrift = 1 - 0.1 * seatFactor(state, 'supply');
  for (const key of Object.keys(burn) as SupplyId[]) {
    const before = state.supplies[key];
    state.supplies[key] = clamp(before - burn[key] * thrift, 0, state.suppliesMax[key]);
    // Warn once as each supply crosses a threshold.
    for (const threshold of [25, 10]) {
      if (before >= threshold && state.supplies[key] < threshold) {
        notes.push({
          key: '{supply} below {threshold}%',
          vars: { threshold },
          tvars: { supply: SUPPLY_LABELS[key] },
        });
      }
    }
  }
  return notes;
}

export const SUPPLY_LABELS: Record<SupplyId, string> = {
  food: 'Food',
  medical: 'Medical Supplies',
  parts: 'Spare Parts',
  fuel: 'Aviation Fuel',
  general: 'General Supplies',
  ammo: 'Ammunition',
};

/** Replenishment at cost — the player's manual lever on logistics. */
export function purchaseSupply(state: GameState, key: SupplyId, amount: number): boolean {
  if (!isInPort(state)) return false;
  const unitCost: Record<SupplyId, number> = {
    food: 700,
    medical: 1100,
    parts: 1800,
    fuel: 1500,
    general: 600,
    ammo: 2100,
  };
  const room = state.suppliesMax[key] - state.supplies[key];
  const actual = Math.min(amount, room);
  if (actual <= 0) return false;
  const cost = Math.round(actual * unitCost[key]);
  if (state.credits < cost) return false;
  state.credits -= cost;
  state.supplies[key] = clamp(state.supplies[key] + actual, 0, state.suppliesMax[key]);
  return true;
}

export function supplyUnitCost(key: SupplyId): number {
  return { food: 700, medical: 1100, parts: 1800, fuel: 1500, general: 600, ammo: 2100 }[key];
}

// ---------------------------------------------------------------------------
// Upgrades (spec sections 61-62)
// ---------------------------------------------------------------------------

export interface UpgradeStatus {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  nextEffect: string | null;
  costCredits: number | null;
  costPrestige: number | null;
  affordable: boolean;
}

export function upgradeStatus(state: GameState, id: string): UpgradeStatus {
  const def = UPGRADES_BY_ID[id]!;
  const level = state.upgrades[id] ?? 1;
  const idx = level - 1;
  const maxed = idx >= def.costCredits.length;
  const costCredits = maxed ? null : def.costCredits[idx]!;
  const costPrestige = maxed ? null : def.costPrestige[idx]!;
  return {
    id,
    name: def.name,
    description: def.description,
    level,
    maxLevel: def.costCredits.length + 1,
    nextEffect: maxed ? null : def.effectText[idx]!,
    costCredits,
    costPrestige,
    affordable:
      !maxed && state.credits >= costCredits! && state.prestige >= costPrestige!,
  };
}

export function allUpgradeStatuses(state: GameState): UpgradeStatus[] {
  return UPGRADES.map((u) => upgradeStatus(state, u.id));
}

export function purchaseUpgrade(state: GameState, id: string): boolean {
  if (!isInPort(state)) return false;
  const status = upgradeStatus(state, id);
  if (!status.affordable || status.costCredits === null) return false;
  state.credits -= status.costCredits;
  state.prestige = Math.max(0, state.prestige - status.costPrestige!);
  state.upgrades[id] = status.level + 1;

  // The upgrade level lives on the room so the renderer and the simulation
  // both read it from one place.
  const def = UPGRADES_BY_ID[id]!;
  const rs = state.rooms[def.roomId];
  if (rs) {
    rs.level = status.level + 1;
    rs.condition = clamp(rs.condition + 12, 0, 100);
  }

  // Storage upgrades raise every supply ceiling.
  if (id === 'up-stores') {
    const bump = [1.15, 1.3, 1.45, 1.65][status.level - 1] ?? 1;
    for (const key of Object.keys(state.suppliesMax) as SupplyId[]) {
      state.suppliesMax[key] = Math.round(100 * bump);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Recruitment (spec section 63)
// ---------------------------------------------------------------------------

/**
 * Candidate quality is gated by prestige tier — this is the main reason
 * prestige is a currency and not just a score.
 */
export function generateCandidates(state: GameState, rng: Rng, count = 3): Candidate[] {
  const tier = tierIndex(state.prestige);
  const out: Candidate[] = [];
  const used = new Set(state.crew.map((c) => c.name));

  for (let i = 0; i < count; i++) {
    const specialty: SpecialtyId = rng.pick(SPECIALTY_IDS);
    // Higher tiers both raise the mean and open the tail for rare candidates.
    const rare = rng.chance(0.06 + tier * 0.035);
    const quality = clamp(
      rng.statRoll(40 + tier * 8 + (rare ? 22 : 0), 10, 20, 97),
      20,
      97,
    );
    // Nobody flies a carrier aircraft as a raw recruit: aircrew candidates
    // arrive already qualified, which is also what makes them expensive.
    const floor = specialty === 'pilot' ? 3 : specialty === 'aircrew' ? 2 : 0;
    const rankIndex = Math.max(floor, Math.min(6, rollRank(rng) + (rare ? 1 : 0)));

    const temp = createCrewMember(rng, used, {
      id: `cand-${state.day}-${i}`,
      primary: specialty,
      rankIndex,
      quality,
      day: state.day,
    });

    const strength =
      (temp.attrs.technical + (temp.skills[specialty] ?? 0) + temp.attrs.experience) / 3;
    out.push({
      id: temp.id,
      name: temp.name,
      rank: rankIndex,
      primary: specialty,
      department: SPECIALTIES[specialty].department,
      attrs: temp.attrs,
      traits: temp.traits,
      skills: temp.skills,
      costPrestige: Math.max(5, Math.round(strength * 0.9 + rankIndex * 8)),
      costCredits: Math.round(strength * 900 + rankIndex * 4000),
    });
  }
  return out;
}

export function recruit(state: GameState, rng: Rng, candidateId: string): boolean {
  if (!isInPort(state)) return false;
  const idx = state.candidates.findIndex((c) => c.id === candidateId);
  if (idx < 0) return false;
  const cand = state.candidates[idx]!;
  if (state.prestige < cand.costPrestige || state.credits < cand.costCredits) return false;
  if (state.crew.length >= crewCapacity(state)) return false;

  state.prestige -= cand.costPrestige;
  state.credits -= cand.costCredits;

  const used = new Set(state.crew.map((c) => c.name));
  const member = createCrewMember(rng, used, {
    id: `c${String(state.crew.length + 1).padStart(3, '0')}-r${state.day}`,
    primary: cand.primary,
    rankIndex: cand.rank,
    quality: 50,
    day: state.day,
  });
  // Keep the rolled statistics the player actually chose.
  member.name = cand.name;
  member.attrs = { ...cand.attrs };
  member.traits = { ...cand.traits };
  member.skills = { ...cand.skills };
  member.daysAboard = 0;
  member.career = [{ day: state.day, key: 'Reported aboard' }];
  member.position = positionTitle(member);

  state.crew.push(member);
  state.candidates.splice(idx, 1);
  return true;
}

/** Crew capacity from berthing, medical and food (spec section 6.3). */
export function crewCapacity(state: GameState): number {
  const berthLevel = state.upgrades['up-berthing'] ?? 1;
  return 110 + (berthLevel - 1) * 14;
}

export function availableCrewCount(state: GameState): number {
  return state.crew.filter(isAvailable).length;
}
