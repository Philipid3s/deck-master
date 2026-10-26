import { clamp, Rng } from './rng';
import type {
  AttrId,
  CrewMember,
  DeptId,
  GameState,
  LogNote,
  SpecialtyId,
  TraitId,
} from './types';
import { gateFor, rank, MAX_RANK } from '../data/ranks';
import { SPECIALTIES } from '../data/specialties';
import { getRoom, workstations } from '../data/decks';
import { POSTS, postForSpecialty } from '../data/posts';
import { randomName } from '../data/names';
import { trainingCourse } from '../data/training';

export const ATTR_IDS: AttrId[] = [
  'technical',
  'discipline',
  'speed',
  'stamina',
  'leadership',
  'stress',
  'experience',
];

export const TRAIT_IDS: TraitId[] = ['ambition', 'teamwork', 'risk', 'adaptability', 'loyalty'];

export const ATTR_LABELS: Record<AttrId, string> = {
  technical: 'Technical',
  discipline: 'Discipline',
  speed: 'Speed',
  stamina: 'Stamina',
  leadership: 'Leadership',
  stress: 'Stress Resist.',
  experience: 'Experience',
};

export const TRAIT_LABELS: Record<TraitId, string> = {
  ambition: 'Ambition',
  teamwork: 'Teamwork',
  risk: 'Risk Tolerance',
  adaptability: 'Adaptability',
  loyalty: 'Loyalty',
};

// ---------------------------------------------------------------------------
// Progression curve (spec section 25)
// ---------------------------------------------------------------------------

/**
 * How readily a stat still grows at its current value. Deliberately steep:
 * the difference between a 60 and an 80 technician is many weeks of work,
 * which is what makes an exceptional crew member worth remembering.
 */
export function growthFactor(value: number): number {
  if (value < 30) return 1.0;
  if (value < 60) return 0.55;
  if (value < 80) return 0.28;
  if (value < 95) return 0.11;
  return 0.035;
}

/** Raise a stat by `amount`, damped by the progression curve. */
export function grow(current: number, amount: number): number {
  if (amount <= 0) return clamp(current + amount, 0, 100);
  return clamp(current + amount * growthFactor(current), 0, 100);
}

export function skillOf(crew: CrewMember, specialty: SpecialtyId): number {
  return crew.skills[specialty] ?? 0;
}

export function primarySkill(crew: CrewMember): number {
  return skillOf(crew, crew.primary);
}

/**
 * How much useful work this person does today, 0..~1.4.
 *
 * Fatigue is the dominant negative term (spec section 26) and morale the
 * secondary one (spec section 27); an exhausted expert is worse than a
 * rested average hand, which is the whole point of the fatigue system.
 */
export function effectiveness(crew: CrewMember, specialty?: SpecialtyId): number {
  if (!isAvailable(crew)) return 0;
  const skill = specialty ? relevantSkill(crew, specialty) : primarySkill(crew);
  const base = (crew.attrs.technical * 0.4 + skill * 0.45 + crew.attrs.speed * 0.15) / 100;

  // Fatigue: mild below 40, punishing above 70.
  const f = crew.fatigue;
  const fatigueMod = f <= 40 ? 1 - f * 0.0015 : 0.94 - (f - 40) * 0.009;

  // Morale swings output by roughly +/-15%.
  const moraleMod = 0.85 + (crew.morale / 100) * 0.3;

  // Discipline reduces wasted effort; stamina holds output through long days.
  const disciplineMod = 0.9 + (crew.attrs.discipline / 100) * 0.2;
  const staminaMod = 0.92 + (crew.attrs.stamina / 100) * 0.16;

  return Math.max(0, base * fatigueMod * moraleMod * disciplineMod * staminaMod * 1.35);
}

/** Primary skill counts fully; the secondary specialty at 65%. */
export function relevantSkill(crew: CrewMember, specialty: SpecialtyId): number {
  if (crew.primary === specialty) return skillOf(crew, specialty);
  if (crew.secondary === specialty) return skillOf(crew, specialty) * 0.65;
  // Cross-trade work is possible but poor.
  return skillOf(crew, specialty) * 0.4;
}

