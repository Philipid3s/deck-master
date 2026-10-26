/** Shared game types. The whole simulation state is plain serialisable data. */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type DeptId = 'CMD' | 'AIR' | 'DECK' | 'MAINT' | 'OPS' | 'ENG' | 'MED' | 'SUP';

export type SpecialtyId =
  | 'avionics'
  | 'engine'
  | 'airframe'
  | 'weapons'
  | 'radar'
  | 'aircontrol'
  | 'handling'
  | 'tractor'
  | 'comms'
  | 'medic'
  | 'supply'
  | 'damagecontrol'
  | 'electrical'
  | 'flightops'
  // Aircrew: the people who actually fly the aircraft. Unlike every other
  // trade they are assigned to an airframe rather than a compartment.
  | 'pilot'
  | 'aircrew';

export type AttrId =
  | 'technical'
  | 'discipline'
  | 'speed'
  | 'stamina'
  | 'leadership'
  | 'stress'
  | 'experience';

export type TraitId = 'ambition' | 'teamwork' | 'risk' | 'adaptability' | 'loyalty';

export type SupplyId = 'food' | 'medical' | 'parts' | 'fuel' | 'general' | 'ammo';

export type Tempo = 'low' | 'normal' | 'high' | 'maximum';

/**
 * Where the ship is in the mission cycle.
 *
 *   port -> outbound -> on station -> inbound -> port
 *
 * Purchases, recruitment and deliveries only happen alongside in port. The
 * mission only advances on station; transit is time you pay for.
 */
export type CarrierStatus = 'port' | 'outbound' | 'onstation' | 'inbound';

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Ship structure
// ---------------------------------------------------------------------------

export type RoomKind =
  | 'work'
  | 'hangar'
  | 'flight'
  | 'berthing'
  | 'mess'
  | 'medical'
  | 'training'
  | 'store'
  | 'command'
  | 'elevator'
  | 'stairs';

export type PropKind =
  | 'console'
  | 'bench'
  | 'crate'
  | 'bunk'
  | 'table'
  | 'toolrack'
  | 'radar'
  | 'locker'
  | 'catapult'
  | 'arrestor'
  | 'plot';

export interface RoomDef {
  id: string;
  deck: number;
  name: string;
  short: string;
  kind: RoomKind;
  department: DeptId;
  rect: Rect;
  /** Specialties whose work happens here; drives assignment suggestions. */
  specialties: SpecialtyId[];
  capacity: number;
  /** Decks this connects to (elevators/stairs only). */
  connects?: number[];
  /** Decorative object markers, in room-local tile coordinates. */
  props?: { x: number; y: number; kind: PropKind }[];
}

export interface DeckDef {
  index: number;
  id: string;
  name: string;
  short: string;
  w: number;
  h: number;
  /** Hull silhouette: the walkable span of each row, in tiles. */
  hull: { y: number; x0: number; x1: number }[];
  rooms: RoomDef[];
}

/**
 * A post: the function someone is appointed to, rather than the compartment
 * they stand in. See `data/posts.ts` for why the distinction matters.
 */
export interface PostDef {
  id: string;
  name: string;
  short: string;
  department: DeptId;
  /** Trades the post is for. One today; the shape allows more. */
  specialties: SpecialtyId[];
  /** Every compartment the post's people work in. */
  rooms: string[];
  /** Where they muster when nothing is pulling them elsewhere. */
  primaryRoom: string;
  /**
   * Established strength. Null where the establishment is set somewhere else
   * — the squadrons are sized by the air wing's seats, not by the ship.
   */
  billets: number | null;
}

