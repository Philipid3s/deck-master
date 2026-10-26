import { clamp } from './rng';
import type {
  DeptId,
  DepartmentState,
  GameState,
  LogNote,
  ReadinessBreakdown,
  ReadinessDriver,
} from './types';
import { DEPT_IDS } from '../data/specialties';
import { ALL_ROOMS, getRoom } from '../data/decks';
import { effectiveness, isAboardAndFit, isAvailable, supervisionQuality } from './crew';
import { aircraftReadiness, isMissionCapable } from './aircraft';

/** Required headcount per department, used for the workload figure. */
const REQUIRED: Record<DeptId, number> = {
  CMD: 4,
  AIR: 14,
  DECK: 14,
  MAINT: 26,
  OPS: 14,
  ENG: 14,
  MED: 5,
  SUP: 6,
};

/**
 * Department efficiency (spec section 52):
 *
 *   personnel availability x mean relevant skill x leadership
 *   x morale x fatigue x equipment condition
 *
 * Each term is soft-capped so no single factor can drive the result to zero
 * or run away above 100.
 */
export function computeDepartments(state: GameState): Record<string, DepartmentState> {
  const out: Record<string, DepartmentState> = {};

  for (const dept of DEPT_IDS) {
    const members = state.crew.filter((c) => c.department === dept);
    const fit = members.filter(isAboardAndFit);
    const onDuty = members.filter(isAvailable);
    const required = REQUIRED[dept];

    if (members.length === 0) {
      out[dept] = {
        id: dept,
        personnel: 0,
        required,
        workload: 100,
        efficiency: 0,
        readiness: 0,
        morale: 50,
        fatigue: 0,
        condition: 100,
      };
      continue;
    }

    const morale = mean(fit.map((c) => c.morale), 50);
    const fatigue = mean(fit.map((c) => c.fatigue), 0);
    const output = onDuty.reduce((s, c) => s + effectiveness(c), 0);

    // Rooms belonging to this department carry the equipment condition term.
    const rooms = ALL_ROOMS.filter((r) => r.department === dept);
    const condition = mean(
      rooms.map((r) => state.rooms[r.id]?.condition ?? 100),
      100,
    );

    // Supervision: chiefs with weak leadership actively drag their division.
    const supervisors = fit.filter((c) => c.rank >= 4);
    const supervision =
      supervisors.length === 0
        ? -0.25 // an unsupervised division is worse than a badly led one
        : mean(supervisors.map(supervisionQuality), 0);

    const availability = clamp(onDuty.length / Math.max(1, required), 0, 1.15);
    const skillTerm = clamp(output / Math.max(1, onDuty.length), 0, 1.4);
    const leadershipTerm = clamp(1 + supervision * 0.22, 0.7, 1.25);
    const moraleTerm = 0.75 + (morale / 100) * 0.4;
    const fatigueTerm = fatigue <= 40 ? 1 - fatigue * 0.002 : 0.92 - (fatigue - 40) * 0.008;
    const conditionTerm = 0.7 + (condition / 100) * 0.35;

    const efficiency = clamp(
      availability * skillTerm * leadershipTerm * moraleTerm * fatigueTerm * conditionTerm * 100,
      0,
      120,
    );

    const workload = clamp((required / Math.max(1, onDuty.length)) * 72, 0, 140);

    out[dept] = {
      id: dept,
      personnel: onDuty.length,
      required,
      workload,
      efficiency,
      readiness: clamp(efficiency * 0.85 + (condition / 100) * 15, 0, 100),
      morale,
      fatigue,
      condition,
    };
  }

  return out;
}

