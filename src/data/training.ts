import type { TrainingCourseDef } from '../core/types';

/**
 * Training courses (spec sections 29-30). Enrolled crew are unavailable for
 * normal duties for the whole course, which is the cost the player weighs
 * against the skill gain.
 */
export const TRAINING_COURSES: TrainingCourseDef[] = [
  // -- Basic ---------------------------------------------------------------
  {
    id: 'basic-safety',
    name: 'Shipboard Safety & Procedures',
    category: 'basic',
    days: 4,
    cost: 2200,
    attrGain: { discipline: [3, 6] },
    requiresInstructor: false,
    description: 'Fundamental safety drills and shipboard routine. Required before any promotion.',
  },
  {
    id: 'basic-firefighting',
    name: 'Firefighting & Damage Control',
    category: 'basic',
    days: 6,
    cost: 3400,
    attrGain: { stress: [3, 7], discipline: [1, 3] },
    skillGain: { specialty: 'damagecontrol', min: 4, max: 9 },
    requiresInstructor: true,
    description: 'Hose teams, boundary cooling and flooding response. Improves emergency response.',
  },
  {
    id: 'basic-firstaid',
    name: 'First Aid & Casualty Handling',
    category: 'basic',
    days: 3,
    cost: 1600,
    skillGain: { specialty: 'medic', min: 3, max: 7 },
    attrGain: { stress: [1, 4] },
    requiresInstructor: false,
    description: 'Stabilising casualties before they reach medical. Reduces injury severity.',
  },

  // -- Specialty -----------------------------------------------------------
  {
    id: 'spec-primary',
    name: 'Specialty Refresher',
    category: 'specialty',
    days: 7,
    cost: 6500,
    skillGain: { specialty: 'primary', min: 4, max: 9 },
    attrGain: { technical: [1, 3] },
    requiresInstructor: false,
    description: 'Focused practice in the technician’s own trade. Reliable, unspectacular gains.',
  },
  {
    id: 'spec-engine',
    name: 'Aircraft Engine Maintenance',
    category: 'specialty',
    days: 10,
    cost: 11000,
    skillGain: { specialty: 'engine', min: 5, max: 11 },
    attrGain: { technical: [2, 4] },
    requiresInstructor: true,
    description: 'Powerplant teardown, borescope inspection and module replacement.',
  },
  {
    id: 'spec-avionics',
    name: 'Avionics Systems',
    category: 'specialty',
    days: 10,
    cost: 11500,
    skillGain: { specialty: 'avionics', min: 5, max: 11 },
    attrGain: { technical: [2, 4] },
    requiresInstructor: true,
    description: 'Radar, mission computers and bus faults. The bottleneck trade on most carriers.',
  },
  {
    id: 'spec-airframe',
    name: 'Airframe & Structures',
    category: 'specialty',
    days: 9,
    cost: 9500,
    skillGain: { specialty: 'airframe', min: 5, max: 10 },
    requiresInstructor: true,
    description: 'Structural repair, hydraulics and control surfaces.',
  },
  {
    id: 'spec-weapons',
    name: 'Weapons Handling',
    category: 'specialty',
    days: 8,
    cost: 8800,
    skillGain: { specialty: 'weapons', min: 5, max: 10 },
    attrGain: { discipline: [2, 5] },
    requiresInstructor: true,
    description: 'Ordnance movement, arming procedures and magazine discipline.',
  },
  {
    id: 'spec-handling',
    name: 'Flight Deck Handling',
    category: 'specialty',
    days: 8,
    cost: 8200,
    skillGain: { specialty: 'handling', min: 5, max: 10 },
    attrGain: { speed: [2, 5] },
    requiresInstructor: true,
    description: 'Aircraft directing, spotting and tractor operations on a live deck.',
  },
  {
    id: 'spec-radar',
    name: 'Radar & Sensor Operation',
    category: 'specialty',
    days: 9,
    cost: 9200,
    skillGain: { specialty: 'radar', min: 5, max: 10 },
    requiresInstructor: true,
    description: 'Track management, contact classification and sensor employment.',
  },

  // -- Advanced ------------------------------------------------------------
  {
    id: 'adv-avionics',
    name: 'Advanced Avionics',
    category: 'advanced',
    days: 14,
    cost: 18000,
    skillGain: { specialty: 'avionics', min: 3, max: 8 },
    attrGain: { technical: [3, 6], experience: [2, 4] },
    requiresInstructor: true,
    requires: { technical: 60 },
    description: 'Deep fault diagnosis on integrated mission systems. Long, expensive, transformative.',
  },
  {
    id: 'adv-maintenance',
    name: 'Senior Maintenance Management',
    category: 'advanced',
    days: 12,
    cost: 16000,
    skillGain: { specialty: 'primary', min: 3, max: 6 },
    attrGain: { leadership: [3, 6], discipline: [2, 4] },
    requiresInstructor: true,
    requires: { experience: 50 },
    description: 'Work-order planning and quality assurance across a division.',
  },
  {
    id: 'adv-dc',
    name: 'Advanced Damage Control',
    category: 'advanced',
    days: 11,
    cost: 14000,
    skillGain: { specialty: 'damagecontrol', min: 4, max: 9 },
    attrGain: { stress: [4, 8], stamina: [2, 4] },
    requiresInstructor: true,
    requires: { stamina: 50 },
    description: 'Leading a locker through progressive flooding and major fire.',
  },
  {
    id: 'adv-deckSup',
    name: 'Flight Deck Supervision',
    category: 'advanced',
    days: 12,
    cost: 15500,
    skillGain: { specialty: 'handling', min: 3, max: 7 },
    attrGain: { leadership: [3, 6], stress: [2, 5] },
    requiresInstructor: true,
    requires: { experience: 45 },
    description: 'Running a deck cycle: spotting, foul deck calls and emergency pull-forward.',
  },

  // -- Leadership ----------------------------------------------------------
  {
    id: 'lead-team',
    name: 'Team Management',
    category: 'leadership',
    days: 7,
    cost: 7400,
    attrGain: { leadership: [4, 8] },
    requiresInstructor: true,
    requires: { experience: 25 },
    description: 'Required for chief. Turns a good technician into someone who can run a shop.',
  },
  {
    id: 'lead-crisis',
    name: 'Crisis Management',
    category: 'leadership',
    days: 9,
    cost: 10500,
    attrGain: { leadership: [3, 6], stress: [4, 8] },
    requiresInstructor: true,
    requires: { leadership: 45 },
    description: 'Decision making under casualty conditions and incomplete information.',
  },
  {
    id: 'lead-mentor',
    name: 'Instructor Qualification',
    category: 'leadership',
    days: 10,
    cost: 12000,
    attrGain: { leadership: [3, 5], experience: [2, 5] },
    requiresInstructor: true,
    requires: { experience: 60, leadership: 55 },
    description: 'Qualifies the crew member to instruct courses and mentor juniors aboard.',
  },
];

export const TRAINING_BY_ID: Record<string, TrainingCourseDef> = Object.fromEntries(
  TRAINING_COURSES.map((c) => [c.id, c]),
);

export function trainingCourse(id: string): TrainingCourseDef {
  const c = TRAINING_BY_ID[id];
  if (!c) throw new Error(`Unknown course ${id}`);
  return c;
}

/** Instructor qualification — one aboard is needed for instructor-led courses. */
export const INSTRUCTOR_COURSE = 'lead-mentor';
