import type { EquipmentDef } from '../core/types';

/**
 * Purchasable equipment (spec section 61, alongside facility upgrades).
 *
 * Facility upgrades improve a *place*; equipment is a countable thing the ship
 * owns, bought in quantity, and every item feeds exactly one simulation term.
 * Keeping one effect per item means the player can reason about what a
 * purchase actually does.
 */
export const EQUIPMENT: EquipmentDef[] = [
  {
    id: 'eq-tractor',
    name: 'Aircraft Tow Tractor',
    category: 'deck',
    description:
      'More tractors means more airframes respotted per cycle. The most direct way to raise how many sorties the deck can turn.',
    effect: { t: 'sortieCapacity', v: 1 },
    effectText: '+1 sortie per day',
    costCredits: 45000,
    costPrestige: 0,
    minPrestige: 0,
    max: 6,
    leadDays: 3,
  },
  {
    id: 'eq-gse',
    name: 'Ground Support Equipment Set',
    category: 'deck',
    description:
      'Power carts, hydraulic rigs and nitrogen carts. Shops stop waiting for shared kit.',
    effect: { t: 'maintenanceSpeed', v: 0.08 },
    effectText: 'Maintenance work +8%',
    costCredits: 60000,
    costPrestige: 0,
    minPrestige: 0,
    max: 4,
    leadDays: 4,
  },
  {
    id: 'eq-toolset',
    name: 'Precision Tool Sets',
    category: 'maintenance',
    description: 'Calibrated torque and test tooling issued per shop rather than shared.',
    effect: { t: 'maintenanceSpeed', v: 0.06 },
    effectText: 'Maintenance work +6%',
    costCredits: 38000,
    costPrestige: 0,
    minPrestige: 0,
    max: 4,
    leadDays: 3,
  },
  {
    id: 'eq-modules',
    name: 'Spare Module Pool',
    category: 'maintenance',
    description:
      'Rotable engine and avionics modules held aboard. Work orders stop stalling for want of a part.',
    effect: { t: 'partsEfficiency', v: 0.15 },
    effectText: 'Spares consumption -15%',
    costCredits: 85000,
    costPrestige: 10,
    minPrestige: 100,
    max: 3,
    leadDays: 5,
  },
  {
    id: 'eq-safety',
    name: 'Flight Deck Safety Equipment',
    category: 'safety',
    description:
      'Cranials, float coats, sound protection and better deck lighting. Fewer people get hurt.',
    effect: { t: 'accidentRisk', v: 0.12 },
    effectText: 'Accident rate -12%',
    costCredits: 40000,
    costPrestige: 0,
    minPrestige: 0,
    max: 3,
    leadDays: 3,
  },
  {
    id: 'eq-firefighting',
    name: 'Firefighting & Rescue Equipment',
    category: 'safety',
    description:
      'AFFF stations, rescue kit and proximity suits. Emergencies do less damage when they happen.',
    effect: { t: 'emergencyDamage', v: 0.15 },
    effectText: 'Equipment damage in emergencies -15%',
    costCredits: 55000,
    costPrestige: 0,
    minPrestige: 0,
    max: 3,
    leadDays: 4,
  },
  {
    id: 'eq-bunks',
    name: 'Improved Berthing Fittings',
    category: 'crew',
    description: 'Better racks, curtains and ventilation. Rest actually rests people.',
    effect: { t: 'restRate', v: 0.09 },
    effectText: 'Fatigue recovery +9%',
    costCredits: 30000,
    costPrestige: 0,
    minPrestige: 0,
    max: 3,
    leadDays: 2,
  },
  {
    id: 'eq-munitions',
    name: 'Precision Munitions Package',
    category: 'weapons',
    description:
      'Guided stores held ready in the magazine. Strike work carries less risk of going wrong.',
    effect: { t: 'missionRisk', v: 4 },
    effectText: 'Mission risk -4 per day',
    costCredits: 120000,
    costPrestige: 25,
    minPrestige: 250,
    max: 3,
    leadDays: 6,
  },
  {
    id: 'eq-datalink',
    name: 'Tactical Datalink Suite',
    category: 'operations',
    description:
      'Shared air picture across the group. Operations coordinate faster and the wing flies smarter.',
    effect: { t: 'missionRisk', v: 3 },
    effectText: 'Mission risk -3 per day',
    costCredits: 150000,
    costPrestige: 35,
    minPrestige: 500,
    max: 2,
    leadDays: 7,
  },
  {
    id: 'eq-wearkit',
    name: 'Corrosion Control Programme',
    category: 'maintenance',
    description:
      'Wash racks, sealants and a proper paint shop. Salt air stops eating the air wing.',
    effect: { t: 'aircraftWear', v: 0.12 },
    effectText: 'Airframe wear -12%',
    costCredits: 70000,
    costPrestige: 15,
    minPrestige: 100,
    max: 3,
    leadDays: 5,
  },
];

export const EQUIPMENT_BY_ID: Record<string, EquipmentDef> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.id, e]),
);

export function equipmentDef(id: string): EquipmentDef {
  const e = EQUIPMENT_BY_ID[id];
  if (!e) throw new Error(`Unknown equipment ${id}`);
  return e;
}

export const EQUIPMENT_CATEGORIES = [
  'deck',
  'maintenance',
  'safety',
  'crew',
  'weapons',
  'operations',
] as const;
