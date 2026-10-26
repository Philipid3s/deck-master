import { clamp, Rng } from './rng';
import type {
  Aircraft,
  AircraftState,
  GameState,
  LogNote,
  SpecialtyId,
  WorkOrder,
} from './types';
import { DUTIES_BY_ID, aircraftType, STARTING_WING } from '../data/aircraft';
import { effectiveness, isAvailable, mistakeChance, relevantSkill } from './crew';
import { aircrewOf, isCrewed, isFitToFly } from './aircrew';
import { equipmentBonus } from './equipmentEffects';
import { isInPort } from './status';

/** Parking bays: fixed spots on the flight deck and in the hangar. */
const FLIGHT_SPOTS: { x: number; y: number }[] = [];
const HANGAR_SPOTS: { x: number; y: number }[] = [];
// One staggered row along the starboard side, packed wingtip to wingtip the
// way a real deck is spotted; a second row would hang over the deck edge.
for (let i = 0; i < 12; i++) {
  FLIGHT_SPOTS.push({ x: 7 + i * 8, y: 16 + (i % 2) });
}
for (let i = 0; i < 14; i++) {
  HANGAR_SPOTS.push({ x: 12 + (i % 7) * 13, y: i < 7 ? 4 : 17 });
}

export function aircraftReadiness(a: Aircraft): number {
  const sys = (a.systems.engine + a.systems.avionics + a.systems.airframe) / 3;
  return clamp(sys * 0.72 + a.fuel * 0.18 + a.weapons * 0.10, 0, 100);
}

/**
 * An aircraft can fly when nothing critical is below the threshold — a plain
 * average would let a dead avionics suite hide behind a healthy airframe
 * (spec section 39).
 */
export function isMissionCapable(a: Aircraft): boolean {
  if (a.state === 'damaged' || a.state === 'maintenance') return false;
  return (
    a.systems.engine >= 60 &&
    a.systems.avionics >= 55 &&
    a.systems.airframe >= 60 &&
    a.fuel >= 25
  );
}

export function aircraftStatusText(a: Aircraft): string {
  if (a.state === 'damaged') return 'DAMAGED';
  if (a.state === 'maintenance') return 'IN MAINTENANCE';
  if (a.state === 'airborne') return 'AIRBORNE';
  if (!isMissionCapable(a)) return 'NOT READY';
  return 'READY';
}

