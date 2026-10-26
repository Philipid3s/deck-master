import type { EquipmentEffect, GameState } from './types';
import { EQUIPMENT } from '../data/equipment';

/**
 * Equipment effect lookups, kept in their own module.
 *
 * The simulation modules that consume these (aircraft, tasking, missions,
 * effects) must not depend on `procurement.ts`, which in turn needs the
 * parking layout from `aircraft.ts` at module scope — that cycle would be a
 * temporal-dead-zone crash depending on which module loaded first.
 */

/**
 * Total bonus from every owned item feeding a given term. Additive: three tow
 * tractors are three extra sorties, three tool sets are +18% maintenance.
 */
export function equipmentBonus(state: GameState, kind: EquipmentEffect['t']): number {
  let total = 0;
  for (const def of EQUIPMENT) {
    if (def.effect.t !== kind) continue;
    total += (state.equipment?.[def.id] ?? 0) * def.effect.v;
  }
  return total;
}

/** Multiplier form, clamped so stacked purchases cannot break a system. */
export function equipmentFactor(
  state: GameState,
  kind: EquipmentEffect['t'],
  direction: 'increase' | 'reduce',
  cap = 0.5,
): number {
  const bonus = Math.min(cap, equipmentBonus(state, kind));
  return direction === 'increase' ? 1 + bonus : 1 - bonus;
}

export function ownedCount(state: GameState, id: string): number {
  return state.equipment?.[id] ?? 0;
}
