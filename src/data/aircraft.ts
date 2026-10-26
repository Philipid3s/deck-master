import type { AircraftDuty, AircraftTypeDef } from '../core/types';

/**
 * Fictional air wing (spec section 38). Types are data so the wing can be
 * expanded without touching the simulation.
 */
export interface DutyDef {
  id: AircraftDuty;
  name: string;
  short: string;
  description: string;
  /** Flying duties burn fuel and airframe life; ground duties do not. */
  flies: boolean;
  color: string;
}

/**
 * The daily air tasking order (spec sections 37-40). Every airframe is doing
 * exactly one of these each turn, and the mix is what decides whether the
 * mission advances.
 */
export const DUTIES: DutyDef[] = [
  {
    id: 'strike',
    name: 'Strike / Mission Tasking',
    short: 'STRIKE',
    description: 'Flying the assigned objective. The only duty that moves a strike mission.',
    flies: true,
    color: '#c0453f',
  },
  {
    id: 'cap',
    name: 'Combat Air Patrol',
    short: 'CAP',
    description: 'Air defence overhead. Protects the group and lowers accumulated risk.',
    flies: true,
    color: '#5f9ec9',
  },
  {
    id: 'recon',
    name: 'Surveillance & Recon',
    short: 'RECON',
    description: 'Building the picture. Carries patrol and intelligence missions.',
    flies: true,
    color: '#5fc9a8',
  },
  {
    id: 'lift',
    name: 'Lift & Logistics',
    short: 'LIFT',
    description: 'Moving people and cargo. Carries humanitarian and evacuation work.',
    flies: true,
    color: '#c9b84a',
  },
  {
    id: 'asw',
    name: 'Anti-Submarine Warfare',
    short: 'ASW',
    description: 'Hunting submarines with sonar and sonobuoys. Counts where a submarine threat is part of the mission, and takes risk off it.',
    flies: true,
    color: '#3f8a8a',
  },
  {
    id: 'tanker',
    name: 'Aerial Refuelling',
    short: 'TANKER',
    description: 'Fuel in the air. Lengthens every strike, CAP and recon sortie: a multiplier on their worth, not progress of its own.',
    flies: true,
    color: '#a07ad9',
  },
  {
    id: 'escort',
    name: 'Electronic Escort',
    short: 'EW ESCORT',
    description: 'Jamming the defences ahead of the package. Makes strike sorties count for more and takes risk off the operation.',
    flies: true,
    color: '#d97ab0',
  },
  {
    id: 'planeguard',
    name: 'Plane Guard / SAR',
    short: 'SAR',
    description: 'A helicopter airborne near the ship whenever it flies, ready to pull aircrew out of the water. Flying with one is markedly safer.',
    flies: true,
    color: '#e0e0e0',
  },
  {
    id: 'training',
    name: 'Training Sorties',
    short: 'TRAINING',
    description: 'No mission progress, but aircrew and deck crews gain experience.',
    flies: true,
    color: '#3d7cc9',
  },
  {
    id: 'alert',
    name: 'Deck Alert',
    short: 'ALERT',
    description:
      'Armed, fuelled and crewed on a launch spot, ready at five minutes. Takes risk off the operation without burning airframe life — four spots at most.',
    flies: false,
    color: '#c9a227',
  },
  {
    id: 'maintenance',
    name: 'Grounded — Maintenance',
    short: 'MAINT',
    description: 'Released to the shops. Open work orders progress faster.',
    flies: false,
    color: '#e8ad12',
  },
  {
    id: 'standdown',
    name: 'Stood Down',
    short: 'STOOD DOWN',
    description: 'Secured and untouched. No wear, no contribution.',
    flies: false,
    color: '#6b7681',
  },
];

export const DUTIES_BY_ID: Record<AircraftDuty, DutyDef> = Object.fromEntries(
  DUTIES.map((d) => [d.id, d]),
) as Record<AircraftDuty, DutyDef>;