/** The system that is holding an aircraft back, for the UI. */
export function limitingSystem(a: Aircraft): string | null {
  const checks: [string, number, number][] = [
    ['Engine', a.systems.engine, 60],
    ['Avionics', a.systems.avionics, 55],
    ['Airframe', a.systems.airframe, 60],
    ['Fuel', a.fuel, 25],
  ];
  const failing = checks.filter(([, v, min]) => v < min);
  if (failing.length === 0) return null;
  failing.sort((p, q) => p[1] / p[2] - q[1] / q[2]);
  return failing[0]![0];
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateAirWing(rng: Rng): Aircraft[] {
  const wing: Aircraft[] = [];
  let n = 0;
  let flightIdx = 0;
  let hangarIdx = 0;

  for (const entry of STARTING_WING) {
    const type = aircraftType(entry.typeId);
    for (let i = 0; i < entry.count; i++) {
      // Side numbers run up from the squadron's block, as they do for real.
      const modex = entry.modex + i + 1;
      // Roughly half the wing starts on the flight deck, half in the hangar.
      const onFlightDeck = flightIdx < FLIGHT_SPOTS.length && n % 2 === 0;
      const spot = onFlightDeck
        ? FLIGHT_SPOTS[flightIdx++]!
        : HANGAR_SPOTS[hangarIdx++ % HANGAR_SPOTS.length]!;

      const condition = () => rng.statRoll(84, 12, 40, 100);
      const a: Aircraft = {
        id: `a${String(n + 1).padStart(3, '0')}`,
        tail: String(modex),
        typeId: entry.typeId,
        squadron: entry.squadron,
        state: 'ready',
        deck: onFlightDeck ? 1 : 2,
        x: spot.x,
        y: spot.y,
        systems: {
          engine: condition(),
          avionics: condition(),
          airframe: condition(),
        },
        fuel: rng.statRoll(78, 15, 30, 100),
        weapons: rng.statRoll(70, 22, 0, 100),
        flightHours: rng.int(200, 2400),
        sortiesToday: 0,
        duty: 'standdown',
        // Seats are created empty; `assignInitialAircrew` mans them once the
        // ship's company exists.
        crewIds: new Array<string>(type.crewRequired).fill(''),
      };
      a.state = isMissionCapable(a) ? 'ready' : 'stored';
      wing.push(a);
      n++;
    }
  }
  return wing;
}

// ---------------------------------------------------------------------------
// Work orders
// ---------------------------------------------------------------------------

/** The three systems that live on `Aircraft.systems`; weapons is tracked separately. */
type RepairableSystem = 'engine' | 'avionics' | 'airframe';

const SYSTEM_SPECIALTY: Record<WorkOrder['system'], SpecialtyId> = {
  engine: 'engine',
  avionics: 'avionics',
  airframe: 'airframe',
  weapons: 'weapons',
};

const SYSTEM_ROOM: Record<WorkOrder['system'], string> = {
  engine: 'd2-engineshop',
  avionics: 'd2-avionics',
  airframe: 'd2-airframe',
  weapons: 'd2-ordnance',
};

export function openWorkOrder(
  state: GameState,
  aircraftId: string,
  system: WorkOrder['system'],
  severity: number,
): WorkOrder {
  state.workOrderSeq++;
  const order: WorkOrder = {
    id: `w${String(state.workOrderSeq).padStart(4, '0')}`,
    aircraftId,
    system,
    specialty: SYSTEM_SPECIALTY[system],
    roomId: SYSTEM_ROOM[system],
    // Labour is measured in effective person-days: severity 1 is a few hours
    // of a good technician, severity 3 is most of a week for a whole shop.
    labourRequired: 1.6 + severity * 2.4,
    labourDone: 0,
    partsRequired: severity,
    partsDrawn: false,
    severity,
    openedDay: state.day,
  };
  state.workOrders.push(order);
  const a = state.aircraft.find((x) => x.id === aircraftId);
  if (a && a.state !== 'damaged') a.state = 'maintenance';
  return order;
}

const SYSTEM_NAMES: Record<WorkOrder['system'], string> = {
  engine: 'Engine',
  avionics: 'Avionics',
  airframe: 'Airframe',
  weapons: 'Weapons',
};

/** Deferred label so the work order reads in whichever language is active. */
export function workOrderNote(order: WorkOrder): LogNote {
  const key =
    order.severity >= 3
      ? '{system} major fault'
      : order.severity === 2
        ? '{system} fault'
        : '{system} discrepancy';
  return { key, tvars: { system: SYSTEM_NAMES[order.system] } };
}

/**
 * Apply one day of maintenance labour. Crew assigned to a shop work the
 * orders queued there; higher skill both does more work and is less likely
 * to make it worse (spec section 40).
 */
export function runMaintenance(
  state: GameState,
  rng: Rng,
): { completed: number; botched: number } {
  let completed = 0;
  let botched = 0;

  // Group available crew by the room they are assigned to.
  const byRoom = new Map<string, typeof state.crew>();
  for (const c of state.crew) {
    if (!isAvailable(c)) continue;
    const list = byRoom.get(c.assignmentRoomId) ?? [];
    list.push(c);
    byRoom.set(c.assignmentRoomId, list);
  }

  const tempoFactor = { low: 0.75, normal: 1.0, high: 1.2, maximum: 1.35 }[state.tempo];
  // Tooling and ground support equipment lift every shop at once, and
  // alongside the shore establishment lends a hand.
  const equipmentFactor =
    (1 + Math.min(0.5, equipmentBonus(state, 'maintenanceSpeed'))) * (isInPort(state) ? 1.35 : 1);

  for (const [roomId, workers] of byRoom) {
    const orders = state.workOrders
      .filter((w) => w.roomId === roomId)
      .sort((p, q) => q.severity - p.severity || p.openedDay - q.openedDay);
    if (orders.length === 0) continue;

    const upgradeBonus = 1 + ((state.rooms[roomId]?.level ?? 1) - 1) * 0.13;
    // An airframe explicitly released to the shops is worked on properly
    // rather than squeezed between launches.
    const releasedBonus = (order: { aircraftId: string }): number =>
      state.aircraft.find((a) => a.id === order.aircraftId)?.duty === 'maintenance' ? 1.35 : 1;
    const conditionFactor = 0.75 + ((state.rooms[roomId]?.condition ?? 100) / 100) * 0.3;

    // Each worker contributes to the highest-priority order they can reach.
    for (const worker of workers) {
      const order = orders.find((o) => o.labourDone < o.labourRequired);
      if (!order) break;

      // Draw parts on first touch; without them, progress stalls at 50%.
      // A spare module pool aboard stretches the same stores further.
      if (!order.partsDrawn) {
        const drawn =
          order.partsRequired * (1 - Math.min(0.45, equipmentBonus(state, 'partsEfficiency')));
        if (state.supplies.parts >= drawn) {
          state.supplies.parts = clamp(state.supplies.parts - drawn, 0, 100);
          order.partsDrawn = true;
        }
      }
      const partsCap = order.partsDrawn ? order.labourRequired : order.labourRequired * 0.5;
      if (order.labourDone >= partsCap) continue;

      const skillTerm = 0.45 + relevantSkill(worker, order.specialty) / 100;
      const contribution =
        effectiveness(worker, order.specialty) *
        skillTerm *
        tempoFactor *
        upgradeBonus *
        conditionFactor *
        equipmentFactor *
        releasedBonus(order);
      order.labourDone = Math.min(partsCap, order.labourDone + contribution);

      worker.taskNote = {
        key: '{system} work — {tail}',
        vars: { tail: state.aircraft.find((a) => a.id === order.aircraftId)?.tail ?? '' },
        tvars: { system: SYSTEM_NAMES[order.system] },
      };

      // Tired or unskilled hands can set the job back.
      if (rng.chance(mistakeChance(worker) * 0.4)) {
        order.labourDone = Math.max(0, order.labourDone - contribution * 1.6);
        botched++;
      }
    }
  }

  // Close finished orders and restore the aircraft system.
  for (let i = state.workOrders.length - 1; i >= 0; i--) {
    const order = state.workOrders[i]!;
    if (order.labourDone < order.labourRequired) continue;
    const a = state.aircraft.find((x) => x.id === order.aircraftId);
    if (a) {
      if (order.system === 'weapons') {
        a.weapons = clamp(a.weapons + 40 + order.severity * 12, 0, 100);
      } else {
        a.systems[order.system] = clamp(
          a.systems[order.system] + 34 + order.severity * 14,
          0,
          100,
        );
      }
    }
    state.workOrders.splice(i, 1);
    completed++;
  }

  // Any aircraft with no remaining orders comes out of maintenance.
  for (const a of state.aircraft) {
    const hasOrders = state.workOrders.some((w) => w.aircraftId === a.id);
    if (!hasOrders && a.state === 'maintenance') {
      a.state = isMissionCapable(a) ? 'ready' : 'stored';
    }
  }

  return { completed, botched };
}

/**
 * Daily wear from flight operations. Wear scales with tempo, so a maximum
 * tempo week is paid for in the following week's work-order backlog.
 */
export function runFlightOperations(
  state: GameState,
  rng: Rng,
  sortieCapacity: number,
): {
  launched: number;
  recovered: number;
  opened: number;
  flownBy: string[];
  training: number;
  /** The airframes that flew today, and the ones that came back needing work. */
  flown: string[];
  damaged: string[];
} {
  const tempoWear = { low: 0.6, normal: 1.0, high: 1.25, maximum: 1.5 }[state.tempo];

  let launched = 0;
  let opened = 0;
  // Who actually flew today, so the crew day can charge them for it.
  const flownBy: string[] = [];

  // Only airframes tasked to fly, able to, and with a fit crew aboard
  // generate sorties. The deck can turn a limited number; the rest stay
  // chained.
  const tasked = state.aircraft.filter(
    (a) => DUTIES_BY_ID[a.duty].flies && isMissionCapable(a) && isCrewed(state, a),
  );
  const flying = tasked.slice(0, Math.max(0, sortieCapacity));

  // Counted here: `sortiesToday` is cleared overnight before the caller
  // could read it.
  let training = 0;
  const flown: string[] = [];
  const damaged: string[] = [];
  for (const a of flying) {
    const type = aircraftType(a.typeId);
    launched++;
    flown.push(a.id);
    const ordersBefore = state.workOrders.length;
    if (a.duty === 'training') training++;
    a.sortiesToday = 1;
    a.flightHours += 3;
    for (const c of aircrewOf(state, a)) {
      if (isFitToFly(c)) {
        flownBy.push(c.id);
        c.sortiesFlown++;
      }
    }
    a.fuel = clamp(a.fuel - type.fuelBurn, 0, 100);

    // Only armed duties expend ordnance.
    if (a.weapons > 0 && (a.duty === 'strike' || a.duty === 'cap')) {
      a.weapons = clamp(a.weapons - 6, 0, 100);
    }

    // Wear scales with tempo and with how demanding the duty is.
    const dutyStress: Record<string, number> = {
      strike: 1.25,
      cap: 1.0,
      recon: 0.9,
      lift: 1.1,
      training: 0.8,
    };
    const wearReduction = 1 - Math.min(0.45, equipmentBonus(state, 'aircraftWear'));
    const wear = rng.range(0.8, 2.6) * tempoWear * (dutyStress[a.duty] ?? 1) * wearReduction;
    a.systems.engine = clamp(a.systems.engine - wear, 0, 100);
    a.systems.avionics = clamp(a.systems.avionics - wear * rng.range(0.5, 1.4), 0, 100);
    a.systems.airframe = clamp(a.systems.airframe - wear * rng.range(0.4, 1.0), 0, 100);

    // A discrepancy is written up at a probability that rises with tempo and
    // with how worn the airframe already is.
    const faultChance =
      0.05 * tempoWear * (dutyStress[a.duty] ?? 1) + (100 - aircraftReadiness(a)) * 0.0016;
    if (rng.chance(faultChance)) {
      const system = rng.pick<RepairableSystem>(['engine', 'avionics', 'airframe']);
      const severity = rng.chance(0.16) ? 3 : rng.chance(0.42) ? 2 : 1;
      openWorkOrder(state, a.id, system, severity);
      a.systems[system] = clamp(a.systems[system] - severity * 12, 0, 100);
      opened++;
    }
    if (state.workOrders.length > ordersBefore) damaged.push(a.id);
  }

  // Stood-down airframes get looked over rather than flown.
  for (const a of state.aircraft) {
    if (a.duty === 'standdown' && a.state !== 'damaged') {
      a.systems.airframe = clamp(a.systems.airframe + 0.6, 0, 100);
    }
  }

  // Refuel and rearm from stores overnight.
  const fuelAvailable = state.supplies.fuel;
  for (const a of state.aircraft) {
    a.sortiesToday = 0;
    if (a.state === 'damaged') continue;
    if (a.fuel < 90 && fuelAvailable > 12) {
      a.fuel = clamp(a.fuel + 22, 0, 100);
    }
    if (a.weapons < 80 && state.supplies.ammo > 15 && a.state === 'ready') {
      a.weapons = clamp(a.weapons + 18, 0, 100);
      state.supplies.ammo = clamp(state.supplies.ammo - 0.4, 0, 100);
    }
    if (a.state !== 'maintenance') {
      a.state = isMissionCapable(a) ? 'ready' : 'stored';
    }
  }

  return { launched, recovered: launched, opened, flownBy, training, flown, damaged };
}

/** Damage an aircraft, opening work orders proportional to the damage. */
export function damageAircraft(
  state: GameState,
  rng: Rng,
  count: number,
  amount: number,
): string[] {
  const hit: string[] = [];
  const candidates = rng.shuffle(state.aircraft.filter((a) => a.state !== 'damaged'));
  for (const a of candidates.slice(0, count)) {
    const system = rng.pick<RepairableSystem>(['engine', 'avionics', 'airframe']);
    a.systems[system] = clamp(a.systems[system] - amount, 0, 100);
    const severity = amount >= 28 ? 3 : amount >= 16 ? 2 : 1;
    openWorkOrder(state, a.id, system, severity);
    if (amount >= 40) a.state = 'damaged';
    hit.push(a.tail);
  }
  return hit;
}

export function repairAircraft(state: GameState, rng: Rng, count: number, amount: number): void {
  const candidates = rng.shuffle(
    state.aircraft.filter((a) => aircraftReadiness(a) < 95),
  );
  for (const a of candidates.slice(0, count)) {
    a.systems.engine = clamp(a.systems.engine + amount, 0, 100);
    a.systems.avionics = clamp(a.systems.avionics + amount, 0, 100);
    a.systems.airframe = clamp(a.systems.airframe + amount, 0, 100);
    if (a.state === 'damaged' && aircraftReadiness(a) > 55) a.state = 'stored';
  }
}

export function setAircraftState(a: Aircraft, s: AircraftState): void {
  a.state = s;
}

/** Move an aircraft between the flight deck and the hangar. */
export function relocateAircraft(state: GameState, a: Aircraft, toDeck: 1 | 2): boolean {
  if (a.deck === toDeck) return false;
  const spots = toDeck === 1 ? FLIGHT_SPOTS : HANGAR_SPOTS;
  const taken = new Set(
    state.aircraft.filter((x) => x.deck === toDeck).map((x) => `${x.x},${x.y}`),
  );
  const free = spots.find((s) => !taken.has(`${s.x},${s.y}`));
  if (!free) return false;
  a.deck = toDeck;
  a.x = free.x;
  a.y = free.y;
  return true;
}

export { FLIGHT_SPOTS, HANGAR_SPOTS };
