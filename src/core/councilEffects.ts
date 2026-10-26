import type { GameState, SeatId } from './types';

/**
 * How well a council seat is being run, as a factor from -1 to +1.
 *
 * Kept in its own module with no imports beyond types, like
 * `equipmentEffects.ts`, so the simulation modules can read it without
 * pulling the council (which imports half of core) into an import cycle.
 *
 *  - An average officer (competence 50) is 0: the ship runs as it always did.
 *  - A gifted one approaches +1, a poor one -1.
 *  - A vacant seat is -0.6: a department without its head drifts.
 *  - An officer who thinks little of the captain does the job at 60%: a
 *    disgruntled department head is not a neutral one.
 *
 * A campaign with no council at all (a save from before it existed) reads 0
 * everywhere, so old saves play exactly as they did.
 */
export function seatFactor(state: GameState, seat: SeatId): number {
  const council = state.council;
  if (!council) return 0;
  const officer = council.seats[seat];
  if (!officer) return -0.6;
  const raw = (officer.competence - 50) / 50;
  const morale = officer.opinion < -40 ? 0.6 : 1;
  return Math.max(-1, Math.min(1, raw * morale));
}
