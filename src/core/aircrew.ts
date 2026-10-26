import { clamp, Rng } from './rng';
import type { Aircraft, CrewMember, GameState, LogNote, SpecialtyId } from './types';
import { aircraftType, STARTING_WING } from '../data/aircraft';
import { createCrewMember, effectiveness, isAvailable, relevantSkill } from './crew';
import { aircraftReadiness, isMissionCapable } from './aircraft';


/**
 * Named aircrew.
 *
 * Every airframe has `crewRequired` seats. Seat 0 is the aircraft commander
 * and must be a pilot; the rest are mission crew. Who sits in those seats is
 * a real decision: their skill scales what the sortie is worth, and flying
 * them day after day wears them out until the wing stops performing.
 *
 * The seat array is always `crewRequired` long, with '' for a vacant seat, so
 * a seat index means the same thing to the simulation and to the UI.
 */

/** Which trade belongs in a given seat. Seat 0 is always flown by a pilot. */
export function seatSpecialty(seat: number): SpecialtyId {
  return seat === 0 ? 'pilot' : 'aircrew';
}

export function isAircrew(crew: CrewMember): boolean {
  return crew.primary === 'pilot' || crew.primary === 'aircrew';
}

/**
 * Fit to fly today.
 *
 * Stricter than `isAvailable`, which counts a resting crew member as still
 * about the ship: a crew stood down to sleep is off the flight schedule, and
 * that is exactly the lever the player pulls to rotate a tired squadron.
 */
export function isFitToFly(crew: CrewMember): boolean {
  return isAvailable(crew) && crew.status !== 'resting';
}

/** Seat 0 is a pilot's job; a pilot may also fill a mission-crew seat. */
export function canFillSeat(crew: CrewMember, seat: number): boolean {
  if (!isAircrew(crew)) return false;
  return seat === 0 ? crew.primary === 'pilot' : true;
}

/** Keeps a seat array exactly as long as the airframe has seats. */
export function normaliseSeats(a: Aircraft): void {
  const seats = aircraftType(a.typeId).crewRequired;
  if (!Array.isArray(a.crewIds)) a.crewIds = [];
  while (a.crewIds.length < seats) a.crewIds.push('');
  if (a.crewIds.length > seats) a.crewIds.length = seats;
}

export function seatCount(a: Aircraft): number {
  return aircraftType(a.typeId).crewRequired;
}

/** The people in the seats, in seat order, skipping vacant seats. */
export function aircrewOf(state: GameState, a: Aircraft): CrewMember[] {
  const out: CrewMember[] = [];
  for (const id of a.crewIds) {
    if (!id) continue;
    const c = state.crew.find((x) => x.id === id);
    if (c) out.push(c);
  }
  return out;
}

export function seatOccupant(state: GameState, a: Aircraft, seat: number): CrewMember | null {
  const id = a.crewIds[seat];
  if (!id) return null;
  return state.crew.find((c) => c.id === id) ?? null;
}

/** The airframe this person is assigned to fly, if any. */
export function assignedAircraft(state: GameState, crewId: string): Aircraft | null {
  return state.aircraft.find((a) => a.crewIds.includes(crewId)) ?? null;
}

export function mannedSeats(a: Aircraft): number {
  return a.crewIds.filter((id) => id !== '').length;
}

/** Seats manned by someone actually fit to fly today. */
export function availableSeats(state: GameState, a: Aircraft): number {
  return aircrewOf(state, a).filter(isFitToFly).length;
}

/** No commander, no launch — the single hard requirement. */
export function hasCommander(state: GameState, a: Aircraft): boolean {
  const pilot = seatOccupant(state, a, 0);
  return pilot !== null && isFitToFly(pilot);
}

/** An airframe is crewed for the day when it has a fit commander aboard. */
export function isCrewed(state: GameState, a: Aircraft): boolean {
  // An unmanned airframe is flown from a ground station: always crewed.
  if (seatCount(a) === 0) return true;
  return hasCommander(state, a);
}

