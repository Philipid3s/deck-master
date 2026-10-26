import { clamp } from './rng';
import { seatFactor } from './councilEffects';
import type { Aircraft, AircraftDuty, GameState, LogNote } from './types';
import { FLYING_DUTIES } from './types';
import { DUTIES_BY_ID, aircraftType, typeSuitability } from '../data/aircraft';
import { missionDef } from '../data/missions';
import { aircraftReadiness, isMissionCapable, relocateAircraft } from './aircraft';
import { effectiveness, isAvailable } from './crew';
import {
  aircrewWarnings,
  crewFactor,
  fillVacantSeats,
  isAircrew,
  isCrewed,
} from './aircrew';
import { equipmentBonus } from './equipmentEffects';
import { isOnStation } from './status';

/**
 * The daily air tasking order.
 *
 * This is the decision that decides whether a mission is achieved. Readiness
 * says what the ship *could* do; the tasking order says what it is actually
 * doing today, and only the right airframes on the right duty move the
 * mission forward.
 */

export interface DutyLine {
  duty: AircraftDuty;
  assigned: number;
  flying: number;
  /** Weighted contribution this duty makes toward the current mission. */
  contribution: number;
  /** How much this duty counts for the active mission, 0 when irrelevant. */
  weight: number;
}

export interface TaskingSummary {
  lines: DutyLine[];
  /** Sorties the deck can actually turn today, given crew and equipment. */
  sortieCapacity: number;
  /** Airframes tasked to fly that are genuinely able to. */
  flyable: number;
  /** Tasked to fly but not mission capable — these do not launch. */
  unableToFly: number;
  /** Tasked to fly, able to, but with no fit pilot in the seat. */
  uncrewed: number;
  grounded: number;
  contribution: number;
  required: number;
  /** 0..1.25. The primary multiplier on daily mission progress. */
  ratio: number;
  capacityLimited: boolean;
  alertCount: number;
  /** Multipliers the support duties put on the other sorties today. */
  tankerBoost: number;
  escortBoost: number;
  /** A helicopter is up as plane guard. */
  planeGuard: boolean;
  warnings: LogNote[];
}

/**
 * How many sorties the ship can turn in a day. Deck and Air departments do
 * the launching and recovering, so their effective output is the ceiling —
 * a hangar full of ready jets is worthless without people to move them.
 */
export function sortieCapacity(state: GameState): number {
  // Aircrew fly the aircraft; they do not move them. Launching and recovering
  // is the deck and air-operations people, so a squadron full of rested
  // pilots does not raise the number of cycles the deck can turn.
  const deckCrew = state.crew.filter(
    (c) =>
      (c.department === 'DECK' || c.department === 'AIR') && !isAircrew(c) && isAvailable(c),
  );
  const output = deckCrew.reduce((s, c) => s + effectiveness(c), 0);
  const tempoFactor = { low: 0.6, normal: 1.0, high: 1.25, maximum: 1.45 }[state.tempo];

  // Catapults and arresting gear condition cap the cycle too.
  const deckRooms = ['d1-catapult', 'd1-landing', 'd1-catcontrol'];
  const deckCondition =
    deckRooms.reduce((s, id) => s + (state.rooms[id]?.condition ?? 100), 0) / deckRooms.length;

  // Handling equipment adds directly to how many airframes the deck can move.
  const equipmentSorties = equipmentBonus(state, 'sortieCapacity');

  return Math.max(
    2,
    Math.round(
      output * 0.9 * tempoFactor * (0.6 + (deckCondition / 100) * 0.5) * (1 + 0.1 * seatFactor(state, 'airboss')) +
        equipmentSorties,
    ),
  );
}

// ---------------------------------------------------------------------------
// Deck alert
// ---------------------------------------------------------------------------

/**
 * Launch positions an alert airframe can hold: the two bow catapults and two
 * spots behind them. Deck alert means ready to go at five minutes' notice,
 * and there are only so many places on the deck to sit at five minutes.
 */