/**
 * How well each airframe role performs each flying duty. A transport on CAP
 * contributes nothing; an E-5 on recon is worth more than a fighter.
 */
export const DUTY_SUITABILITY: Record<string, Partial<Record<AircraftDuty, number>>> = {
  fighter: { strike: 1.0, cap: 1.1, recon: 0.5, lift: 0, tanker: 0.8, training: 0.9 },
  ew: { strike: 0.5, cap: 0.7, recon: 0.9, lift: 0, escort: 1.25, training: 0.7 },
  aew: { strike: 0.1, cap: 0.5, recon: 1.25, lift: 0, training: 0.6 },
  helo: { strike: 0.3, cap: 0.1, recon: 0.8, lift: 1.1, asw: 0.4, planeguard: 1.0, training: 0.7 },
  transport: { strike: 0, cap: 0, recon: 0.3, lift: 1.25, planeguard: 0.4, training: 0.5 },
  uav: { recon: 0.3, tanker: 1.3 },
};

/** How well a particular type does a duty: its own figure, else its role's. */
export function typeSuitability(typeId: string, duty: AircraftDuty): number {
  const type = aircraftType(typeId);
  return type.duties?.[duty] ?? suitability(type.role, duty);
}

export function suitability(role: string, duty: AircraftDuty): number {
  return DUTY_SUITABILITY[role]?.[duty] ?? 0;
}

export const AIRCRAFT_TYPES: AircraftTypeDef[] = [
  {
    id: 'fa18e',
    name: 'F/A-18E Super Hornet',
    role: 'fighter',
    size: { w: 7, h: 6 },
    crewRequired: 1,
    fuelBurn: 3.2,
    sortieValue: 1.0,
    costCredits: 320000,
    costPrestige: 0,
    minPrestige: 0,
    leadDays: 5,
    modexBase: 100,
  },
  {
    // The two-seater trades a little fuel for a weapons systems officer, which
    // is why it carries the harder strike tasking.
    id: 'fa18f',
    name: 'F/A-18F Super Hornet',
    role: 'fighter',
    size: { w: 7, h: 6 },
    crewRequired: 2,
    fuelBurn: 3.4,
    sortieValue: 1.15,
    costCredits: 365000,
    costPrestige: 10,
    minPrestige: 0,
    leadDays: 5,
    modexBase: 200,
  },
  {
    id: 'ea18g',
    name: 'EA-18G Growler',
    role: 'ew',
    size: { w: 7, h: 6 },
    crewRequired: 2,
    fuelBurn: 3.6,
    sortieValue: 1.2,
    costCredits: 430000,
    costPrestige: 15,
    minPrestige: 100,
    leadDays: 6,
    modexBase: 500,
  },
  {
    id: 'e2d',
    name: 'E-2D Advanced Hawkeye',
    role: 'aew',
    size: { w: 9, h: 8 },
    crewRequired: 5,
    fuelBurn: 4.4,
    sortieValue: 1.4,
    costCredits: 460000,
    costPrestige: 15,
    minPrestige: 100,
    leadDays: 6,
    modexBase: 600,
  },
  {
    // Anti-submarine and maritime strike: two pilots and a sensor operator.
    id: 'mh60r',
    duties: { asw: 1.25, planeguard: 0.8 },
    name: 'MH-60R Seahawk',
    role: 'helo',
    size: { w: 7, h: 7 },
    crewRequired: 3,
    fuelBurn: 2.1,
    sortieValue: 0.85,
    costCredits: 215000,
    costPrestige: 0,
    minPrestige: 0,
    leadDays: 4,
    modexBase: 700,
  },
  {
    // Combat support, vertical replenishment and plane guard rescue.
    id: 'mh60s',
    duties: { asw: 0.2, planeguard: 1.15 },
    name: 'MH-60S Seahawk',
    role: 'helo',
    size: { w: 7, h: 7 },
    crewRequired: 4,
    fuelBurn: 2.2,
    sortieValue: 0.8,
    costCredits: 220000,
    costPrestige: 0,
    minPrestige: 0,
    leadDays: 4,
    modexBase: 610,
  },

  // -- Available only to a carrier with a reputation ------------------------
  {
    // Carrier onboard delivery. A logistics airframe rather than a combat one,
    // which is exactly what the humanitarian and evacuation taskings need.
    id: 'cmv22b',
    name: 'CMV-22B Osprey',
    role: 'transport',
    size: { w: 8, h: 8 },
    crewRequired: 4,
    fuelBurn: 2.8,
    sortieValue: 0.75,
    costCredits: 310000,
    costPrestige: 30,
    minPrestige: 250,
    leadDays: 6,
    modexBase: 800,
  },
  {
    // The Navy's unmanned tanker. Nobody aboard, so nobody to tire: it flies
    // tanker sorties day after day without touching the aircrew rota.
    id: 'mq25',
    name: 'MQ-25A Stingray',
    role: 'uav',
    size: { w: 8, h: 7 },
    crewRequired: 0,
    fuelBurn: 2.6,
    sortieValue: 1.0,
    costCredits: 390000,
    costPrestige: 20,
    minPrestige: 100,
    leadDays: 7,
    modexBase: 530,
  },
  {
    // The marquee unlock. A Marine F-35C detachment is assigned to carriers
    // that have earned one, and can only be taken on alongside.
    id: 'f35c',
    // No buddy refuelling store for the F-35C.
    duties: { tanker: 0 },
    name: 'F-35C Lightning II',
    role: 'fighter',
    size: { w: 7, h: 7 },
    crewRequired: 1,
    fuelBurn: 3.0,
    sortieValue: 1.45,
    costCredits: 560000,
    costPrestige: 60,
    minPrestige: 500,
    leadDays: 8,
    modexBase: 400,
  },
];