// ---------------------------------------------------------------------------
// Crew quality
// ---------------------------------------------------------------------------

/**
 * How good today's crew is, 0..~1.1.
 *
 * The commander carries most of the weight — a single-seat fighter is all
 * pilot — and the mission crew share the rest, so an E-5 flying with three of
 * its five seats empty is markedly less use than a full one. Unfit crew count
 * as empty seats: standing an exhausted pilot down really does cost the
 * sortie.
 */
export function crewQuality(state: GameState, a: Aircraft): number {
  const seats = seatCount(a);
  if (seats <= 0) return 0;

  const pilot = seatOccupant(state, a, 0);
  if (!pilot || !isFitToFly(pilot)) return 0;

  const pilotWeight = seats === 1 ? 1 : 0.6;
  let q = effectiveness(pilot, 'pilot') * pilotWeight;

  if (seats > 1) {
    const perSeat = (1 - pilotWeight) / (seats - 1);
    for (let seat = 1; seat < seats; seat++) {
      const c = seatOccupant(state, a, seat);
      if (c && isFitToFly(c)) q += effectiveness(c, seatSpecialty(seat)) * perSeat;
    }
  }
  return q;
}

/**
 * A capable, rested crew — the standard the wing is expected to hold — scores
 * about this. It is the reference the multiplier is centred on.
 */
export const REFERENCE_QUALITY = 0.95;

/** The most and least a crew can be worth, whatever they are. */
export const CREW_FACTOR_CAP = 1.2;
export const CREW_FACTOR_FLOOR = 0.35;

/**
 * The multiplier crew quality puts on a sortie's worth.
 *
 * Centred so a crew holding the standard is exactly neutral: the wing's
 * output still comes from airframes and tasking, and who is flying swings it
 * by roughly -35%/+20%. Reaching the cap takes an exceptional crew that is
 * also rested and in good spirits — which is the point. An unmanned airframe
 * returns 0 and does not launch at all.
 */
export function crewFactor(state: GameState, a: Aircraft): number {
  // Unmanned: no crew to be good or tired, so exactly the type's own worth.
  if (seatCount(a) === 0) return 1;
  const q = crewQuality(state, a);
  if (q <= 0) return 0;
  return clamp(0.5 + 0.5 * (q / REFERENCE_QUALITY), CREW_FACTOR_FLOOR, CREW_FACTOR_CAP);
}