export const ALERT_SPOTS = 4;
export const ALERT_MIN_FUEL = 60;
export const ALERT_MIN_WEAPONS = 50;

/** Why an airframe tasked to deck alert is not actually ready to launch. */
export type AlertProblem = 'notcapable' | 'hangar' | 'crew' | 'fuel' | 'weapons' | 'nospot';

export const ALERT_PROBLEM_LABELS: Record<AlertProblem, string> = {
  notcapable: 'not mission capable',
  hangar: 'in the hangar',
  crew: 'no fit crew in the seats',
  fuel: 'low on fuel',
  weapons: 'not armed',
  nospot: 'no launch spot free',
};

/** Roles that sit alert armed: the fighters and the jammers. */
function armedRole(a: Aircraft): boolean {
  const role = aircraftType(a.typeId).role;
  return role === 'fighter' || role === 'ew';
}

/**
 * What keeps one airframe from standing a real deck alert, launch spots
 * aside: it must be fit to fly, up on the flight deck, crewed, fuelled and,
 * for the armed roles, armed.
 */
export function alertProblem(state: GameState, a: Aircraft): Exclude<AlertProblem, 'nospot'> | null {
  if (!isMissionCapable(a)) return 'notcapable';
  if (a.deck !== 1) return 'hangar';
  if (!isCrewed(state, a)) return 'crew';
  if (a.fuel < ALERT_MIN_FUEL) return 'fuel';
  if (armedRole(a) && a.weapons < ALERT_MIN_WEAPONS) return 'weapons';
  return null;
}

export interface AlertBoard {
  /** Standing a real alert, at most ALERT_SPOTS. */
  ready: Aircraft[];
  /** Tasked to alert but not ready, and why. */
  standingBy: { a: Aircraft; problem: AlertProblem }[];
  spots: number;
}

/**
 * The deck alert as it actually stands: of the airframes tasked to it, the
 * ones that qualify take the launch spots — armed roles first, then the
 * readiest — and the rest stand by.
 */
export function alertBoard(state: GameState): AlertBoard {
  const tasked = state.aircraft.filter((a) => a.duty === 'alert');
  const standingBy: { a: Aircraft; problem: AlertProblem }[] = [];
  const qualified: Aircraft[] = [];
  for (const a of tasked) {
    const problem = alertProblem(state, a);
    if (problem) standingBy.push({ a, problem });
    else qualified.push(a);
  }
  qualified.sort(
    (x, y) => Number(armedRole(y)) - Number(armedRole(x)) || aircraftReadiness(y) - aircraftReadiness(x),
  );
  const ready = qualified.slice(0, ALERT_SPOTS);
  for (const a of qualified.slice(ALERT_SPOTS)) standingBy.push({ a, problem: 'nospot' });
  return { ready, standingBy, spots: ALERT_SPOTS };
}

// ---------------------------------------------------------------------------
// Support duties
// ---------------------------------------------------------------------------

/**
 * What the support duties are worth today: the summed sortie value of the
 * capable, crewed airframes flying each, scaled by how suited they are and
 * by their crews. Support counts whether or not the mission names the duty —
 * it works through the other sorties rather than alongside them.
 */
export function supportValue(state: GameState, duty: AircraftDuty): number {
  let total = 0;
  for (const a of state.aircraft) {
    if (a.duty !== duty || !isMissionCapable(a) || !isCrewed(state, a)) continue;
    const fit = typeSuitability(a.typeId, duty);
    if (fit <= 0) continue;
    total += aircraftType(a.typeId).sortieValue * fit * (aircraftReadiness(a) / 100) * crewFactor(state, a);
  }
  return total;
}

/** Tankers lengthen strike, CAP and recon sorties: up to +25%. */
export function tankerBoost(state: GameState): number {
  return Math.min(0.25, supportValue(state, 'tanker') * 0.09);
}

/** Electronic escort makes strike sorties count for more: up to +30%. */
export function escortBoost(state: GameState): number {
  return Math.min(0.3, supportValue(state, 'escort') * 0.16);
}

