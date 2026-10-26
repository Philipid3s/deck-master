import { clamp } from './rng';
import type { Aircraft, Delivery, GameState, LogNote } from './types';
import { AIRCRAFT_TYPES, aircraftType } from '../data/aircraft';
import { EQUIPMENT, equipmentDef } from '../data/equipment';
import { squadronFor } from '../data/names';
import { FLIGHT_SPOTS, HANGAR_SPOTS, isMissionCapable } from './aircraft';
import { equipmentBonus, equipmentFactor, ownedCount } from './equipmentEffects';
import { isInPort, portOnlyReason } from './status';

export { equipmentBonus, equipmentFactor, ownedCount };

/**
 * Procurement (spec section 61).
 *
 * Two rules make buying things a decision rather than a shop:
 *
 *  1. Nothing arrives instantly. Every order has a lead time, so spending is
 *     a bet on where the campaign will be in a week — you cannot buy your way
 *     out of today's problem.
 *  2. Prestige gates the catalogue, so reputation opens access to better
 *     airframes rather than only paying for them.
 */

/** Parking is physical: the ship can hold what the deck and hangar can spot. */
export const AIRCRAFT_CAPACITY = FLIGHT_SPOTS.length + HANGAR_SPOTS.length;

export function aircraftOnOrder(state: GameState): number {
  return state.deliveries.filter((d) => d.kind === 'aircraft').length;
}

export function aircraftCapacityUsed(state: GameState): number {
  return state.aircraft.length + aircraftOnOrder(state);
}

// ---------------------------------------------------------------------------
// Buying
// ---------------------------------------------------------------------------

export interface PurchaseCheck {
  ok: boolean;
  reasons: string[];
}

export function canBuyAircraft(state: GameState, typeId: string): PurchaseCheck {
  const type = aircraftType(typeId);
  const reasons: string[] = [];
  const atSea = portOnlyReason(state);
  if (atSea) reasons.push(atSea);
  if (state.prestige < type.minPrestige) reasons.push('Standing too low for this airframe');
  if (state.credits < type.costCredits) reasons.push('Insufficient credits');
  if (state.prestige < type.costPrestige) reasons.push('Insufficient prestige');
  if (aircraftCapacityUsed(state) >= AIRCRAFT_CAPACITY) {
    reasons.push('No parking left on the deck or in the hangar');
  }
  return { ok: reasons.length === 0, reasons };
}

export function orderAircraft(state: GameState, typeId: string): boolean {
  const check = canBuyAircraft(state, typeId);
  if (!check.ok) return false;
  const type = aircraftType(typeId);

  state.credits -= type.costCredits;
  state.prestige = Math.max(0, state.prestige - type.costPrestige);
  state.deliverySeq++;

  state.deliveries.push({
    id: `dl${String(state.deliverySeq).padStart(4, '0')}`,
    kind: 'aircraft',
    refId: typeId,
    orderedDay: state.day,
    arrivesDay: state.day + type.leadDays,
  });
  return true;
}

export function canBuyEquipment(state: GameState, id: string): PurchaseCheck {
  const def = equipmentDef(id);
  const reasons: string[] = [];
  const atSea = portOnlyReason(state);
  if (atSea) reasons.push(atSea);
  const onOrder = state.deliveries.filter((d) => d.kind === 'equipment' && d.refId === id).length;
  if (state.prestige < def.minPrestige) reasons.push('Standing too low for this equipment');
  if (state.credits < def.costCredits) reasons.push('Insufficient credits');
  if (state.prestige < def.costPrestige) reasons.push('Insufficient prestige');
  if (ownedCount(state, id) + onOrder >= def.max) reasons.push('The ship holds as many as it can use');
  return { ok: reasons.length === 0, reasons };
}