function mean(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Carrier readiness (spec section 8).
 *
 * Explicitly NOT a plain average: the weighted mean is blended with the
 * single worst component, so one collapsed department drags the whole ship
 * down. Calibrated against the spec's worked example — components of
 * 94/91/88/85/43 land on ~65.
 */
export function computeReadiness(state: GameState): ReadinessBreakdown {
  const dep = state.departments;
  const d = (id: DeptId): DepartmentState =>
    dep[id] ?? {
      id,
      personnel: 0,
      required: 1,
      workload: 0,
      efficiency: 0,
      readiness: 0,
      morale: 50,
      fatigue: 0,
      condition: 100,
    };

  // -- Aircraft ------------------------------------------------------------
  const totalAircraft = state.aircraft.length;
  const capable = state.aircraft.filter((a) => isMissionCapable(a)).length;
  const meanCondition = mean(state.aircraft.map((a) => aircraftReadiness(a)), 0);
  const aircraft = totalAircraft === 0
    ? 0
    : clamp((capable / totalAircraft) * 62 + meanCondition * 0.38, 0, 100);

  // -- Crew ----------------------------------------------------------------
  const fitCrew = state.crew.filter(isAboardAndFit);
  const availableCrew = state.crew.filter(isAvailable);
  const availability = state.crew.length === 0 ? 0 : availableCrew.length / state.crew.length;
  const avgMorale = mean(fitCrew.map((c) => c.morale), 50);
  const avgFatigue = mean(fitCrew.map((c) => c.fatigue), 0);
  const crew = clamp(
    availability * 46 + (avgMorale / 100) * 30 + (1 - avgFatigue / 100) * 24,
    0,
    100,
  );

  // -- Departments ---------------------------------------------------------
  const engineering = clamp(d('ENG').readiness, 0, 100);
  const operations = clamp(d('OPS').readiness, 0, 100);
  const maintenance = clamp(maintenanceCapacity(state, d('MAINT').readiness), 0, 100);
  const command = clamp(commandEffectiveness(state), 0, 100);

  // -- Weapons -------------------------------------------------------------
  const ammo = state.supplies.ammo;
  const weaponsRooms = ['d2-ordnance', 'd7-magazine', 'd7-weaponsprep'];
  const weaponsCondition = mean(
    weaponsRooms.map((id) => state.rooms[id]?.condition ?? 100),
    100,
  );
  const weapons = clamp(
    d('AIR').readiness * 0.5 + ammo * 0.3 + weaponsCondition * 0.2,
    0,
    100,
  );

  // -- Logistics -----------------------------------------------------------
  const s = state.supplies;
  const logistics = clamp(
    s.fuel * 0.3 + s.parts * 0.26 + s.food * 0.2 + s.general * 0.14 + s.ammo * 0.1,
    0,
    100,
  );

  // -- Medical -------------------------------------------------------------
  const injured = state.crew.filter((c) => c.health !== 'healthy').length;
  const medicalLoad = clamp(100 - (injured / Math.max(1, state.crew.length)) * 380, 0, 100);
  const medical = clamp(
    d('MED').readiness * 0.4 + s.medical * 0.3 + medicalLoad * 0.3,
    0,
    100,
  );

  const components: { id: keyof ReadinessBreakdown; value: number; weight: number }[] = [
    { id: 'aircraft', value: aircraft, weight: 0.20 },
    { id: 'crew', value: crew, weight: 0.18 },
    { id: 'maintenance', value: maintenance, weight: 0.14 },
    { id: 'engineering', value: engineering, weight: 0.13 },
    { id: 'operations', value: operations, weight: 0.13 },
    { id: 'logistics', value: logistics, weight: 0.09 },
    { id: 'weapons', value: weapons, weight: 0.06 },
    { id: 'medical', value: medical, weight: 0.04 },
    { id: 'command', value: command, weight: 0.03 },
  ];

  const weightedMean = components.reduce((s2, c) => s2 + c.value * c.weight, 0);
  const worst = Math.min(...components.map((c) => c.value));

  // 60% of the fleet-average view, 40% of "you are only as good as your
  // worst department". Critical failures therefore hurt disproportionately.
  const overall = clamp(weightedMean * 0.6 + worst * 0.4, 0, 100);

  return {
    aircraft,
    crew,
    engineering,
    operations,
    weapons,
    logistics,
    medical,
    maintenance,
    command,
    overall,
  };
}

/** Maintenance readiness falls as the work-order backlog outgrows the shops. */
function maintenanceCapacity(state: GameState, deptReadiness: number): number {
  const open = state.workOrders.length;
  const capacity = state.crew.filter(
    (c) => c.department === 'MAINT' && isAvailable(c),
  ).length;
  const backlogPressure = capacity === 0 ? 2 : clamp(open / (capacity * 0.55), 0, 2.4);
  return deptReadiness * clamp(1.05 - backlogPressure * 0.32, 0.25, 1.05);
}

/** Command effectiveness: how well the ship's senior people cover the ship. */
function commandEffectiveness(state: GameState): number {
  const seniors = state.crew.filter((c) => c.rank >= 4 && isAboardAndFit(c));
  if (seniors.length === 0) return 25;
  const leadership = mean(seniors.map((c) => c.attrs.leadership), 50);
  const experience = mean(seniors.map((c) => c.attrs.experience), 50);
  const coverage = clamp(seniors.length / 9, 0, 1.1);
  return clamp((leadership * 0.5 + experience * 0.35 + 15) * coverage, 0, 100);
}

/** Room activity 0..100, driving the visual density on the deck map. */
export function computeRoomActivity(state: GameState): void {
  for (const room of ALL_ROOMS) {
    const rs = state.rooms[room.id];
    if (!rs) continue;
    const occupants = state.crew.filter(
      (c) => c.assignmentRoomId === room.id && isAvailable(c),
    );
    const occupancy = clamp(occupants.length / Math.max(1, room.capacity), 0, 1);
    const output = occupants.reduce((s, c) => s + effectiveness(c), 0);
    const orders = state.workOrders.filter((w) => w.roomId === room.id).length;
    const tempoBoost = { low: 0.7, normal: 1.0, high: 1.2, maximum: 1.4 }[state.tempo];

    rs.activity = clamp((occupancy * 55 + output * 9 + orders * 8) * tempoBoost, 0, 100);
    rs.workload = clamp(
      orders * 22 + occupancy * 40 + (state.mission ? 18 : 0),
      0,
      140,
    );
    rs.efficiency = clamp(
      occupants.length === 0 ? 0 : (output / occupants.length) * 78 + (rs.condition / 100) * 22,
      0,
      120,
    );
  }
}

export function readinessLabel(value: number): string {
  if (value >= 88) return 'EXCELLENT';
  if (value >= 74) return 'READY';
  if (value >= 58) return 'DEGRADED';
  if (value >= 40) return 'LIMITED';
  return 'CRITICAL';
}

/** Colour band shared by the HUD, the mini-map and room tinting. */
export function statusColor(value: number): string {
  if (value >= 74) return '#5b9831';
  if (value >= 55) return '#c9a227';
  if (value >= 35) return '#c9762a';
  return '#a8342a';
}

export function roomFor(id: string) {
  return getRoom(id);
}

// ---------------------------------------------------------------------------
// Why readiness moved
// ---------------------------------------------------------------------------

type Component = keyof Omit<ReadinessBreakdown, 'overall'>;

const COMPONENT_WEIGHTS: Record<Component, number> = {
  aircraft: 0.2,
  crew: 0.18,
  maintenance: 0.14,
  engineering: 0.13,
  operations: 0.13,
  logistics: 0.09,
  weapons: 0.06,
  medical: 0.04,
  command: 0.03,
};

const COMPONENTS = Object.keys(COMPONENT_WEIGHTS) as Component[];

/** Readiness label per component, as the readout shows it. */
export const COMPONENT_LABELS: Record<Component, string> = {
  aircraft: 'Aircraft',
  crew: 'Crew',
  maintenance: 'Maintenance',
  engineering: 'Engineering',
  operations: 'Operations',
  logistics: 'Logistics',
  weapons: 'Weapons',
  medical: 'Medical',
  command: 'Command',
};

function overallOf(b: Record<Component, number>): number {
  const mean = COMPONENTS.reduce((s, c) => s + b[c] * COMPONENT_WEIGHTS[c], 0);
  const worst = Math.min(...COMPONENTS.map((c) => b[c]));
  return clamp(mean * 0.6 + worst * 0.4, 0, 100);
}

/** The concrete cause behind a component's value today. */
export function componentCause(state: GameState, component: Component): LogNote {
  const pct = (v: number) => Math.round(v);
  const dept = (id: DeptId) => state.departments[id];
  switch (component) {
    case 'aircraft':
      return {
        key: '{ready} of {total} airframes mission capable',
        vars: {
          ready: state.aircraft.filter((a) => isMissionCapable(a)).length,
          total: state.aircraft.length,
        },
      };
    case 'crew': {
      const fit = state.crew.filter(isAboardAndFit);
      const away = state.crew.length - fit.length;
      return {
        key: 'Crew fatigue {fatigue}%, morale {morale}%, {away} away or in sick bay',
        vars: {
          fatigue: pct(mean(fit.map((c) => c.fatigue), 0)),
          morale: pct(mean(fit.map((c) => c.morale), 50)),
          away,
        },
      };
    }
    case 'maintenance':
      return {
        key: '{orders} open work orders for {techs} technicians on duty',
        vars: {
          orders: state.workOrders.length,
          techs: state.crew.filter((c) => c.department === 'MAINT' && isAvailable(c)).length,
        },
      };
    case 'engineering':
      return {
        key: 'Engineering spaces at {condition}%, department fatigue {fatigue}%',
        vars: { condition: pct(dept('ENG')?.condition ?? 100), fatigue: pct(dept('ENG')?.fatigue ?? 0) },
      };
    case 'operations':
      return {
        key: 'Operations at {efficiency}% efficiency, department fatigue {fatigue}%',
        vars: { efficiency: pct(dept('OPS')?.efficiency ?? 0), fatigue: pct(dept('OPS')?.fatigue ?? 0) },
      };
    case 'logistics': {
      const [k, v] = Object.entries(state.supplies).sort((a, b) => a[1] - b[1])[0]!;
      return {
        key: 'Lowest stores: {supply} at {value}%',
        vars: { value: pct(v) },
        tvars: { supply: SUPPLY_NAMES[k] ?? k },
      };
    }
    case 'weapons':
      return {
        key: 'Ammunition at {ammo}%, air department at {air}%',
        vars: { ammo: pct(state.supplies.ammo), air: pct(dept('AIR')?.readiness ?? 0) },
      };
    case 'medical':
      return {
        key: '{injured} crew in sick bay, medical stores at {stores}%',
        vars: {
          injured: state.crew.filter((c) => c.health !== 'healthy').length,
          stores: pct(state.supplies.medical),
        },
      };
    case 'command':
      return {
        key: '{seniors} senior hands fit for duty',
        vars: { seniors: state.crew.filter((c) => c.rank >= 4 && isAboardAndFit(c)).length },
      };
  }
}

/**
 * Supply names, matching `SUPPLY_LABELS` in economy.ts word for word (and so
 * sharing its translations) without importing the economy into readiness.
 */
const SUPPLY_NAMES: Record<string, string> = {
  food: 'Food',
  medical: 'Medical Supplies',
  parts: 'Spare Parts',
  fuel: 'Aviation Fuel',
  general: 'General Supplies',
  ammo: 'Ammunition',
};

/**
 * The components that moved overall readiness most today. Each impact is
 * the change in overall readiness had only that component moved, so the
 * worst-component term is accounted for exactly rather than approximated.
 */
export function explainReadiness(
  before: ReadinessBreakdown,
  after: ReadinessBreakdown,
  state: GameState,
): ReadinessDriver[] {
  const base = overallOf(before);
  const drivers: ReadinessDriver[] = [];
  for (const c of COMPONENTS) {
    if (Math.abs(after[c] - before[c]) < 0.05) continue;
    const impact = overallOf({ ...before, [c]: after[c] }) - base;
    if (Math.abs(impact) < 0.4) continue;
    drivers.push({ component: c, impact, cause: componentCause(state, c) });
  }
  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 3);
}

/** What to do about each component when it is the ship's weakest. */
export const COMPONENT_ADVICE: Record<Component, string> = {
  aircraft: 'Release airframes to the shops on MAINT duty and keep parts stocked.',
  crew: 'Put tired departments on three watches, lower the tempo, or let the ship rest alongside.',
  maintenance: 'Clear the backlog: technicians on duty, parts aboard, fewer sorties for a day.',
  engineering: 'Engineering is worn: three watches for ENG and no maximum tempo.',
  operations: 'Operations is stretched: rotate its watches and fill its posts.',
  logistics: 'Stores are low: buy supplies alongside, or take a replenishment at sea.',
  weapons: 'Restock ammunition and keep the air department rested.',
  medical: 'Sick bay is busy: lower the tempo and risk, keep medical stores up.',
  command: 'Too few fit senior hands: rest your chiefs, promote, or recruit.',
};

/** The ship's weakest readiness component: 40% of overall readiness. */
export function weakestLink(state: GameState): { component: Component; value: number } {
  const r = state.readiness;
  let worst: Component = 'aircraft';
  for (const c of COMPONENTS) if (r[c] < r[worst]) worst = c;
  return { component: worst, value: r[worst] };
}
