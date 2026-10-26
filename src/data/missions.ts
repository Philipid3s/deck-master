import type { MissionDef, UpgradeDef } from '../core/types';

/**
 * Missions (spec sections 41-46). Requirements are checked against the
 * readiness breakdown; the player may accept a mission they do not meet,
 * but every unmet requirement adds risk in `missions.ts`.
 */
export const MISSIONS: MissionDef[] = [
  // -- Difficulty 1-2 -------------------------------------------------------
  {
    id: 'm-workups',
    title: 'Fleet Work-Ups',
    category: 'air',
    description:
      'Routine training cycle in home waters. Low risk, modest reward, and a chance to shake down the air wing before anything serious.',
    difficulty: 1,
    days: 5,
    transitDays: 1,
    requirements: { aircraftReady: 40, crewReadiness: 50 },
    recommended: ['Any airframes', 'No special capability required'],
    objectives: ['Fly 40 training sorties', 'No Class A mishaps', 'Qualify deck crews'],
    rewardCredits: 90000,
    rewardPrestige: 18,
    minPrestige: 0,
    dutyWeights: { training: 1.1, cap: 0.6, strike: 0.5, recon: 0.4, lift: 0.3 },
    sortiesRequired: 6,
    eventPool: ['ev-deck-foul', 'ev-tired-tech'],
  },
  {
    id: 'm-patrol',
    title: 'Maritime Security Patrol',
    category: 'maritime',
    description:
      'Presence patrol across a shipping corridor. Long, unglamorous, and steady — the bread and butter of a carrier group.',
    difficulty: 2,
    days: 8,
    transitDays: 2,
    requirements: { aircraftReady: 45, crewReadiness: 55, operations: 55, fuel: 40 },
    recommended: ['Early warning aircraft', 'Experienced radar operators'],
    objectives: ['Maintain continuous surface picture', 'Log 60 patrol sorties', 'Report all contacts'],
    rewardCredits: 140000,
    rewardPrestige: 32,
    minPrestige: 0,
    dutyWeights: { recon: 1.1, cap: 0.7, asw: 0.5, strike: 0.2, lift: 0.2 },
    mechanic: 'contacts',
    sortiesRequired: 7,
    eventPool: ['ev-contact-unknown', 'ev-fuel-drain', 'ev-tired-tech'],
  },
  {
    id: 'm-relief',
    title: 'Disaster Relief — Coastal Flooding',
    category: 'humanitarian',
    description:
      'A typhoon has flattened a coastal province. Rotary wing lift and medical capacity matter far more than combat power here.',
    difficulty: 2,
    days: 9,
    transitDays: 2,
    requirements: { aircraftReady: 40, crewReadiness: 50, overall: 45 },
    recommended: ['Maritime helicopters', 'Medical capacity', 'Deep general stores'],
    objectives: ['Deliver 300 tonnes of relief supplies', 'Evacuate casualties', 'Sustain shore medical support'],
    rewardCredits: 120000,
    rewardPrestige: 55,
    minPrestige: 0,
    dutyWeights: { lift: 1.25, recon: 0.85, cap: 0.1 },
    mechanic: 'casualties',
    sortiesRequired: 6,
    eventPool: ['ev-relief-overload', 'ev-medical-surge', 'ev-storm'],
  },

  // -- Difficulty 3 ---------------------------------------------------------
  {
    id: 'm-convoy',
    title: 'Convoy Protection',
    category: 'maritime',
    description:
      'Escort a merchant convoy through a contested strait. Persistent air cover for nine days with no let-up in the launch cycle.',
    difficulty: 3,
    days: 9,
    transitDays: 2,
    requirements: { aircraftReady: 60, crewReadiness: 62, operations: 65, engineering: 60, fuel: 55 },
    recommended: ['Early warning aircraft', 'Electronic warfare capability'],
    objectives: ['Zero convoy losses', 'Maintain 24-hour CAP', 'Deter surface threats'],
    rewardCredits: 210000,
    rewardPrestige: 70,
    minPrestige: 100,
    dutyWeights: { cap: 1.1, asw: 1.0, recon: 0.9, strike: 0.4 },
    mechanic: 'threat',
    sortiesRequired: 10,
    eventPool: ['ev-contact-unknown', 'ev-cap-intercept', 'ev-arrestor-fail', 'ev-fuel-drain'],
  },
  {
    id: 'm-elint',
    title: 'Electronic Intelligence Collection',
    category: 'intel',
    description:
      'Loiter at the edge of a denied area and collect emitter data. Success depends almost entirely on Operations and sensor crews.',
    difficulty: 3,
    days: 7,
    transitDays: 3,
    requirements: { operations: 72, aircraftReady: 55, crewReadiness: 60 },
    recommended: ['Electronic warfare aircraft', 'Senior radar operators', 'Intelligence staff'],
    objectives: ['Collect 12 emitter fingerprints', 'Remain undetected', 'Return all airframes'],
    rewardCredits: 190000,
    rewardPrestige: 85,
    minPrestige: 100,
    dutyWeights: { recon: 1.25, cap: 0.5, strike: 0.1 },
    mechanic: 'contacts',
    sortiesRequired: 8,
    eventPool: ['ev-contact-unknown', 'ev-comms-fault', 'ev-shadowed'],
  },
  {
    id: 'm-airdefence',
    title: 'Integrated Air Defence Exercise',
    category: 'air',
    description:
      'A multinational exercise under observation. Reputation is on the line: sloppy deck work will be seen by everyone watching.',
    difficulty: 3,
    days: 6,
    transitDays: 1,
    requirements: { aircraftReady: 68, crewReadiness: 65, operations: 65 },
    recommended: ['Full fighter complement', 'Experienced air controllers'],
    objectives: ['Intercept 90% of inbound raids', 'Sustain 30 sorties per day', 'No mishaps'],
    rewardCredits: 175000,
    rewardPrestige: 78,
    minPrestige: 250,
    dutyWeights: { cap: 1.15, strike: 0.6, recon: 0.5, training: 0.3 },
    mechanic: 'threat',
    sortiesRequired: 10,
    eventPool: ['ev-cap-intercept', 'ev-deck-foul', 'ev-observer'],
  },

  // -- Difficulty 4 ---------------------------------------------------------
  {
    id: 'm-evacuation',
    title: 'Non-Combatant Evacuation',
    category: 'humanitarian',
    description:
      'A city is falling. Lift out several thousand civilians under a deteriorating security situation, at maximum tempo, for as long as it takes.',
    difficulty: 4,
    days: 11,
    transitDays: 3,
    requirements: { aircraftReady: 70, crewReadiness: 68, overall: 65, engineering: 65, fuel: 60 },
    recommended: ['Maximum rotary lift', 'Medical expansion', 'Deep fuel reserves'],
    objectives: ['Evacuate 4,000 civilians', 'Zero civilian casualties', 'Sustain maximum tempo'],
    rewardCredits: 320000,
    rewardPrestige: 150,
    minPrestige: 250,
    dutyWeights: { lift: 1.25, recon: 0.75, cap: 0.4 },
    mechanic: 'casualties',
    sortiesRequired: 8,
    eventPool: ['ev-relief-overload', 'ev-medical-surge', 'ev-storm', 'ev-crew-breaking', 'ev-elevator-jam'],
  },
  {
    id: 'm-strike',
    title: 'Precision Strike Package',
    category: 'combat',
    description:
      'Deliver a limited strike against a defended target set. Weapons handling, avionics availability and pilot experience all matter at once.',
    difficulty: 4,
    days: 7,
    transitDays: 3,
    requirements: { aircraftReady: 75, crewReadiness: 70, operations: 70, engineering: 68 },
    recommended: ['Electronic warfare escort', 'Full magazine', 'Elite avionics division'],
    objectives: ['Strike all assigned targets', 'Return every aircraft', 'Avoid collateral damage'],
    rewardCredits: 380000,
    rewardPrestige: 175,
    minPrestige: 500,
    dutyWeights: { strike: 1.25, cap: 0.7, recon: 0.6 },
    mechanic: 'window',
    sortiesRequired: 10,
    eventPool: ['ev-weapons-fault', 'ev-battle-damage', 'ev-cap-intercept', 'ev-comms-fault'],
  },

  // -- Difficulty 5 ---------------------------------------------------------
  {
    id: 'm-crisis',
    title: 'Crisis Response — Contested Waters',
    category: 'crisis',
    description:
      'A standing deployment into an active crisis with no defined end state. Everything degrades: airframes, tempers, and the margin for error.',
    difficulty: 5,
    days: 14,
    transitDays: 3,
    requirements: { aircraftReady: 80, crewReadiness: 75, operations: 78, engineering: 75, overall: 75, fuel: 70 },
    recommended: ['Elite crew across all divisions', 'Upgraded workshops', 'Full stores'],
    objectives: ['Maintain deterrent posture 14 days', 'Zero aircraft losses', 'No escalation'],
    rewardCredits: 520000,
    rewardPrestige: 280,
    minPrestige: 1000,
    dutyWeights: { cap: 1.0, recon: 1.0, strike: 0.9, asw: 0.7, lift: 0.4 },
    mechanic: 'escalation',
    sortiesRequired: 12,
    eventPool: [
      'ev-battle-damage',
      'ev-crew-breaking',
      'ev-reactor-alarm',
      'ev-elevator-jam',
      'ev-weapons-fault',
      'ev-shadowed',
    ],
  },
];