export function orderEquipment(state: GameState, id: string): boolean {
  const check = canBuyEquipment(state, id);
  if (!check.ok) return false;
  const def = equipmentDef(id);

  state.credits -= def.costCredits;
  state.prestige = Math.max(0, state.prestige - def.costPrestige);
  state.deliverySeq++;

  state.deliveries.push({
    id: `dl${String(state.deliverySeq).padStart(4, '0')}`,
    kind: 'equipment',
    refId: id,
    orderedDay: state.day,
    arrivesDay: state.day + def.leadDays,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/** A free parking spot, preferring the hangar for newly delivered airframes. */
function findFreeSpot(state: GameState): { deck: 1 | 2; x: number; y: number } | null {
  for (const [deck, spots] of [
    [2, HANGAR_SPOTS],
    [1, FLIGHT_SPOTS],
  ] as [1 | 2, { x: number; y: number }[]][]) {
    const taken = new Set(
      state.aircraft.filter((a) => a.deck === deck).map((a) => `${a.x},${a.y}`),
    );
    const free = spots.find((s) => !taken.has(`${s.x},${s.y}`));
    if (free) return { deck, x: free.x, y: free.y };
  }
  return null;
}

/** Next unused tail number, so deliveries read as additions to the wing. */
/** The next free side number in this type's squadron block. */
function nextTail(state: GameState, typeId: string): string {
  const used = new Set(state.aircraft.map((a) => Number(a.tail)));
  let n = aircraftType(typeId).modexBase + 1;
  while (used.has(n)) n++;
  return String(n);
}

/**
 * Deliver everything due today. Called from the daily resolution, so an order
 * placed on day 3 with a five-day lead arrives on day 8 and not before.
 */
export function runDeliveries(state: GameState): LogNote[] {
  const notes: LogNote[] = [];
  // Nothing is craned aboard at sea. An order that comes due while the ship
  // is deployed simply waits alongside until it returns.
  if (!isInPort(state)) return notes;

  const due = state.deliveries.filter((d) => d.arrivesDay <= state.day);
  if (due.length === 0) return notes;

  state.deliveries = state.deliveries.filter((d) => d.arrivesDay > state.day);

  for (const delivery of due) {
    if (delivery.kind === 'equipment') {
      const def = equipmentDef(delivery.refId);
      state.equipment[delivery.refId] = (state.equipment[delivery.refId] ?? 0) + 1;
      notes.push({ key: 'Delivered: {item}', tvars: { item: def.name } });
      continue;
    }

    const type = aircraftType(delivery.refId);
    const spot = findFreeSpot(state);
    if (!spot) {
      // Nowhere to put it. Refund rather than silently losing the airframe.
      state.credits += type.costCredits;
      notes.push({
        key: 'No parking for {type} — order refunded',
        tvars: { type: type.name },
      });
      continue;
    }

    const a: Aircraft = {
      id: `a-${delivery.id}`,
      tail: nextTail(state, delivery.refId),
      typeId: delivery.refId,
      squadron: squadronFor(delivery.refId, type.role),
      state: 'ready',
      deck: spot.deck,
      x: spot.x,
      y: spot.y,
      // A new airframe arrives in good order but not perfect.
      systems: { engine: 97, avionics: 96, airframe: 98 },
      fuel: 60,
      weapons: 0,
      flightHours: 0,
      sortiesToday: 0,
      duty: 'standdown',
      crewIds: new Array<string>(type.crewRequired).fill(''),
    };
    a.state = isMissionCapable(a) ? 'ready' : 'stored';
    state.aircraft.push(a);
    notes.push({
      key: 'Delivered: {type} #{tail}',
      vars: { tail: a.tail },
      tvars: { type: type.name },
    });
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Catalogue helpers for the UI
// ---------------------------------------------------------------------------

export interface CatalogueEntry<T> {
  def: T;
  owned: number;
  onOrder: number;
  locked: boolean;
  check: PurchaseCheck;
}

export function aircraftCatalogue(state: GameState): CatalogueEntry<
  (typeof AIRCRAFT_TYPES)[number]
>[] {
  return AIRCRAFT_TYPES.map((def) => ({
    def,
    owned: state.aircraft.filter((a) => a.typeId === def.id).length,
    onOrder: state.deliveries.filter((d) => d.kind === 'aircraft' && d.refId === def.id).length,
    locked: state.prestige < def.minPrestige,
    check: canBuyAircraft(state, def.id),
  }));
}

export function equipmentCatalogue(state: GameState): CatalogueEntry<
  (typeof EQUIPMENT)[number]
>[] {
  return EQUIPMENT.map((def) => ({
    def,
    owned: ownedCount(state, def.id),
    onOrder: state.deliveries.filter((d) => d.kind === 'equipment' && d.refId === def.id).length,
    locked: state.prestige < def.minPrestige,
    check: canBuyEquipment(state, def.id),
  }));
}

export function pendingDeliveries(state: GameState): (Delivery & { name: string; daysLeft: number })[] {
  return state.deliveries
    .slice()
    .sort((a, b) => a.arrivesDay - b.arrivesDay)
    .map((d) => ({
      ...d,
      name: d.kind === 'aircraft' ? aircraftType(d.refId).name : equipmentDef(d.refId).name,
      daysLeft: Math.max(0, d.arrivesDay - state.day),
    }));
}

/** Total book value of the wing, for the fleet summary. */
export function wingValue(state: GameState): number {
  return state.aircraft.reduce((s, a) => s + aircraftType(a.typeId).costCredits, 0);
}

export function clampEquipment(state: GameState): void {
  for (const def of EQUIPMENT) {
    const owned = state.equipment[def.id];
    if (owned !== undefined) {
      state.equipment[def.id] = clamp(Math.floor(owned), 0, def.max);
    }
  }
}
