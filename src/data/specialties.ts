import type { DeptId, SpecialtyId } from '../core/types';

export interface SpecialtyDef {
  id: SpecialtyId;
  name: string;
  short: string;
  department: DeptId;
  /** Sprite accent colour so specialties read at a glance on the deck map. */
  color: string;
}

export const SPECIALTIES: Record<SpecialtyId, SpecialtyDef> = {
  avionics: {
    id: 'avionics',
    name: 'Avionics Technician',
    short: 'Avionics',
    department: 'MAINT',
    color: '#4fb3d9',
  },
  engine: {
    id: 'engine',
    name: 'Aircraft Engine Technician',
    short: 'Engine',
    department: 'MAINT',
    color: '#d98d4f',
  },
  airframe: {
    id: 'airframe',
    name: 'Airframe Technician',
    short: 'Airframe',
    department: 'MAINT',
    color: '#b0752f',
  },
  weapons: {
    id: 'weapons',
    name: 'Weapons Technician',
    short: 'Weapons',
    department: 'AIR',
    color: '#c0453f',
  },
  radar: {
    id: 'radar',
    name: 'Radar Operator',
    short: 'Radar',
    department: 'OPS',
    color: '#4fd98d',
  },
  aircontrol: {
    id: 'aircontrol',
    name: 'Air Traffic Controller',
    short: 'Air Ctrl',
    department: 'OPS',
    color: '#6fd9c5',
  },
  handling: {
    id: 'handling',
    name: 'Aircraft Director',
    short: 'Handling',
    department: 'DECK',
    color: '#d9c14f',
  },
  tractor: {
    id: 'tractor',
    name: 'Tractor Operator',
    short: 'Tractor',
    department: 'DECK',
    color: '#a8a04a',
  },
  comms: {
    id: 'comms',
    name: 'Communications Specialist',
    short: 'Comms',
    department: 'OPS',
    color: '#8f7fd9',
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    short: 'Medical',
    department: 'MED',
    color: '#e0e0e0',
  },
  supply: {
    id: 'supply',
    name: 'Supply Specialist',
    short: 'Supply',
    department: 'SUP',
    color: '#8a9bb0',
  },
  damagecontrol: {
    id: 'damagecontrol',
    name: 'Damage Control Technician',
    short: 'Dmg Ctrl',
    department: 'ENG',
    color: '#d95f4f',
  },
  electrical: {
    id: 'electrical',
    name: 'Electrical Technician',
    short: 'Electrical',
    department: 'ENG',
    color: '#d9d24f',
  },
  flightops: {
    id: 'flightops',
    name: 'Flight Operations Specialist',
    short: 'Flight Ops',
    department: 'AIR',
    color: '#7fb0d9',
  },
  // Aircrew fly; they are assigned to an airframe, not to a compartment.
  pilot: {
    id: 'pilot',
    name: 'Pilot',
    short: 'Pilot',
    department: 'AIR',
    color: '#e8c04a',
  },
  aircrew: {
    id: 'aircrew',
    name: 'Naval Aircrewman',
    short: 'Aircrew',
    department: 'AIR',
    color: '#c98f4a',
  },
};

/** The two trades that occupy an aircraft seat rather than a compartment. */
export const AIRCREW_SPECIALTIES: SpecialtyId[] = ['pilot', 'aircrew'];

export const SPECIALTY_IDS = Object.keys(SPECIALTIES) as SpecialtyId[];

export interface DepartmentDef {
  id: DeptId;
  name: string;
  short: string;
  color: string;
}

export const DEPARTMENTS: Record<DeptId, DepartmentDef> = {
  CMD: { id: 'CMD', name: 'Command', short: 'CMD', color: '#c9b06a' },
  AIR: { id: 'AIR', name: 'Air Department', short: 'AIR', color: '#5f9ec9' },
  DECK: { id: 'DECK', name: 'Deck Department', short: 'DECK', color: '#c9b84a' },
  MAINT: { id: 'MAINT', name: 'Aircraft Maintenance', short: 'MAINT', color: '#5fc9a8' },
  OPS: { id: 'OPS', name: 'Operations', short: 'OPS', color: '#7f8fd9' },
  ENG: { id: 'ENG', name: 'Engineering', short: 'ENG', color: '#c97f4a' },
  MED: { id: 'MED', name: 'Medical', short: 'MED', color: '#d9d9d9' },
  SUP: { id: 'SUP', name: 'Supply', short: 'SUP', color: '#8a9bb0' },
};

export const DEPT_IDS = Object.keys(DEPARTMENTS) as DeptId[];