/** Aircrew fatigue drags the whole wing down; surfaced in the ATO panel. */
export function wingCrewReadiness(state: GameState): number {
  const crews = state.crew.filter(isAircrew);
  if (crews.length === 0) return 0;
  const fit = crews.filter(isFitToFly);
  if (fit.length === 0) return 0;
  const mean = fit.reduce((s, c) => s + effectiveness(c), 0) / fit.length;
  return clamp((fit.length / crews.length) * mean * 85, 0, 100);
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

/**
 * Seat someone in an airframe. A person flies one airframe at a time, so
 * this also lifts them out of wherever they were sitting before.
 */
export function assignAircrew(
  state: GameState,
  aircraftId: string,
  seat: number,
  crewId: string,
): boolean {
  const a = state.aircraft.find((x) => x.id === aircraftId);
  if (!a) return false;
  normaliseSeats(a);
  if (seat < 0 || seat >= a.crewIds.length) return false;

  const crew = state.crew.find((c) => c.id === crewId);
  if (!crew || !canFillSeat(crew, seat)) return false;

  // One seat per person: clear their old one, wherever it was.
  unassignAircrew(state, crewId);
  a.crewIds[seat] = crewId;
  return true;
}

/** Empty one seat. */
export function clearSeat(state: GameState, aircraftId: string, seat: number): boolean {
  const a = state.aircraft.find((x) => x.id === aircraftId);
  if (!a) return false;
  normaliseSeats(a);
  if (seat < 0 || seat >= a.crewIds.length) return false;
  a.crewIds[seat] = '';
  return true;
}

/** Take this person out of whichever seat they hold. */
export function unassignAircrew(state: GameState, crewId: string): void {
  for (const a of state.aircraft) {
    for (let i = 0; i < a.crewIds.length; i++) {
      if (a.crewIds[i] === crewId) a.crewIds[i] = '';
    }
  }
}

/** Aircrew of the right trade who are not already flying something else. */
export function unseatedFor(state: GameState, seat: number): CrewMember[] {
  const seated = new Set(state.aircraft.flatMap((a) => a.crewIds).filter((id) => id !== ''));
  return state.crew.filter((c) => canFillSeat(c, seat) && !seated.has(c.id));
}

/** Drop anyone who has left the ship out of the seats they held. */
export function pruneAircrew(state: GameState): void {
  const alive = new Set(state.crew.map((c) => c.id));
  for (const a of state.aircraft) {
    normaliseSeats(a);
    for (let i = 0; i < a.crewIds.length; i++) {
      if (a.crewIds[i] && !alive.has(a.crewIds[i]!)) a.crewIds[i] = '';
    }
  }
}

/**
 * Fill every seat with the best crew available, best crews to the airframes
 * that matter most. Vacancies are left where there is simply nobody left.
 */
export function autoCrew(state: GameState): void {
  pruneAircrew(state);

  // Mission-capable airframes first, then the most ready ones: the wing's
  // best people belong where they will actually fly.
  const order = state.aircraft.slice().sort((p, q) => {
    const pc = isMissionCapable(p) ? 1 : 0;
    const qc = isMissionCapable(q) ? 1 : 0;
    if (pc !== qc) return qc - pc;
    return aircraftReadiness(q) - aircraftReadiness(p);
  });

  for (const a of order) normaliseSeats(a);
  for (const a of state.aircraft) a.crewIds = a.crewIds.map(() => '');

  const taken = new Set<string>();
  const rank = (c: CrewMember, specialty: SpecialtyId): number =>
    effectiveness(c, specialty) * 100 + relevantSkill(c, specialty);

  for (const a of order) {
    for (let seat = 0; seat < a.crewIds.length; seat++) {
      const specialty = seatSpecialty(seat);
      const pool = state.crew
        .filter((c) => !taken.has(c.id) && canFillSeat(c, seat) && isFitToFly(c))
        .sort((p, q) => rank(q, specialty) - rank(p, specialty));
      const pick = pool[0];
      if (!pick) continue;
      a.crewIds[seat] = pick.id;
      taken.add(pick.id);
    }
  }
}

/** Fill just this airframe's empty seats with the best people going spare. */
export function autoCrewAircraft(state: GameState, aircraftId: string): void {
  const a = state.aircraft.find((x) => x.id === aircraftId);
  if (!a) return;
  normaliseSeats(a);

  for (let seat = 0; seat < a.crewIds.length; seat++) {
    if (a.crewIds[seat]) continue;
    const specialty = seatSpecialty(seat);
    const pool = unseatedFor(state, seat)
      .filter(isFitToFly)
      .sort(
        (p, q) =>
          effectiveness(q, specialty) - effectiveness(p, specialty) ||
          p.fatigue - q.fatigue,
      );
    const pick = pool[0];
    if (pick) a.crewIds[seat] = pick.id;
  }
}

/**
 * Fill the wing's empty seats without disturbing anyone already posted.
 *
 * This is what the tasking order does automatically: a player who has hand
 * picked a crew keeps it, and only the gaps get filled. Re-seating the whole
 * wing is `autoCrew`, and only ever happens when the player asks for it.
 */
export function fillVacantSeats(state: GameState): void {
  pruneAircrew(state);
  const order = state.aircraft.slice().sort((p, q) => {
    const pc = isMissionCapable(p) ? 1 : 0;
    const qc = isMissionCapable(q) ? 1 : 0;
    if (pc !== qc) return qc - pc;
    return aircraftReadiness(q) - aircraftReadiness(p);
  });
  for (const a of order) autoCrewAircraft(state, a.id);
}

/** Warnings for the daily log and the tasking panel. */
export function aircrewWarnings(state: GameState): LogNote[] {
  const notes: LogNote[] = [];
  const flying = state.aircraft.filter((a) => aircraftType(a.typeId).crewRequired > 0);

  // Airframes with nobody in the seat at all are reported by the tasking
  // order itself, which knows which of them were actually tasked to fly.
  const shortCrewed = flying.filter(
    (a) => hasCommander(state, a) && availableSeats(state, a) < seatCount(a),
  ).length;
  if (shortCrewed > 0) {
    notes.push({
      key:
        shortCrewed === 1
          ? '1 airframe is flying short-crewed'
          : '{n} airframes are flying short-crewed',
      vars: { n: shortCrewed },
    });
  }

  // The point of the whole system: worn-out aircrew.
  const worn = state.crew.filter(
    (c) => isAircrew(c) && c.consecutiveFlyingDays >= 5 && c.fatigue > 65,
  );
  for (const c of worn.slice(0, 3)) {
    notes.push({
      key: '{name} has flown {days} days running and is worn out',
      vars: { name: c.name, days: c.consecutiveFlyingDays },
    });
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** Seats the starting air wing has to fill, by trade. */
export function startingSeatDemand(): { pilots: number; aircrew: number } {
  let pilots = 0;
  let aircrew = 0;
  for (const entry of STARTING_WING) {
    const seats = aircraftType(entry.typeId).crewRequired;
    pilots += entry.count;
    aircrew += entry.count * Math.max(0, seats - 1);
  }
  return { pilots, aircrew };
}

/**
 * A spare margin on top of the seats, so the player can rotate a tired crew
 * out instead of grounding the airframe. Without spares, fatigue management
 * would only ever mean losing sorties.
 */
const SPARE_RATIO = 0.18;

/**
 * Aircrew are generated as a pool, not per airframe: pilots are experienced
 * by trade — nobody flies a carrier aircraft as a raw recruit — so their rank
 * and quality floors sit well above the ship's company.
 */
export function generateAircrew(rng: Rng, startId: number): CrewMember[] {
  const demand = startingSeatDemand();
  const pilots = Math.ceil(demand.pilots * (1 + SPARE_RATIO));
  const backseaters = Math.ceil(demand.aircrew * (1 + SPARE_RATIO));

  const out: CrewMember[] = [];
  const used = new Set<string>();
  let n = startId;

  const make = (primary: SpecialtyId, rankIndex: number, quality: number): void => {
    out.push(
      createCrewMember(rng, used, {
        id: `c${String(n).padStart(3, '0')}`,
        primary,
        rankIndex,
        quality,
        day: 1,
      }),
    );
    n++;
  };

  for (let i = 0; i < pilots; i++) {
    // A squadron is a few senior aviators over a majority of line pilots.
    const roll = rng.float();
    const rankIndex = roll < 0.12 ? 6 : roll < 0.34 ? 5 : roll < 0.66 ? 4 : 3;
    make('pilot', rankIndex, clamp(rng.statRoll(52 + rankIndex * 5, 9, 30, 94), 30, 94));
  }
  for (let i = 0; i < backseaters; i++) {
    const roll = rng.float();
    const rankIndex = roll < 0.1 ? 5 : roll < 0.3 ? 4 : roll < 0.62 ? 3 : 2;
    make('aircrew', rankIndex, clamp(rng.statRoll(44 + rankIndex * 5, 10, 24, 90), 24, 90));
  }
  return out;
}

/** Called once at campaign start, after the wing and the company exist. */
export function assignInitialAircrew(state: GameState): void {
  autoCrew(state);
}