export const AIRCRAFT_TYPES_BY_ID: Record<string, AircraftTypeDef> = Object.fromEntries(
  AIRCRAFT_TYPES.map((t) => [t.id, t]),
);

export function aircraftType(id: string): AircraftTypeDef {
  const t = AIRCRAFT_TYPES_BY_ID[id];
  if (!t) throw new Error(`Unknown aircraft type ${id}`);
  return t;
}

/**
 * The starting air wing. Kept modest so the prototype's maintenance load is
 * legible; more airframes arrive through upgrades and prestige.
 */
/**
 * The embarked air wing, modelled on a current US carrier air wing (the
 * pattern CVW-9 flies from the Lincoln): two single-seat Super Hornet
 * squadrons, a two-seat squadron, Growlers, Hawkeyes and the two Seahawk
 * squadrons. Kept to a legible number of airframes rather than a full wing's
 * 60-odd.
 *
 * The fifth-generation types are deliberately absent: the F-35C detachment is
 * something the carrier earns alongside, once it has the reputation to be
 * given one.
 *
 * Modex numbers follow the real convention — 100s and 300s for the strike
 * fighter squadrons, 400s for the Marines, 500s Growlers, 600s Hawkeyes,
 * 610s HSC, 700s HSM.
 */
export const STARTING_WING: {
  typeId: string;
  count: number;
  squadron: string;
  modex: number;
}[] = [
  { typeId: 'fa18e', count: 4, squadron: 'VFA-14 "Tophatters"', modex: 100 },
  { typeId: 'fa18f', count: 2, squadron: 'VFA-41 "Black Aces"', modex: 200 },
  { typeId: 'fa18e', count: 3, squadron: 'VFA-151 "Vigilantes"', modex: 300 },
  { typeId: 'ea18g', count: 2, squadron: 'VAQ-133 "Wizards"', modex: 500 },
  { typeId: 'e2d', count: 2, squadron: 'VAW-117 "Wallbangers"', modex: 600 },
  { typeId: 'mh60s', count: 1, squadron: 'HSC-14 "Chargers"', modex: 610 },
  { typeId: 'mh60r', count: 2, squadron: 'HSM-71 "Raptors"', modex: 700 },
];