/** Mutable per-room state. */
export interface RoomState {
  id: string;
  condition: number;
  /** 0..100, recomputed each day, drives the visual activity level. */
  activity: number;
  workload: number;
  efficiency: number;
  /** Facility upgrade level 1..5 (spec section 62). */
  level: number;
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

export type HealthState = 'healthy' | 'sick' | 'injured' | 'hospitalized';

export type CrewStatus =
  | 'working'
  | 'resting'
  | 'training'
  | 'mentoring'
  | 'sick'
  | 'injured'
  | 'leave'
  | 'emergency';

/**
 * A deferred, translatable message. The simulation records what happened as
 * a key plus its values; the language is chosen at render time, so switching
 * language re-labels the existing campaign history rather than only new text.
 *
 *  - `vars`  are substituted verbatim (names, numbers, tail codes)
 *  - `tvars` are themselves translated first (room names, ranks, courses)
 */
export interface LogNote {
  key: string;
  vars?: Record<string, string | number>;
  tvars?: Record<string, string>;
}

export interface CareerEntry {
  day: number;
  key: string;
  vars?: Record<string, string | number>;
  tvars?: Record<string, string>;
}

export interface CrewMember {
  id: string;
  name: string;
  /** Index into RANKS. */
  rank: number;
  position: string;
  department: DeptId;
  primary: SpecialtyId;
  secondary: SpecialtyId | null;
  attrs: Record<AttrId, number>;
  traits: Record<TraitId, number>;
  skills: Partial<Record<SpecialtyId, number>>;
  morale: number;
  fatigue: number;
  health: HealthState;
  status: CrewStatus;
  /** Days remaining of leave / sickness / injury. */
  awayDays: number;
  /** The function they are appointed to; the assignment the player makes. */
  postId: string;
  /**
   * Which of their post's compartments they are working in today. Derived by
   * `stationCrew()` from where the work is, not set by hand.
   */
  assignmentRoomId: string;
  berthRoomId: string;
  loc: { deck: number; x: number; y: number };
  /** What they are doing right now, deferred for translation. */
  taskNote: LogNote;
  trainingId: string | null;
  trainingDaysLeft: number;
  completedTraining: string[];
  mentorOf: string | null;
  daysAboard: number;
  consecutiveWorkDays: number;
  /** Sorties flown as assigned aircrew, over the whole career. */
  sortiesFlown: number;
  /** Flying days in a row. Repeated tasking is what wears aircrew out. */
  consecutiveFlyingDays: number;
  career: CareerEntry[];
  /** Cached each day so the UI can show a promotion badge. */
  promotable: boolean;
}

// ---------------------------------------------------------------------------
// Aircraft
// ---------------------------------------------------------------------------

/**
 * What an airframe is doing today. The player sets this each turn; it is the
 * main lever on whether a mission actually advances (spec sections 41-45).
 */
export type AircraftDuty =
  | 'strike'
  | 'cap'
  | 'recon'
  | 'lift'
  | 'asw'
  | 'tanker'
  | 'escort'
  | 'planeguard'
  | 'training'
  | 'alert'
  | 'maintenance'
  | 'standdown';

export const FLYING_DUTIES: AircraftDuty[] = [
  'strike',
  'cap',
  'recon',
  'lift',
  'asw',
  'tanker',
  'escort',
  'planeguard',
  'training',
];

export type AircraftState =
  | 'stored'
  | 'maintenance'
  | 'ready'
  | 'launching'
  | 'airborne'
  | 'recovering'
  | 'damaged';

export interface AircraftTypeDef {
  id: string;
  name: string;
  role: 'fighter' | 'ew' | 'aew' | 'helo' | 'transport' | 'uav';
  /** Tiles occupied when parked, for drawing and spacing. */
  size: { w: number; h: number };
  crewRequired: number;
  fuelBurn: number;
  sortieValue: number;
  /** Procurement. Prestige gates access to the better airframes. */
  costCredits: number;
  costPrestige: number;
  minPrestige: number;
  /** Days between placing the order and the airframe arriving aboard. */
  leadDays: number;
  /**
   * Side number the type's airframes are painted with, following the real
   * carrier convention (100s and 300s strike fighters, 400s the Marine
   * detachment, 500s Growlers, 600s Hawkeyes, 700s HSM).
   */
  modexBase: number;
  /**
   * Where this type differs from its role on a duty: the F-35C cannot carry
   * a refuelling store, the MH-60R hunts submarines, the MH-60S is the
   * plane guard. Missing entries fall back to the role.
   */
  duties?: Partial<Record<AircraftDuty, number>>;
}

/**
 * Purchasable equipment. Each item feeds exactly one simulation term, so the
 * player can reason about what a purchase actually buys.
 */
export type EquipmentEffect =
  | { t: 'sortieCapacity'; v: number }
  | { t: 'maintenanceSpeed'; v: number }
  | { t: 'partsEfficiency'; v: number }
  | { t: 'accidentRisk'; v: number }
  | { t: 'emergencyDamage'; v: number }
  | { t: 'restRate'; v: number }
  | { t: 'missionRisk'; v: number }
  | { t: 'aircraftWear'; v: number };

export interface EquipmentDef {
  id: string;
  name: string;
  category: 'deck' | 'maintenance' | 'safety' | 'crew' | 'weapons' | 'operations';
  description: string;
  effect: EquipmentEffect;
  effectText: string;
  costCredits: number;
  costPrestige: number;
  minPrestige: number;
  /** How many of this item the ship can usefully hold. */
  max: number;
  leadDays: number;
}

/** An order placed but not yet delivered. */
export interface Delivery {
  id: string;
  kind: 'aircraft' | 'equipment';
  refId: string;
  orderedDay: number;
  arrivesDay: number;
}

export interface WorkOrder {
  id: string;
  aircraftId: string;
  system: 'engine' | 'avionics' | 'airframe' | 'weapons';
  specialty: SpecialtyId;
  roomId: string;
  labourRequired: number;
  labourDone: number;
  partsRequired: number;
  partsDrawn: boolean;
  severity: number;
  openedDay: number;
}

export interface Aircraft {
  id: string;
  tail: string;
  typeId: string;
  squadron: string;
  state: AircraftState;
  deck: number;
  x: number;
  y: number;
  systems: { engine: number; avionics: number; airframe: number };
  fuel: number;
  weapons: number;
  flightHours: number;
  sortiesToday: number;
  /** Today's tasking. Persists between days until the player changes it. */
  duty: AircraftDuty;
  /**
   * Named aircrew, one entry per seat, always `crewRequired` long. Index 0 is
   * the aircraft commander and must be a pilot; the rest are mission crew.
   * An empty string is a vacant seat.
   */
  crewIds: string[];
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export type TrainingCategory = 'basic' | 'specialty' | 'advanced' | 'leadership';

export interface TrainingCourseDef {
  id: string;
  name: string;
  category: TrainingCategory;
  days: number;
  cost: number;
  /** Skill gain applied on completion. */
  skillGain?: { specialty: SpecialtyId | 'primary'; min: number; max: number };
  attrGain?: Partial<Record<AttrId, [number, number]>>;
  requiresInstructor: boolean;
  description: string;
  /** Minimum values required to enrol. */
  requires?: Partial<Record<AttrId, number>>;
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

export type MissionCategory =
  | 'humanitarian'
  | 'maritime'
  | 'air'
  | 'fleet'
  | 'intel'
  | 'combat'
  | 'crisis';

export interface MissionRequirements {
  aircraftReady?: number;
  crewReadiness?: number;
  engineering?: number;
  operations?: number;
  fuel?: number;
  overall?: number;
}

/** The mechanic that makes an operation play its own way. See `core/operations.ts`. */
export type MechanicId = 'contacts' | 'threat' | 'casualties' | 'window' | 'escalation';

/** The running state of a mission's mechanic. Only the fields it uses are set. */
export interface MechanicState {
  found?: number;
  identified?: number;
  threat?: number;
  threatTomorrow?: number;
  leakers?: number;
  evacuees?: number;
  injured?: number;
  intel?: number;
  windowDays?: number;
  windows?: number;
  tension?: number;
}

export interface MissionDef {
  id: string;
  title: string;
  category: MissionCategory;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Days of work in the operating area, excluding the passage there. */
  days: number;
  /** Days of transit each way. The ship pays this twice per mission. */
  transitDays: number;
  requirements: MissionRequirements;
  recommended: string[];
  objectives: string[];
  rewardCredits: number;
  rewardPrestige: number;
  minPrestige: number;
  eventPool: string[];
  /**
   * How much each duty counts toward this mission's daily objective, and the
   * weighted sortie contribution needed for a full day's progress. This is
   * what makes the tasking order a real decision rather than a formality.
   */
  dutyWeights: Partial<Record<AircraftDuty, number>>;
  sortiesRequired: number;
  /** What makes this operation play its own way, if anything. */
  mechanic?: MechanicId;
}

export type MissionOutcome =
  | 'outstanding'
  | 'success'
  | 'partial'
  | 'failure'
  | 'catastrophic';

export interface ActiveMission {
  defId: string;
  startedDay: number;
  progress: number;
  daysElapsed: number;
  /** Running record of complications, shown in the mission panel. */
  log: { day: number; note: LogNote }[];
  /** Accumulated modifiers from event choices. */
  progressModifier: number;
  riskModifier: number;
  /**
   * Progress banked by work-up training on the passage out, applied the
   * first day on station. Optional for saves from before it existed.
   */
  prep?: number;
  /** The mission's own mechanic. Optional for saves from before it existed. */
  mech?: MechanicState;
}

export type CampaignMode = 'deployment' | 'career';

/** One sortie, as the flight-operations sequence replays it. */
export interface FlightRecord {
  aircraftId: string;
  typeId: string;
  squadron: string;
  tail: string;
  duty: AircraftDuty;
  /** Where the airframe was spotted when the day began. */
  deck: number;
  x: number;
  y: number;
  /** Came back with a fault written up. */
  damaged: boolean;
}

/** A seat on the commanding officer's council. See `core/council.ts`. */
export type SeatId =
  | 'xo'
  | 'airboss'
  | 'cag'
  | 'ops'
  | 'nav'
  | 'warfare'
  | 'cheng'
  | 'supply'
  | 'it'
  | 'cmc';

/**
 * A senior officer (or the command master chief): a department head, kept
 * apart from the ship's company. The player is the commanding officer; these
 * are the people around the table.
 */
export interface Officer {
  id: string;
  name: string;
  /** Rank code: CAPT, CDR, LCDR or CMDCM. */
  rankCode: string;
  /** The seat this officer is qualified for. */
  seat: SeatId;
  /** Skill in that seat's domain, 0-100. */
  competence: number;
  /** 0 cautious .. 100 bold. Colours their advice and how they run things. */
  temperament: number;
  /** Their opinion of the commanding officer, -100..100. */
  opinion: number;
  ambition: number;
  /** Decisions in a row that went against their advice. */
  ignored: number;
  daysInPost: number;
}

export interface CouncilState {
  /** The sitting officer per seat; a missing seat is vacant. */
  seats: Partial<Record<SeatId, Officer>>;
  /** Seats whose domain the officer runs on their own. */
  delegated: Partial<Record<SeatId, boolean>>;
  /** Officers available to take a seat, refreshed each time the ship comes alongside. */
  candidates: Officer[];
  /** Monotonic counter for officer ids. */
  seq: number;
}

/** How a department rotates its people through rest. See `core/watch.ts`. */
export type WatchPolicy = 'surge' | 'standard' | 'rotation';

/** One readiness component that moved today, and why. */
export interface ReadinessDriver {
  component: keyof Omit<ReadinessBreakdown, 'overall'>;
  /** Effect on overall readiness, in points. */
  impact: number;
  /** The underlying cause, as a deferred note. */
  cause: LogNote;
}

export interface MissionRecord {
  defId: string;
  title: string;
  startedDay: number;
  endedDay: number;
  outcome: MissionOutcome;
  prestige: number;
  credits: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventCategory =
  | 'personnel'
  | 'training'
  | 'mechanical'
  | 'aircraft'
  | 'medical'
  | 'morale'
  | 'operational'
  | 'mission'
  | 'weather'
  | 'logistics'
  | 'command'
  | 'emergency'
  | 'narrative';

export type Scope =
  | { kind: 'all' }
  | { kind: 'onduty' }
  | { kind: 'department'; department: DeptId }
  | { kind: 'room'; roomId: string }
  | { kind: 'subject' }
  | { kind: 'crew'; crewId: string };

export type Effect =
  | { t: 'credits'; v: number }
  | { t: 'prestige'; v: number }
  | { t: 'morale'; v: number; scope?: Scope }
  | { t: 'fatigue'; v: number; scope?: Scope }
  | { t: 'xp'; v: number; scope?: Scope }
  | { t: 'skill'; specialty: SpecialtyId | 'primary'; v: number; scope?: Scope }
  | { t: 'supply'; k: SupplyId; v: number }
  | { t: 'missionProgress'; v: number }
  | { t: 'missionRisk'; v: number }
  | { t: 'roomCondition'; v: number; department?: DeptId; roomId?: string }
  | { t: 'aircraftDamage'; count: number; amount: number }
  | { t: 'aircraftRepair'; count: number; amount: number }
  | { t: 'workOrder'; count: number; severity?: number }
  | { t: 'injure'; count: number; days: number; scope?: Scope }
  | { t: 'leave'; days: number; scope?: Scope }
  | { t: 'schedule'; eventId: string; inDays: number; chance?: number }
  | { t: 'flag'; key: string; v: number }
  | { t: 'tempo'; v: Tempo }
  | { t: 'mech'; key: keyof MechanicState; v: number }
  | { t: 'log'; text: string };

export interface EventContext {
  day: number;
  prestige: number;
  credits: number;
  tempo: Tempo;
  readiness: number;
  avgMorale: number;
  avgFatigue: number;
  supplies: Record<SupplyId, number>;
  missionActive: boolean;
  missionProgress: number;
  missionDifficulty: number;
  openWorkOrders: number;
  flags: Record<string, number>;
  injuredCount: number;
  readyAircraft: number;
  status: CarrierStatus;
  /** The active mission's mechanic and its key figures, for event conditions. */
  mechanic: MechanicId | null;
  unidentified: number;
  threatTomorrow: number;
  leakers: number;
  evacuees: number;
  intel: number;
  windowOpen: boolean;
  tension: number;
}

export interface EventChoice {
  label: string;
  hint?: string;
  effects: Effect[];
}

export interface EventDef {
  id: string;
  title: string;
  category: EventCategory;
  /** Base selection weight before condition and cooldown filtering. */
  weight: number;
  /** Priority events pre-empt the ordinary pool (emergencies, story beats). */
  priority?: number;
  cooldown: number;
  minDay?: number;
  /** Only draws when true. */
  condition?: (ctx: EventContext) => boolean;
  /** Picks a crew member or aircraft as the event subject. */
  subject?: 'crew' | 'senior' | 'junior' | 'tired' | 'injured' | 'aircraft' | null;
  /** {subject}, {rank}, {room}, {dept} are substituted. */
  body: string;
  choices: EventChoice[];
  /** Chained events fire on their scheduled day and skip weighting. */
  chained?: boolean;
}

export interface PendingEvent {
  defId: string;
  subjectId: string | null;
  subjectName: string;
  title: string;
  /** Deferred so the card re-renders in whichever language is active. */
  body: LogNote;
  category: EventCategory;
}

export interface ScheduledEvent {
  defId: string;
  day: number;
  subjectId: string | null;
}

export interface EventLogEntry {
  day: number;
  title: string;
  choice: string;
  category: EventCategory;
}

// ---------------------------------------------------------------------------
// Economy / upgrades
// ---------------------------------------------------------------------------

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Room this upgrade improves. */
  roomId: string;
  /** Cost of reaching level index+2. */
  costCredits: number[];
  costPrestige: number[];
  effectText: string[];
}

export interface Candidate {
  id: string;
  name: string;
  rank: number;
  primary: SpecialtyId;
  department: DeptId;
  attrs: Record<AttrId, number>;
  traits: Record<TraitId, number>;
  skills: Partial<Record<SpecialtyId, number>>;
  costPrestige: number;
  costCredits: number;
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export interface ReadinessBreakdown {
  aircraft: number;
  crew: number;
  engineering: number;
  operations: number;
  weapons: number;
  logistics: number;
  medical: number;
  maintenance: number;
  command: number;
  overall: number;
}

export interface DepartmentState {
  id: DeptId;
  personnel: number;
  required: number;
  workload: number;
  efficiency: number;
  readiness: number;
  morale: number;
  fatigue: number;
  condition: number;
}

// ---------------------------------------------------------------------------
// Daily report
// ---------------------------------------------------------------------------

export interface DailyReport {
  day: number;
  missionTitle: string | null;
  missionProgressDelta: number;
  missionProgress: number;
  missionOutcome: MissionOutcome | null;
  sortiesLaunched: number;
  sortiesRecovered: number;
  /** Today's air tasking outcome, shown in the daily summary. */
  tasking: {
    contribution: number;
    required: number;
    ratio: number;
    grounded: number;
    capacityLimited: boolean;
  };
  maintenanceCompleted: number;
  workOrdersOpened: number;
  trainedToday: number;
  trainingCompleted: { crew: string; course: string }[];
  promotions: string[];
  moraleDelta: number;
  fatigueDelta: number;
  readinessBefore: number;
  readinessAfter: number;
  statusBefore: CarrierStatus;
  statusAfter: CarrierStatus;
  creditsDelta: number;
  prestigeDelta: number;
  casualties: string[];
  notes: LogNote[];
  /**
   * The day's flying, for the flight-operations sequence: who flew, on what
   * duty, from where, and whether they came back with a fault.
   */
  flights?: FlightRecord[];
  /** The readiness components that moved most today, largest first. */
  readinessDrivers?: ReadinessDriver[];
}

// ---------------------------------------------------------------------------
// Campaign state
// ---------------------------------------------------------------------------

export interface GameState {
  version: number;
  seed: number;
  day: number;
  shipName: string;
  tempo: Tempo;
  status: CarrierStatus;
  /** Days left in the current transit leg. Unused in port and on station. */
  statusDaysLeft: number;
  prestige: number;
  credits: number;
  supplies: Record<SupplyId, number>;
  suppliesMax: Record<SupplyId, number>;
  crew: CrewMember[];
  aircraft: Aircraft[];
  workOrders: WorkOrder[];
  /** Monotonic work-order id counter. Lives on the state so ids stay unique
   *  across a save/load cycle and never collide between campaigns. */
  workOrderSeq: number;
  rooms: Record<string, RoomState>;
  mission: ActiveMission | null;
  /** Mission ids currently on the board for the player to accept. */
  missionOffers: string[];
  missionHistory: MissionRecord[];
  pendingEvents: PendingEvent[];
  scheduledEvents: ScheduledEvent[];
  eventLog: EventLogEntry[];
  eventCooldowns: Record<string, number>;
  flags: Record<string, number>;
  candidates: Candidate[];
  upgrades: Record<string, number>;
  /** Equipment held aboard, by item id. */
  equipment: Record<string, number>;
  /** Orders in transit. Delivered during the daily resolution. */
  deliveries: Delivery[];
  deliverySeq: number;
  readiness: ReadinessBreakdown;
  departments: Record<string, DepartmentState>;
  lastReport: DailyReport | null;
  /**
   * Which campaign this is. A deployment is the short, graded campaign with
   * a fixed horizon; a career runs until prestige or failure ends it.
   * Optional so saves from before deployments existed load as careers.
   */
  campaign?: { mode: CampaignMode };
  /** Notifications, newest first; capped. Optional for older saves. */
  journal?: { day: number; note: LogNote }[];
  /** The commanding officer's council. Optional for saves from before it. */
  council?: CouncilState;
  /** Watch bill by department; a missing entry is the default policy. */
  watchPolicy?: Partial<Record<DeptId, WatchPolicy>>;
  /** Set when the campaign is won or lost. `stars` grades a deployment. */
  campaignEnd: { day: number; won: boolean; reason: string; stars?: number } | null;
  totalCasualties: number;
  sortieTotal: number;
}