/** Whether a helicopter is up as plane guard while the ship flies. */
export function hasPlaneGuard(state: GameState): boolean {
  return supportValue(state, 'planeguard') > 0;
}

const TANKED: AircraftDuty[] = ['strike', 'cap', 'recon'];

/** What one airframe contributes on its current duty, before capacity limits. */
export function aircraftContribution(state: GameState, a: Aircraft): number {
  const duty = a.duty;
  if (!DUTIES_BY_ID[duty].flies) return 0;
  if (!isMissionCapable(a)) return 0;
  if (!state.mission) return 0;
  // Sorties only count for the objective once the ship is in the area.
  if (!isOnStation(state)) return 0;

  const def = missionDef(state.mission.defId);
  const weight = def.dutyWeights[duty] ?? 0;
  if (weight <= 0) return 0;

  const type = aircraftType(a.typeId);
  const fit = typeSuitability(a.typeId, duty);
  if (fit <= 0) return 0;

  // The people in the seats decide what the sortie is actually worth. With no
  // fit commander aboard, the airframe does not launch at all.
  const crew = crewFactor(state, a);
  if (crew <= 0) return 0;

  return type.sortieValue * fit * weight * (aircraftReadiness(a) / 100) * crew;
}

export function computeTasking(state: GameState): TaskingSummary {
  const def = state.mission ? missionDef(state.mission.defId) : null;

  const lines: DutyLine[] = [];
  let flyable = 0;
  let unableToFly = 0;
  let uncrewed = 0;
  let grounded = 0;
  let rawContribution = 0;
  let alertCount = 0;
  const tanker = tankerBoost(state);
  const escort = escortBoost(state);

  for (const duty of Object.keys(DUTIES_BY_ID) as AircraftDuty[]) {
    const onDuty = state.aircraft.filter((a) => a.duty === duty);
    const flies = DUTIES_BY_ID[duty].flies;
    const able = onDuty.filter((a) => isMissionCapable(a));

    if (flies) {
      // Only an airframe with a fit commander aboard occupies a deck cycle.
      const crewed = able.filter((a) => isCrewed(state, a));
      flyable += crewed.length;
      uncrewed += able.length - crewed.length;
      unableToFly += onDuty.length - able.length;
    } else {
      grounded += onDuty.length;
    }

    let contribution = onDuty.reduce((s, a) => s + aircraftContribution(state, a), 0);
    // Support works through these sorties: fuel in the air, and jamming.
    if (TANKED.includes(duty)) contribution *= 1 + tanker;
    if (duty === 'strike') contribution *= 1 + escort;
    rawContribution += contribution;

    lines.push({
      duty,
      assigned: onDuty.length,
      flying: flies ? able.filter((a) => isCrewed(state, a)).length : 0,
      contribution,
      weight: def?.dutyWeights[duty] ?? 0,
    });
  }

  // Only a real alert counts: on deck, crewed, fuelled, armed, on a spot.
  const board = alertBoard(state);
  alertCount = board.ready.length;

  // The deck can only turn so many sorties; anything tasked beyond that does
  // not fly, and the contribution is scaled down proportionally. Airframes
  // sitting alert hold catapults and launch spots: every two cost a cycle.
  const capacity = Math.max(2, sortieCapacity(state) - Math.floor(alertCount / 2));
  const capacityLimited = flyable > capacity;
  const capacityFactor = capacityLimited ? capacity / Math.max(1, flyable) : 1;
  const contribution = rawContribution * capacityFactor;

  const required = def?.sortiesRequired ?? 0;
  const ratio = required <= 0 ? 0 : clamp(contribution / required, 0, 1.25);

  const warnings: LogNote[] = [];
  if (unableToFly > 0) {
    warnings.push({
      key: '{n} tasked airframes are not mission capable and will not launch',
      vars: { n: unableToFly },
    });
  }
  if (uncrewed > 0) {
    warnings.push({
      key:
        uncrewed === 1
          ? '1 tasked airframe has no pilot in the seat and will not launch'
          : '{n} tasked airframes have no pilot in the seat and will not launch',
      vars: { n: uncrewed },
    });
  }
  if (capacityLimited) {
    warnings.push({
      key: 'Deck can turn {capacity} sorties; {tasked} are tasked to fly',
      vars: { capacity, tasked: flyable },
    });
  }
  if (board.standingBy.length > 0) {
    const counts = new Map<AlertProblem, number>();
    for (const s of board.standingBy) counts.set(s.problem, (counts.get(s.problem) ?? 0) + 1);
    const [problem] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]!;
    warnings.push({
      key: '{n} airframes on alert are not ready to launch — mostly {reason}',
      vars: { n: board.standingBy.length },
      tvars: { reason: ALERT_PROBLEM_LABELS[problem] },
    });
  }
  // Work-ups on the way out wear the crews they fly. Flying the few
  // airframes the operation depends on is a trap worth naming.
  if (state.status === 'outbound' && def) {
    const key = keyAssets(state);
    const tiring = state.aircraft.filter((a) => a.duty === 'training' && key.ids.has(a.id)).length;
    if (tiring > 0 && key.duty) {
      warnings.push({
        key: '{n} airframes in work-ups are ones {title} depends on for {duty} — their crews may arrive tired',
        vars: { n: tiring },
        tvars: { title: def.title, duty: DUTIES_BY_ID[key.duty].name },
      });
    }
  }

  const planeGuard = hasPlaneGuard(state);
  const combatFlyers = state.aircraft.filter(
    (a) => a.duty !== 'planeguard' && DUTIES_BY_ID[a.duty].flies && isMissionCapable(a) && isCrewed(state, a),
  ).length;
  if (combatFlyers > 0 && !planeGuard) {
    warnings.push({
      key: 'No plane guard airborne: {n} sorties fly without a helicopter ready to pull aircrew out of the water',
      vars: { n: combatFlyers },
    });
  }
  warnings.push(...aircrewWarnings(state));
  // Only worth saying on station: on passage nothing counts anyway, and the
  // tasking panel explains that instead.
  if (def && isOnStation(state) && contribution < required * 0.6) {
    warnings.push({
      key: 'Tasking falls well short of what {title} needs today',
      tvars: { title: def.title },
    });
  }

  return {
    lines,
    sortieCapacity: capacity,
    flyable,
    unableToFly,
    uncrewed,
    grounded,
    contribution,
    required,
    ratio,
    capacityLimited,
    alertCount,
    tankerBoost: tanker,
    escortBoost: escort,
    planeGuard,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export function setDuty(state: GameState, aircraftId: string, duty: AircraftDuty): boolean {
  const a = state.aircraft.find((x) => x.id === aircraftId);
  if (!a) return false;
  if (a.state === 'damaged' && DUTIES_BY_ID[duty].flies) return false;
  a.duty = duty;
  // Deck alert is stood on the flight deck: bring it up if a spot is free.
  if (duty === 'alert' && a.deck !== 1) relocateAircraft(state, a, 1);
  return true;
}

/** The duty this airframe is best at for the current mission. */
export function bestDutyFor(state: GameState, a: Aircraft): AircraftDuty {
  if (!isMissionCapable(a)) {
    return state.workOrders.some((w) => w.aircraftId === a.id) ? 'maintenance' : 'standdown';
  }
  if (!state.mission) return 'alert';

  const def = missionDef(state.mission.defId);

  let best: AircraftDuty = 'alert';
  let bestScore = 0;
  for (const duty of FLYING_DUTIES) {
    const score = (def.dutyWeights[duty] ?? 0) * typeSuitability(a.typeId, duty);
    if (score > bestScore) {
      bestScore = score;
      best = duty;
    }
  }
  return bestScore > 0 ? best : 'alert';
}

/**
 * Fill the tasking order automatically: airframes needing work go to the
 * shops, the rest take the duty they are best at, and once the mission's
 * requirement is met the remainder sit on alert rather than burning hours.
 */
export function autoAssign(state: GameState): void {
  // An automatic tasking order also mans the aircraft: tasking an airframe
  // nobody is going to fly is never what the player meant. Only the empty
  // seats are filled — a crew the player posted by hand stays put.
  fillVacantSeats(state);

  // Anything with open work orders belongs to the shops; everything else
  // starts the day stood down, and is given work below.
  for (const a of state.aircraft) {
    const hasOrders = state.workOrders.some((w) => w.aircraftId === a.id);
    a.duty = hasOrders || a.state === 'damaged' ? 'maintenance' : 'standdown';
  }

  if (!state.mission) return;
  // On passage nothing counts toward the objective: an automatic order
  // rests the wing rather than burning hours and crews for nothing. Work-up
  // training is a deliberate choice — see `trainOnPassage`.
  if (state.status === 'outbound' || state.status === 'inbound') return;
  const def = missionDef(state.mission.defId);

  // Rank the available airframes by how much they would contribute, then
  // task them until the requirement is covered.
  const available = state.aircraft.filter(
    (a) => a.duty === 'standdown' && isMissionCapable(a) && isCrewed(state, a),
  );

  const scored = available
    .map((a) => {
      const duty = bestDutyFor(state, a);
      const type = aircraftType(a.typeId);
      const value =
        type.sortieValue *
        typeSuitability(a.typeId, duty) *
        (def.dutyWeights[duty] ?? 0) *
        (aircraftReadiness(a) / 100) *
        crewFactor(state, a);
      return { a, duty, value };
    })
    .filter((x) => x.value > 0)
    .sort((p, q) => q.value - p.value);

  const capacity = sortieCapacity(state);
  let total = 0;
  let flying = 0;

  // A submarine threat needs someone hunting it, whatever else covers the
  // requirement: the best anti-submarine airframe goes first.
  if ((def.dutyWeights.asw ?? 0) > 0) {
    const hunter = scored
      .filter((x) => typeSuitability(x.a.typeId, 'asw') >= 0.6)
      .sort((x, y) => typeSuitability(y.a.typeId, 'asw') - typeSuitability(x.a.typeId, 'asw'))[0];
    if (hunter) {
      hunter.a.duty = 'asw';
      total += aircraftContribution(state, hunter.a);
      flying++;
      scored.splice(scored.indexOf(hunter), 1);
    }
  }

  for (const entry of scored) {
    if (total >= def.sortiesRequired || flying >= capacity) break;
    entry.a.duty = entry.duty;
    total += entry.value;
    flying++;
  }

  flying += layOnSupport(state, capacity - flying);
  layOnDeckAlert(state);
}

/**
 * The support a sensible tasking order adds once the mission is covered: a
 * plane guard whenever anything flies, an electronic escort when strike is
 * flown, a tanker when strike, CAP or recon is flown. Each takes a deck
 * cycle, so only as far as the deck allows. Returns how many were tasked.
 */
export function layOnSupport(state: GameState, room: number): number {
  let used = 0;
  const flies = (d: AircraftDuty) => state.aircraft.some((a) => a.duty === d);
  const pick = (duty: AircraftDuty): boolean => {
    if (used >= room) return false;
    const best = state.aircraft
      .filter((a) => a.duty === 'standdown' && isMissionCapable(a) && isCrewed(state, a))
      .map((a) => ({ a, fit: typeSuitability(a.typeId, duty) }))
      .filter((x) => x.fit > 0)
      .sort((x, y) => y.fit - x.fit || aircraftReadiness(y.a) - aircraftReadiness(x.a))[0];
    if (!best) return false;
    best.a.duty = duty;
    used++;
    return true;
  };
  const anyFlying = state.aircraft.some((a) => DUTIES_BY_ID[a.duty].flies);
  if (anyFlying && !flies('planeguard')) pick('planeguard');
  if (flies('strike') && !flies('escort')) pick('escort');
  if (TANKED.some(flies) && !flies('tanker')) pick('tanker');
  return used;
}

/**
 * Put a real deck alert on the launch spots from the airframes left over:
 * armed roles first, brought up from the hangar if there is room on deck.
 * Only airframes that would actually qualify are tasked.
 */
export function layOnDeckAlert(state: GameState): number {
  const idle = state.aircraft
    .filter((a) => a.duty === 'standdown' && isMissionCapable(a) && isCrewed(state, a))
    .sort(
      (x, y) =>
        Number(armedRole(y)) - Number(armedRole(x)) ||
        Number(y.deck === 1) - Number(x.deck === 1) ||
        aircraftReadiness(y) - aircraftReadiness(x),
    );
  let posted = alertBoard(state).ready.length;
  for (const a of idle) {
    if (posted >= ALERT_SPOTS) break;
    if (a.deck !== 1 && !relocateAircraft(state, a, 1)) continue;
    if (alertProblem(state, a)) continue;
    a.duty = 'alert';
    posted++;
  }
  return posted;
}

/** How few airframes able to fly a key duty make each of them precious. */
const SCARCE = 4;

/**
 * The airframes the operation in hand depends on: for each duty it leans on
 * (weight 0.5 or more), the capable, crewed airframes suited to it — when
 * there are only a handful. Three helicopters carrying a relief operation
 * are key assets; twelve fighters on CAP are not. Their crews are the ones
 * not to wear out on the way there.
 */
export function keyAssets(state: GameState): { ids: Set<string>; duty: AircraftDuty | null } {
  const ids = new Set<string>();
  if (!state.mission) return { ids, duty: null };
  const def = missionDef(state.mission.defId);
  let duty: AircraftDuty | null = null;
  const keys = (Object.entries(def.dutyWeights) as [AircraftDuty, number][])
    .filter(([, w]) => w >= 0.5)
    .sort((a, b) => b[1] - a[1]);
  for (const [d] of keys) {
    const able = state.aircraft.filter(
      (a) => isMissionCapable(a) && isCrewed(state, a) && typeSuitability(a.typeId, d) >= 0.6,
    );
    if (able.length > 0 && able.length <= SCARCE) {
      for (const a of able) ids.add(a.id);
      duty ??= d;
    }
  }
  return { ids, duty };
}

/**
 * Work-ups on the passage out: task every capable, crewed airframe the deck
 * can turn to training sorties — except the key assets the operation will
 * depend on, whose crews should arrive rested. They rehearse the operation and bank
 * progress for arrival (see `PREP_CAP` in simulation.ts) at the price of
 * aircrew fatigue and airframe hours. Returns how many were tasked.
 */
export function trainOnPassage(state: GameState): number {
  fillVacantSeats(state);
  const capacity = sortieCapacity(state);
  const spared = keyAssets(state).ids;
  let tasked = 0;
  for (const a of state.aircraft) {
    if (a.duty === 'maintenance' || a.state === 'damaged') continue;
    if (spared.has(a.id)) {
      if (DUTIES_BY_ID[a.duty].flies) a.duty = 'standdown';
      continue;
    }
    if (tasked < capacity && isMissionCapable(a) && isCrewed(state, a)) {
      a.duty = 'training';
      tasked++;
    } else if (DUTIES_BY_ID[a.duty].flies) {
      a.duty = 'standdown';
    }
  }
  return tasked;
}

/** Applied when a campaign starts or a mission is accepted. */
export function initialiseDuties(state: GameState): void {
  for (const a of state.aircraft) {
    const hasOrders = state.workOrders.some((w) => w.aircraftId === a.id);
    a.duty = hasOrders || a.state === 'damaged' ? 'maintenance' : 'standdown';
  }
}

export function dutyCounts(state: GameState): Record<AircraftDuty, number> {
  const out = {} as Record<AircraftDuty, number>;
  for (const duty of Object.keys(DUTIES_BY_ID) as AircraftDuty[]) out[duty] = 0;
  for (const a of state.aircraft) out[a.duty] = (out[a.duty] ?? 0) + 1;
  return out;
}