/** Probability this person makes a consequential mistake today. */
export function mistakeChance(crew: CrewMember): number {
  const fatigueTerm = Math.pow(crew.fatigue / 100, 2) * 0.22;
  const disciplineTerm = (1 - crew.attrs.discipline / 100) * 0.06;
  const skillTerm = (1 - primarySkill(crew) / 100) * 0.05;
  const moraleTerm = crew.morale < 40 ? (40 - crew.morale) * 0.0015 : 0;
  return clamp(fatigueTerm + disciplineTerm + skillTerm + moraleTerm, 0.002, 0.5);
}

export function isAvailable(crew: CrewMember): boolean {
  return (
    crew.health === 'healthy' &&
    crew.status !== 'leave' &&
    crew.status !== 'sick' &&
    crew.status !== 'injured' &&
    crew.status !== 'training'
  );
}

/** Counts toward crew readiness — on the ship and fit, even if resting. */
export function isAboardAndFit(crew: CrewMember): boolean {
  return crew.health === 'healthy' && crew.status !== 'leave';
}

// ---------------------------------------------------------------------------
// Experience and promotion
// ---------------------------------------------------------------------------

/** Daily or event experience. Feeds experience, primary skill and technical. */
export function gainExperience(crew: CrewMember, xp: number): void {
  if (xp <= 0) return;
  crew.attrs.experience = grow(crew.attrs.experience, xp * 0.06);
  crew.skills[crew.primary] = grow(primarySkill(crew), xp * 0.05);
  crew.attrs.technical = grow(crew.attrs.technical, xp * 0.02);
  if (crew.secondary) {
    crew.skills[crew.secondary] = grow(skillOf(crew, crew.secondary), xp * 0.015);
  }
}

export interface PromotionCheck {
  eligible: boolean;
  gate: ReturnType<typeof gateFor>;
  /** Deferred so each shortfall renders in the active language. */
  unmet: LogNote[];
}

export function checkPromotion(crew: CrewMember): PromotionCheck {
  const gate = gateFor(crew.rank);
  if (!gate) {
    return {
      eligible: false,
      gate: null,
      unmet: [{ key: 'Already at the highest rank aboard' }],
    };
  }

  const unmet: LogNote[] = [];
  for (const [attr, min] of Object.entries(gate.requires) as [AttrId, number][]) {
    if (crew.attrs[attr] < min) {
      unmet.push({
        key: '{label} {actual} / {min}',
        vars: { actual: Math.round(crew.attrs[attr]), min },
        tvars: { label: ATTR_LABELS[attr] },
      });
    }
  }
  if (primarySkill(crew) < gate.primarySkill) {
    unmet.push({
      key: '{label} skill {actual} / {min}',
      vars: { actual: Math.round(primarySkill(crew)), min: gate.primarySkill },
      tvars: { label: SPECIALTIES[crew.primary].short },
    });
  }
  for (const courseId of gate.training) {
    if (!crew.completedTraining.includes(courseId)) {
      unmet.push({
        key: 'Training: {course}',
        tvars: { course: trainingCourse(courseId).name },
      });
    }
  }
  return { eligible: unmet.length === 0, gate, unmet };
}

/**
 * Applies a promotion. Note what this deliberately does NOT do: it does not
 * improve the crew member's technical output. A promoted specialist spends
 * more time supervising, which is the trade-off in spec section 33.
 */
export function promote(state: GameState, crew: CrewMember): boolean {
  const check = checkPromotion(crew);
  if (!check.eligible || crew.rank >= MAX_RANK) return false;
  crew.rank += 1;
  crew.position = positionTitle(crew);
  crew.morale = clamp(crew.morale + 12, 0, 100);
  crew.career.push({
    day: state.day,
    key: 'Promoted to {rank}',
    tvars: { rank: rank(crew.rank).name },
  });
  return true;
}

/**
 * Position title as a template plus the specialty it names. Five templates
 * cover every rank, so translating a position is five strings rather than
 * one per rank-and-trade combination.
 */
export function positionParts(crew: CrewMember): { key: string; spec: string } {
  const spec = SPECIALTIES[crew.primary];
  if (crew.rank >= 5) return { key: '{spec} Division Chief', spec: spec.short };
  if (crew.rank === 4) return { key: '{spec} Division Supervisor', spec: spec.short };
  if (crew.rank === 3) return { key: 'Senior {spec}', spec: spec.name };
  if (crew.rank >= 1) return { key: '{spec}', spec: spec.name };
  return { key: 'Junior {spec}', spec: spec.name };
}

