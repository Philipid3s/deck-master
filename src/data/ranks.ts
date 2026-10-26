import type { AttrId } from '../core/types';

export interface RankDef {
  /** Index in RANKS; also the value stored on a crew member. */
  index: number;
  code: string;
  name: string;
  /** Typical position title at this rank, per specialty family. */
  positionPrefix: string;
  /** Base daily wage in credits. */
  wage: number;
}

/**
 * Rank and position are deliberately separate (spec section 24) — a
 * promotion raises the rank and the position title but never changes a
 * crew member's specialty.
 */
export const RANKS: RankDef[] = [
  { index: 0, code: 'E-3', name: 'Airman', positionPrefix: 'Junior', wage: 42 },
  { index: 1, code: 'E-4', name: 'Petty Officer Third Class', positionPrefix: '', wage: 58 },
  { index: 2, code: 'E-5', name: 'Petty Officer Second Class', positionPrefix: 'Experienced', wage: 76 },
  { index: 3, code: 'E-6', name: 'Petty Officer First Class', positionPrefix: 'Senior', wage: 98 },
  { index: 4, code: 'E-7', name: 'Chief Petty Officer', positionPrefix: 'Supervisor,', wage: 128 },
  { index: 5, code: 'E-8', name: 'Senior Chief Petty Officer', positionPrefix: 'Division Chief,', wage: 162 },
  { index: 6, code: 'O-3', name: 'Lieutenant', positionPrefix: 'Officer,', wage: 205 },
];

export const MAX_RANK = RANKS.length - 1;

export function rank(index: number): RankDef {
  return RANKS[Math.max(0, Math.min(MAX_RANK, index))]!;
}

/**
 * Promotion gates (spec section 32). Requirements rise steeply so that a
 * brilliant technician with weak leadership genuinely stalls at senior
 * specialist — the trade-off in spec section 33.
 */
export interface PromotionGate {
  toRank: number;
  requires: Partial<Record<AttrId, number>>;
  /** Minimum skill in the crew member's primary specialty. */
  primarySkill: number;
  /** Training course ids that must be completed first. */
  training: string[];
  label: string;
}

export const PROMOTION_GATES: PromotionGate[] = [
  {
    toRank: 1,
    requires: { experience: 18, discipline: 40 },
    primarySkill: 32,
    training: ['basic-safety'],
    label: 'Airman → Petty Officer Third Class',
  },
  {
    toRank: 2,
    requires: { experience: 30, discipline: 50 },
    primarySkill: 45,
    training: [],
    label: 'Third Class → Second Class',
  },
  {
    toRank: 3,
    requires: { experience: 45, discipline: 55, leadership: 35 },
    primarySkill: 58,
    training: [],
    label: 'Second Class → First Class',
  },
  {
    toRank: 4,
    requires: { experience: 55, discipline: 60, leadership: 45 },
    primarySkill: 62,
    training: ['lead-team'],
    label: 'First Class → Chief Petty Officer',
  },
  {
    toRank: 5,
    requires: { experience: 70, discipline: 68, leadership: 60 },
    primarySkill: 70,
    training: ['lead-team', 'lead-crisis'],
    label: 'Chief → Senior Chief',
  },
  {
    toRank: 6,
    requires: { experience: 82, discipline: 75, leadership: 72, stress: 65 },
    primarySkill: 74,
    training: ['lead-team', 'lead-crisis', 'lead-mentor'],
    label: 'Senior Chief → Lieutenant',
  },
];

export function gateFor(currentRank: number): PromotionGate | null {
  return PROMOTION_GATES.find((g) => g.toRank === currentRank + 1) ?? null;
}