export const MISSIONS_BY_ID: Record<string, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);

export function missionDef(id: string): MissionDef {
  const m = MISSIONS_BY_ID[id];
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
}

// ---------------------------------------------------------------------------
// Facility upgrades (spec sections 61-62)
// ---------------------------------------------------------------------------

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'up-avionics',
    name: 'Avionics Shop',
    roomId: 'd2-avionics',
    description: 'Better test benches and diagnostic sets. The single highest-leverage maintenance upgrade.',
    costCredits: [60000, 110000, 190000, 320000],
    costPrestige: [20, 45, 90, 160],
    effectText: ['Avionics work +12%', 'Avionics work +25%', 'Avionics work +38%', 'Avionics work +55%'],
  },
  {
    id: 'up-engine',
    name: 'Engine Shop',
    roomId: 'd2-engineshop',
    description: 'Overhaul stands and spare module racks shorten powerplant turnaround.',
    costCredits: [55000, 100000, 175000, 300000],
    costPrestige: [18, 40, 85, 150],
    effectText: ['Engine work +12%', 'Engine work +25%', 'Engine work +38%', 'Engine work +55%'],
  },
  {
    id: 'up-training',
    name: 'Training Center',
    roomId: 'd3-training',
    description: 'Simulators and classrooms cut course length across the board.',
    costCredits: [70000, 130000, 220000, 360000],
    costPrestige: [25, 55, 100, 180],
    effectText: ['Courses 10% faster', 'Courses 20% faster', 'Courses 30% faster', 'Courses 45% faster'],
  },
  {
    id: 'up-medical',
    name: 'Medical Clinic',
    roomId: 'd3-medical',
    description: 'More beds and a surgical suite. Injured crew return to duty sooner.',
    costCredits: [65000, 120000, 200000, 330000],
    costPrestige: [22, 48, 95, 165],
    effectText: ['Recovery 15% faster', 'Recovery 28% faster', 'Recovery 40% faster', 'Recovery 55% faster'],
  },
  {
    id: 'up-berthing',
    name: 'Crew Quarters',
    roomId: 'd5-berth1',
    description: 'Refit berthing for privacy and quiet. Rested crew recover fatigue faster.',
    costCredits: [50000, 95000, 165000, 280000],
    costPrestige: [15, 38, 80, 140],
    effectText: ['Rest +12%', 'Rest +22%', 'Rest +32%', 'Rest +45%'],
  },
  {
    id: 'up-recreation',
    name: 'Recreation Facilities',
    roomId: 'd5-rec',
    description: 'Somewhere to go that is not your rack or your shop. Morale recovers faster.',
    costCredits: [45000, 85000, 150000, 260000],
    costPrestige: [14, 34, 72, 130],
    effectText: ['Morale recovery +15%', '+28%', '+40%', '+55%'],
  },
  {
    id: 'up-ops',
    name: 'Combat Information Center',
    roomId: 'd3-cic',
    description: 'Upgraded consoles and data fusion improve detection and mission coordination.',
    costCredits: [80000, 145000, 250000, 400000],
    costPrestige: [30, 65, 120, 200],
    effectText: ['Operations +8', 'Operations +15', 'Operations +22', 'Operations +30'],
  },
  {
    id: 'up-engineering',
    name: 'Main Machinery',
    roomId: 'd4-machinery',
    description: 'Overhauled auxiliaries and spares holding. Machinery fails less often.',
    costCredits: [75000, 140000, 240000, 390000],
    costPrestige: [28, 60, 115, 195],
    effectText: ['Failure rate -15%', '-28%', '-40%', '-55%'],
  },
  {
    id: 'up-dc',
    name: 'Damage Control Central',
    roomId: 'd4-dcc',
    description: 'Better plotting, comms and locker equipment. Emergencies do less damage.',
    costCredits: [70000, 130000, 225000, 370000],
    costPrestige: [26, 58, 110, 190],
    effectText: ['Emergency damage -15%', '-28%', '-40%', '-55%'],
  },
  {
    id: 'up-stores',
    name: 'General Stores',
    roomId: 'd6-genstore',
    description: 'Reorganised holds and extra tankage raise every supply ceiling.',
    costCredits: [55000, 100000, 180000, 300000],
    costPrestige: [18, 42, 88, 155],
    effectText: ['Storage +15%', '+30%', '+45%', '+65%'],
  },
];

export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);