/** Position title is derived from rank + specialty, and stays a job, not a grade. */
export function positionTitle(crew: CrewMember): string {
  const parts = positionParts(crew);
  return parts.key.replace('{spec}', parts.spec);
}

/** Leadership drag: a supervisor with poor leadership hurts their division. */
export function supervisionQuality(crew: CrewMember): number {
  if (crew.rank < 4) return 0;
  return (crew.attrs.leadership - 50) / 50; // -1 .. +1
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const BERTHS = ['d5-berth1', 'd5-berth2', 'd5-berth3'];

export function createCrewMember(
  rng: Rng,
  usedNames: Set<string>,
  opts: {
    id: string;
    primary: SpecialtyId;
    rankIndex: number;
    /** Mean of the attribute rolls; higher for veterans and elite recruits. */
    quality: number;
    day: number;
    roomId?: string;
  },
): CrewMember {
  const spec = SPECIALTIES[opts.primary];
  const q = opts.quality;

  const attrs = {
    technical: rng.statRoll(q, 12, 8, 99),
    discipline: rng.statRoll(q - 2, 13, 8, 99),
    speed: rng.statRoll(q - 4, 14, 8, 99),
    stamina: rng.statRoll(q - 3, 13, 8, 99),
    // Leadership is deliberately decoupled from technical ability — this is
    // what makes the promotion trade-off in spec section 33 bite.
    leadership: rng.statRoll(q - 18, 18, 5, 99),
    stress: rng.statRoll(q - 6, 15, 8, 99),
    experience: rng.statRoll(Math.min(q, 14 + opts.rankIndex * 13), 10, 2, 99),
  } as Record<AttrId, number>;

  const traits = {
    ambition: rng.statRoll(50, 22),
    teamwork: rng.statRoll(55, 20),
    risk: rng.statRoll(48, 24),
    adaptability: rng.statRoll(52, 20),
    loyalty: rng.statRoll(56, 20),
  } as Record<TraitId, number>;

  const skills: Partial<Record<SpecialtyId, number>> = {};
  skills[opts.primary] = rng.statRoll(q + 4, 12, 10, 99);

  // A secondary specialty from the same department, at a much lower level.
  const sameDept = (Object.keys(SPECIALTIES) as SpecialtyId[]).filter(
    (s) => s !== opts.primary && SPECIALTIES[s].department === spec.department,
  );
  const secondary = sameDept.length > 0 && rng.chance(0.6) ? rng.pick(sameDept) : null;
  if (secondary) skills[secondary] = rng.statRoll(q * 0.45, 12, 3, 70);

  // Appointed to the post their trade belongs to; which of the post's spaces
  // they actually stand in is settled by `stationCrew()`.
  const post = postForSpecialty(opts.primary);
  const roomId = opts.roomId ?? rng.pick(post.rooms);
  const room = getRoom(roomId);
  const stations = workstations(room);
  const station = stations.length > 0 ? rng.pick(stations) : { x: room.rect.x + 1, y: room.rect.y + 1 };

  const crew: CrewMember = {
    id: opts.id,
    name: randomName(rng, usedNames),
    rank: opts.rankIndex,
    position: '',
    department: spec.department,
    primary: opts.primary,
    secondary,
    attrs,
    traits,
    skills,
    morale: rng.statRoll(72, 10, 35, 96),
    fatigue: rng.statRoll(20, 10, 0, 55),
    health: 'healthy',
    status: 'working',
    awayDays: 0,
    postId: post.id,
    assignmentRoomId: roomId,
    berthRoomId: rng.pick(BERTHS),
    loc: { deck: room.deck, x: station.x, y: station.y },
    taskNote: defaultTask(opts.primary),
    trainingId: null,
    trainingDaysLeft: 0,
    completedTraining: opts.rankIndex >= 1 ? ['basic-safety'] : [],
    mentorOf: null,
    daysAboard: rng.int(20, 400) + opts.rankIndex * 60,
    consecutiveWorkDays: rng.int(0, 5),
    sortiesFlown: 0,
    consecutiveFlyingDays: 0,
    career: [],
    promotable: false,
  };
  crew.position = positionTitle(crew);
  crew.career.push({ day: -crew.daysAboard, key: 'Reported aboard' });
  if (opts.rankIndex >= 2) {
    crew.career.push({
      day: -Math.floor(crew.daysAboard * 0.6),
      key: 'Advanced to {rank}',
      tvars: { rank: rank(opts.rankIndex).name },
    });
  }
  return crew;
}

/** Exported so the translation coverage test can walk it. */
export const DEFAULT_TASKS: Record<SpecialtyId, string> = {
    avionics: 'Avionics bench check',
    engine: 'Engine turn-up inspection',
    airframe: 'Panel and structure inspection',
    weapons: 'Ordnance handling drill',
    radar: 'Air picture watch',
    aircontrol: 'Marshal and approach control',
    handling: 'Deck respot',
    tractor: 'Aircraft towing',
    comms: 'Circuit monitoring',
    medic: 'Sick call',
    supply: 'Stores issue',
    damagecontrol: 'Compartment inspection rounds',
    electrical: 'Switchboard rounds',
  flightops: 'Launch cycle coordination',
  pilot: 'Mission brief and flight planning',
  aircrew: 'Mission systems preparation',
};

function defaultTask(specialty: SpecialtyId): LogNote {
  return { key: DEFAULT_TASKS[specialty] };
}

/**
 * The ship's company at campaign start, taken from the posts' established
 * strength so the establishment is stated in exactly one place. Posts with no
 * billets of their own — the squadrons — are manned by the air wing instead.
 */
export const CREW_COMPOSITION: { specialty: SpecialtyId; count: number }[] = POSTS.filter(
  (p) => p.billets !== null,
).map((p) => ({ specialty: p.specialties[0]!, count: p.billets! }));

/** Rank distribution: a broad base of juniors under a few chiefs. */
export function rollRank(rng: Rng): number {
  const roll = rng.float();
  if (roll < 0.26) return 0;
  if (roll < 0.52) return 1;
  if (roll < 0.74) return 2;
  if (roll < 0.88) return 3;
  if (roll < 0.96) return 4;
  if (roll < 0.99) return 5;
  return 6;
}

export function generateCompany(rng: Rng, day: number): CrewMember[] {
  const crew: CrewMember[] = [];
  const used = new Set<string>();
  let n = 1;
  for (const entry of CREW_COMPOSITION) {
    for (let i = 0; i < entry.count; i++) {
      const rankIndex = rollRank(rng);
      // Seniors are better, but with real variance so a weak chief is possible.
      const quality = clamp(rng.statRoll(38 + rankIndex * 8, 9, 15, 92), 15, 92);
      crew.push(
        createCrewMember(rng, used, {
          id: `c${String(n).padStart(3, '0')}`,
          primary: entry.specialty,
          rankIndex,
          quality,
          day,
        }),
      );
      n++;
    }
  }
  return crew;
}

// ---------------------------------------------------------------------------
// Lookups used across the UI and simulation
// ---------------------------------------------------------------------------

export function crewById(state: GameState, id: string): CrewMember | undefined {
  return state.crew.find((c) => c.id === id);
}

export function crewInRoom(state: GameState, roomId: string): CrewMember[] {
  return state.crew.filter((c) => c.assignmentRoomId === roomId && isAboardAndFit(c));
}

export function crewInDepartment(state: GameState, dept: DeptId): CrewMember[] {
  return state.crew.filter((c) => c.department === dept);
}

/** Anyone qualified to instruct courses (spec section 30). */
export function hasInstructor(state: GameState, courseId: string): boolean {
  void courseId;
  return state.crew.some(
    (c) => c.completedTraining.includes('lead-mentor') && isAvailable(c),
  );
}

export function statusLabel(crew: CrewMember): string {
  if (crew.health === 'injured' || crew.status === 'injured') return 'INJURED';
  if (crew.health === 'hospitalized') return 'HOSPITAL';
  if (crew.health === 'sick' || crew.status === 'sick') return 'SICK';
  if (crew.status === 'leave') return 'ON LEAVE';
  if (crew.status === 'training') return 'TRAINING';
  if (crew.status === 'resting') return 'RESTING';
  if (crew.status === 'emergency') return 'EMERGENCY';
  if (crew.status === 'mentoring') return 'MENTORING';
  return 'WORKING';
}
