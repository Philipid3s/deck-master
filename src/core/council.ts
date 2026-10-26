import { Rng, clamp } from './rng';
import type {
  CouncilState,
  DeptId,
  Effect,
  EventCategory,
  GameState,
  LogNote,
  Officer,
  SeatId,
  Tempo,
} from './types';
import { DEPT_IDS } from '../data/specialties';
import { randomName } from '../data/names';
import { eventDef } from '../data/events';
import { missionDef } from '../data/missions';
import { seatFactor } from './councilEffects';
import { resolveEvent } from './events';
import { autoAssign, computeTasking, trainOnPassage } from './tasking';
import { effectiveMinPrestige, startMission, successProbability } from './missions';
import { purchaseSupply } from './economy';
import { applyWatchBill, setWatchPolicy, watchPolicy, watchSummary } from './watch';
import { wingCrewReadiness } from './aircrew';
import { isInPort, missionTotalDays } from './status';
import { DEPLOYMENT_DAYS, isDeployment } from './deployment';

/**
 * The commanding officer's council.
 *
 * The player is the captain. Around the table sit the department heads: a
 * separate corps of senior officers, not the ship's company. Each one
 *
 *  - runs a domain, which shows as a standing effect on the simulation
 *    (see `councilEffects.ts`): a gifted Air Boss turns more sorties, a
 *    poor Chief Engineer lets the spaces decay;
 *  - advises on the day's decisions in that domain, coloured by their
 *    temperament (cautious or bold) and right more often the better they
 *    are;
 *  - can be left to run the domain on their own — answering its decisions
 *    and doing its daily work — which saves the captain the clicks and
 *    costs the captain the control;
 *  - has an opinion of the captain, which rises when their advice is taken
 *    and the ship does well, and falls when it is ignored. A department head
 *    who thinks little of the captain does the job at reduced effect.
 */

// ---------------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------------

/** How much an adviser cares about each kind of consequence. */
interface Weights {
  morale: number;
  fatigue: number;
  credits: number;
  prestige: number;
  mission: number;
  risk: number;
  aircraft: number;
  rooms: number;
  supplies: number;
  xp: number;
  injury: number;
}

type Concern = keyof Weights;

const BALANCED: Weights = {
  morale: 1,
  fatigue: 1,
  credits: 1,
  prestige: 1,
  mission: 1,
  risk: 1,
  aircraft: 1,
  rooms: 1,
  supplies: 1,
  xp: 1,
  injury: 1,
};

export interface SeatDef {
  id: SeatId;
  title: string;
  short: string;
  /** Department colour and portrait background. */
  dept: DeptId;
  rankCode: string;
  /** Wears aviator wings in the portrait. */
  aviator: boolean;
  /** What the seat is responsible for. */
  domain: string;
  /** The standing effect, as shown on the council page. */
  effect: string;
  /** What the officer does when left to run the domain. */
  delegation: string;
  /** Event categories this seat advises on and, delegated, answers. */
  categories: EventCategory[];
  /** What this seat's officer cares about, on top of a balanced view. */
  bias: Partial<Weights>;
}

export const SEATS: SeatDef[] = [
  {
    id: 'xo',
    title: 'Executive Officer',
    short: 'XO',
    dept: 'CMD',
    rankCode: 'CAPT',
    aviator: false,
    domain: 'The crew, discipline and the watch bill.',
    effect: 'Accidents and crew morale',
    delegation: 'Sets each department’s watch bill and answers personnel and command decisions.',
    categories: ['personnel', 'command', 'emergency', 'narrative'],
    bias: { fatigue: 1.6, injury: 1.6, morale: 1.3 },
  },
  {
    id: 'airboss',
    title: 'Air Boss',
    short: 'AIR BOSS',
    dept: 'DECK',
    rankCode: 'CDR',
    aviator: true,
    domain: 'The flight deck: launch and recovery, the tempo, deck safety.',
    effect: 'Sortie capacity',
    delegation: 'Sets the operational tempo and answers flight deck decisions.',
    categories: ['operational'],
    bias: { aircraft: 1.5, injury: 1.5, mission: 1.3 },
  },
  {
    id: 'cag',
    title: 'Commander, Air Wing',
    short: 'CAG',
    dept: 'AIR',
    rankCode: 'CAPT',
    aviator: true,
    domain: 'The squadrons: the air tasking order and the aircrew.',
    effect: 'Aircrew fatigue from flying',
    delegation: 'Writes the daily air tasking order, flies work-ups on passage, and answers aircraft and training decisions.',
    categories: ['aircraft', 'training'],
    bias: { aircraft: 1.6, xp: 1.6, mission: 1.3 },
  },
  {
    id: 'ops',
    title: 'Operations Officer',
    short: 'OPS',
    dept: 'OPS',
    rankCode: 'CDR',
    aviator: false,
    domain: 'Which operations the ship takes, and how they are run.',
    effect: 'Mission progress',
    delegation: 'Chooses and accepts operations when the ship is ready, and answers mission decisions.',
    categories: ['mission'],
    bias: { mission: 1.8, prestige: 1.6 },
  },
  {
    id: 'nav',
    title: 'Navigator',
    short: 'NAV',
    dept: 'OPS',
    rankCode: 'CDR',
    aviator: false,
    domain: 'The passage and the weather.',
    effect: 'Crew fatigue on passage',
    delegation: 'Answers weather decisions.',
    categories: ['weather'],
    bias: { risk: 1.4, supplies: 1.3, aircraft: 1.2 },
  },
  {
    id: 'warfare',
    title: 'Warfare Officer',
    short: 'WARFARE',
    dept: 'OPS',
    rankCode: 'CDR',
    aviator: false,
    domain: 'The threat picture, weapons and the risk an operation carries.',
    effect: 'Daily reduction of operational risk',
    delegation: 'Answers risk and operational-threat decisions on missions.',
    categories: ['mission', 'emergency'],
    bias: { risk: 1.8, mission: 1.2 },
  },
  {
    id: 'cheng',
    title: 'Chief Engineer',
    short: 'CHENG',
    dept: 'ENG',
    rankCode: 'CDR',
    aviator: false,
    domain: 'Propulsion, power and the condition of the ship’s spaces.',
    effect: 'Repair rate',
    delegation: 'Answers mechanical decisions.',
    categories: ['mechanical'],
    bias: { rooms: 1.8, aircraft: 1.2, risk: 1.2 },
  },
  {
    id: 'supply',
    title: 'Supply Officer',
    short: 'SUPPO',
    dept: 'SUP',
    rankCode: 'CDR',
    aviator: false,
    domain: 'Stores, the budget and what comes aboard.',
    effect: 'Consumption of stores',
    delegation: 'Restocks stores alongside within a cash reserve, and answers logistics decisions.',
    categories: ['logistics'],
    bias: { credits: 1.8, supplies: 1.6 },
  },
  {
    id: 'it',
    title: 'Information Warfare Officer',
    short: 'IT / IW',
    dept: 'OPS',
    rankCode: 'LCDR',
    aviator: false,
    domain: 'Communications, intelligence and the ship’s networks.',
    effect: 'Accuracy of the whole council’s advice, and mission progress',
    delegation: 'Answers intelligence and narrative decisions.',
    categories: ['narrative'],
    bias: { mission: 1.3, risk: 1.3 },
  },
  {
    id: 'cmc',
    title: 'Command Master Chief',
    short: 'CMC',
    dept: 'CMD',
    rankCode: 'CMDCM',
    aviator: false,
    domain: 'The voice of the enlisted crew: morale, welfare, the deckplates.',
    effect: 'Crew morale',
    delegation: 'Answers morale, medical and personnel decisions.',
    categories: ['morale', 'medical', 'personnel'],
    bias: { morale: 1.9, fatigue: 1.4, injury: 1.4 },
  },
];

export const SEATS_BY_ID = Object.fromEntries(SEATS.map((s) => [s.id, s])) as Record<SeatId, SeatDef>;

export function seatDef(id: SeatId): SeatDef {
  return SEATS_BY_ID[id];
}

/** Temperament in words, for the council page. */
export function temperamentLabel(t: number): string {
  if (t < 34) return 'Cautious';
  if (t < 67) return 'Measured';
  return 'Bold';
}

// ---------------------------------------------------------------------------
// Officers
// ---------------------------------------------------------------------------

function usedNames(state: GameState): Set<string> {
  const used = new Set(state.crew.map((c) => c.name));
  const council = state.council;
  if (council) {
    for (const o of Object.values(council.seats)) if (o) used.add(o.name);
    for (const o of council.candidates) used.add(o.name);
  }
  return used;
}

function makeOfficer(
  council: CouncilState,
  rng: Rng,
  seat: SeatId,
  used: Set<string>,
  candidate: boolean,
): Officer {
  const def = seatDef(seat);
  const name = randomName(rng, used);
  used.add(name);
  // Candidates spread wider than the sitting council: some are better,
  // some are a gamble.
  const competence = candidate ? rng.statRoll(58, 18, 20, 98) : rng.statRoll(60, 13, 30, 92);
  let rankCode = def.rankCode;
  if (candidate && rankCode === 'CDR' && competence < 50) rankCode = 'LCDR';
  if (candidate && rankCode === 'CAPT' && competence < 55) rankCode = 'CDR';
  council.seq++;
  return {
    id: `off-${council.seq}`,
    name,
    rankCode,
    seat,
    competence,
    temperament: rng.int(8, 92),
    opinion: candidate ? rng.int(-5, 25) : rng.int(5, 35),
    ambition: rng.int(5, 95),
    ignored: 0,
    daysInPost: candidate ? 0 : rng.int(30, 600),
  };
}

const CANDIDATES_PER_SEAT = 2;

function refreshCandidates(state: GameState, rng: Rng): void {
  const council = state.council!;
  council.candidates = [];
  const used = usedNames(state);
  for (const def of SEATS) {
    for (let i = 0; i < CANDIDATES_PER_SEAT; i++) {
      council.candidates.push(makeOfficer(council, rng, def.id, used, true));
    }
  }
}

/** Seat a full council. Called when a campaign starts, or lazily for an old save. */
export function ensureCouncil(state: GameState): CouncilState {
  if (state.council) return state.council;
  const rng = Rng.stream(state.seed, 0, 'council');
  const council: CouncilState = { seats: {}, delegated: {}, candidates: [], seq: 0 };
  state.council = council;
  const used = usedNames(state);
  for (const def of SEATS) council.seats[def.id] = makeOfficer(council, rng, def.id, used, false);
  refreshCandidates(state, rng);
  return council;
}

/** Officers come and go only alongside: a relief is flown out to a ship in port. */
export function canChangeCouncil(state: GameState): boolean {
  return isInPort(state);
}

export function appointOfficer(state: GameState, candidateId: string): boolean {
  const council = ensureCouncil(state);
  if (!canChangeCouncil(state)) return false;
  const idx = council.candidates.findIndex((o) => o.id === candidateId);
  if (idx < 0) return false;
  const officer = council.candidates[idx]!;
  council.candidates.splice(idx, 1);
  council.seats[officer.seat] = { ...officer, daysInPost: 0 };
  return true;
}

/** Relieve an officer of their seat. The seat stays vacant until filled. */
export function relieveOfficer(state: GameState, seat: SeatId): boolean {
  const council = ensureCouncil(state);
  if (!council.seats[seat]) return false;
  delete council.seats[seat];
  council.delegated[seat] = false;
  // The rest of the table notices.
  for (const o of Object.values(council.seats)) if (o) o.opinion = clamp(o.opinion - 4, -100, 100);
  return true;
}

export function setDelegated(state: GameState, seat: SeatId, on: boolean): void {
  const council = ensureCouncil(state);
  council.delegated[seat] = on && !!council.seats[seat];
}

export function isDelegated(state: GameState, seat: SeatId): boolean {
  return !!state.council?.delegated[seat] && !!state.council?.seats[seat];
}

// ---------------------------------------------------------------------------
// Advice
// ---------------------------------------------------------------------------

function scopeSize(e: Effect): number {
  const scope = 'scope' in e ? e.scope : undefined;
  if (!scope || scope.kind === 'all' || scope.kind === 'onduty') return 1;
  if (scope.kind === 'department' || scope.kind === 'room') return 0.45;
  return 0.18;
}

/** What one choice is worth, per concern, before weighting. */
function appraise(effects: Effect[], state: GameState): Record<Concern, number> {
  const v: Record<Concern, number> = {
    morale: 0,
    fatigue: 0,
    credits: 0,
    prestige: 0,
    mission: 0,
    risk: 0,
    aircraft: 0,
    rooms: 0,
    supplies: 0,
    xp: 0,
    injury: 0,
  };
  const onMission = state.mission !== null;
  for (const e of effects) {
    switch (e.t) {
      case 'credits':
        v.credits += e.v / 12000;
        break;
      case 'prestige':
        v.prestige += e.v / 4;
        break;
      case 'morale':
        v.morale += e.v * scopeSize(e);
        break;
      case 'fatigue':
        v.fatigue -= e.v * scopeSize(e) * 0.8;
        break;
      case 'xp':
      case 'skill':
        v.xp += e.v * scopeSize(e) * 0.35;
        break;
      case 'supply':
        v.supplies += e.v / 4;
        break;
      case 'missionProgress':
        if (onMission) v.mission += e.v * 0.9;
        break;
      case 'missionRisk':
        if (onMission) v.risk -= e.v * 0.6;
        break;
      case 'roomCondition':
        v.rooms += e.v / 3;
        break;
      case 'aircraftDamage':
        v.aircraft -= (e.count * e.amount) / 8;
        break;
      case 'aircraftRepair':
        v.aircraft += (e.count * e.amount) / 8;
        break;
      case 'workOrder':
        v.aircraft -= e.count * 2;
        break;
      case 'injure':
        v.injury -= e.count * e.days * 0.7;
        break;
      case 'leave':
        v.fatigue += e.days * scopeSize(e) * 0.6;
        v.mission -= onMission ? e.days * scopeSize(e) * 0.3 : 0;
        break;
      case 'schedule':
        // A follow-up nobody can see yet: a risk the cautious weigh heavily.
        v.risk -= 3 * (e.chance ?? 1);
        break;
      default:
        break;
    }
  }
  return v;
}

/** The weights an officer actually decides with: their seat's concerns and temperament. */
function officerWeights(def: SeatDef, officer: Officer): Weights {
  const caution = 1.5 - officer.temperament / 100; // 0.5 bold .. 1.5 cautious
  const daring = 0.5 + officer.temperament / 100; // 0.5 cautious .. 1.5 bold
  const w = { ...BALANCED };
  for (const [k, m] of Object.entries(def.bias) as [Concern, number][]) w[k] *= m;
  w.risk *= caution;
  w.injury *= caution;
  w.aircraft *= 0.6 + caution * 0.4;
  w.mission *= daring;
  w.prestige *= daring;
  return w;
}

function score(v: Record<Concern, number>, w: Weights): number {
  let s = 0;
  for (const k of Object.keys(v) as Concern[]) s += v[k] * w[k];
  return s;
}

const REASONS: Record<Concern, { good: string; bad: string }> = {
  morale: { good: 'The crew will remember this.', bad: 'The crew will take it badly otherwise.' },
  fatigue: { good: 'People need the rest.', bad: 'The others wear people out.' },
  credits: { good: 'It is the cheapest course.', bad: 'We cannot afford the alternatives.' },
  prestige: { good: 'Fleet will notice.', bad: 'Anything less reflects on the ship.' },
  mission: { good: 'It moves the operation forward.', bad: 'The operation cannot wait.' },
  risk: { good: 'It keeps the risk down.', bad: 'The other courses invite trouble later.' },
  aircraft: { good: 'It protects the airframes.', bad: 'The wing cannot spare the airframes.' },
  rooms: { good: 'The ship’s spaces come first.', bad: 'The spaces will not stand much more.' },
  supplies: { good: 'We cannot run short of stores.', bad: 'The stores will not last otherwise.' },
  xp: { good: 'The crew will be better for it.', bad: 'The crew needs the practice.' },
  injury: { good: 'Nobody gets hurt this way.', bad: 'The alternatives will put people in sick bay.' },
};

export interface Advice {
  seat: SeatId;
  officerId: string;
  choiceIndex: number;
  /** English source string; translated by the UI. */
  reason: string;
}

/** The seats that advise on a category, in order of precedence, at most two sitting. */
function advisers(state: GameState, category: EventCategory): SeatId[] {
  const council = state.council;
  if (!council) return [];
  return SEATS.filter((s) => s.categories.includes(category) && council.seats[s.id])
    .map((s) => s.id)
    .slice(0, 2);
}

/**
 * What the council says about one of today's decisions. Deterministic for
 * the day: the same officer gives the same advice however often the card
 * is drawn.
 *
 * A competent officer usually recommends what is genuinely best for the
 * ship; otherwise, or when the call is close, they recommend what their
 * seat and temperament favour — the Supply Officer the cheap option, a
 * cautious XO the safe one. The Information Warfare Officer, sitting,
 * sharpens everyone's picture.
 */
export function adviceFor(state: GameState, pendingIndex: number): Advice[] {
  const pending = state.pendingEvents[pendingIndex];
  if (!pending || !state.council) return [];
  const def = eventDef(pending.defId);
  if (!def || def.choices.length === 0) return [];

  const appraisals = def.choices.map((c) => appraise(c.effects, state));
  const truth = appraisals.map((a) => score(a, BALANCED));
  const out: Advice[] = [];

  for (const seat of advisers(state, pending.category)) {
    const officer = state.council.seats[seat]!;
    const sd = seatDef(seat);
    const rng = Rng.stream(state.seed, state.day, `advice|${pending.defId}|${seat}|${pendingIndex}`);
    const w = officerWeights(sd, officer);
    const intel = seat === 'it' ? 0 : Math.max(0, seatFactor(state, 'it')) * 0.1;
    const accuracy = clamp(0.3 + (officer.competence / 100) * 0.55 + intel, 0.2, 0.95);

    let choiceIndex: number;
    if (rng.chance(accuracy)) {
      // Sound judgement, with a lean toward what the seat cares about.
      const blended = appraisals.map((a, i) => truth[i]! + score(a, w) * 0.25);
      choiceIndex = blended.indexOf(Math.max(...blended));
    } else {
      const biased = appraisals.map((a) => score(a, w) + rng.range(-2, 2));
      choiceIndex = biased.indexOf(Math.max(...biased));
    }

    // The reason is the concern that most separates the pick from the rest.
    const chosen = appraisals[choiceIndex]!;
    const others = appraisals.filter((_, i) => i !== choiceIndex);
    let best: Concern = 'morale';
    let bestGap = -Infinity;
    for (const k of Object.keys(chosen) as Concern[]) {
      const avgOther = others.length ? others.reduce((s, o) => s + o[k], 0) / others.length : 0;
      const gap = (chosen[k] - avgOther) * w[k];
      if (gap > bestGap) {
        bestGap = gap;
        best = k;
      }
    }
    const reason = chosen[best] >= 0 ? REASONS[best].good : REASONS[best].bad;
    out.push({ seat, officerId: officer.id, choiceIndex, reason });
  }
  return out;
}

/**
 * The captain decided. Advisers whose advice was taken think better of the
 * captain; those overruled think less, and more so each time in a row.
 * Call before the event is resolved, while the card still exists.
 */
export function recordDecision(state: GameState, pendingIndex: number, choiceIndex: number): void {
  const council = state.council;
  if (!council) return;
  for (const a of adviceFor(state, pendingIndex)) {
    const o = council.seats[a.seat];
    if (!o) continue;
    if (a.choiceIndex === choiceIndex) {
      o.opinion = clamp(o.opinion + 2, -100, 100);
      o.ignored = 0;
    } else {
      o.ignored++;
      o.opinion = clamp(o.opinion - (2 + Math.min(4, o.ignored)), -100, 100);
    }
  }
}

// ---------------------------------------------------------------------------
// The council's day
// ---------------------------------------------------------------------------

/**
 * Called once at the end of each day. Opinions drift back toward a working
 * baseline, and move with how the ship is doing; a long run of success
 * builds a loyal table, a ship in trouble a restless one.
 */
export function councilDay(state: GameState, missionOutcome: string | null, arrivedInPort: boolean): void {
  const council = ensureCouncil(state);
  const ready = state.readiness.overall;
  for (const o of Object.values(council.seats)) {
    if (!o) continue;
    o.daysInPost++;
    o.opinion += (10 - o.opinion) * 0.03;
    if (ready >= 75) o.opinion += 0.3;
    if (ready < 40) o.opinion -= 0.5;
    if (missionOutcome === 'outstanding' || missionOutcome === 'success') o.opinion += 5;
    if (missionOutcome === 'failure' || missionOutcome === 'catastrophic') o.opinion -= 5;
    if (o.seat === 'supply' && state.credits < 0) o.opinion -= 0.6;
    o.opinion = clamp(o.opinion, -100, 100);
  }
  if (arrivedInPort) refreshCandidates(state, Rng.stream(state.seed, state.day, 'candidates-council'));
}

// ---------------------------------------------------------------------------
// Delegation
// ---------------------------------------------------------------------------

/**
 * Let the delegated officers run their domains: answer the decisions that
 * are theirs, then do the day's work. Called at the end of each day, once
 * tomorrow's decisions are known, and whenever the captain hands a domain
 * over. Everything they do is reported.
 */
export function runDelegations(state: GameState): LogNote[] {
  const council = state.council;
  if (!council) return [];
  const notes: LogNote[] = [];
  const delegated = (seat: SeatId) => isDelegated(state, seat);
  /**
   * Whether an officer gets today's call wrong. Nobody runs a domain as
   * well as an attentive captain would: an average officer misjudges nearly
   * two days in five, a gifted one rarely, a poor one often. That is the
   * price of handing a domain over.
   */
  const misjudges = (seat: SeatId): boolean => {
    const o = council.seats[seat]!;
    const rng = Rng.stream(state.seed, state.day, `misjudge|${seat}`);
    return rng.chance(clamp(0.74 - o.competence / 160, 0.06, 0.65));
  };

  // -- Decisions in their domain ------------------------------------------
  for (let i = state.pendingEvents.length - 1; i >= 0; i--) {
    const pending = state.pendingEvents[i]!;
    const advice = adviceFor(state, i).find((a) => delegated(a.seat));
    if (!advice) continue;
    const def = eventDef(pending.defId);
    const choice = def?.choices[advice.choiceIndex];
    if (!def || !choice) continue;
    resolveEvent(state, Rng.stream(state.seed, state.day, `delegated|${pending.defId}`), i, advice.choiceIndex);
    notes.push({
      key: '{seat} handled “{title}”: {choice}',
      tvars: { seat: seatDef(advice.seat).short, title: def.title, choice: choice.label },
    });
  }

  // -- XO: the watch bill ---------------------------------------------------
  const xo = council.seats.xo;
  if (xo && delegated('xo') && !misjudges('xo')) {
    // A cautious XO rotates watches early; a bold one lets people run.
    const threshold = 28 + xo.temperament * 0.3;
    let changed = 0;
    for (const dept of DEPT_IDS) {
      const fatigue = watchSummary(state, dept).fatigue;
      const current = watchPolicy(state, dept);
      // Never surge: an XO left to it protects the crew.
      const next = fatigue >= threshold ? 'rotation' : fatigue < threshold - 18 ? 'standard' : current === 'surge' ? 'standard' : current;
      if (next !== current) {
        setWatchPolicy(state, dept, next);
        changed++;
      }
    }
    applyWatchBill(state);
    if (changed > 0) notes.push({ key: 'XO revised the watch bill for {n} departments', vars: { n: changed } });
  }

  // -- Supply: restock alongside ----------------------------------------------
  const suppo = council.seats.supply;
  if (suppo && delegated('supply') && isInPort(state) && !misjudges('supply')) {
    const reserve = 220000 - suppo.temperament * 1600;
    const floor = suppo.temperament < 50 ? 70 : 60;
    let bought = 0;
    for (const key of Object.keys(state.supplies) as (keyof typeof state.supplies)[]) {
      if (state.supplies[key] >= floor) continue;
      const before = state.credits;
      const amount = 85 - state.supplies[key];
      // Buy only what the reserve allows.
      if (before - amount * 2100 < reserve) continue;
      if (purchaseSupply(state, key, amount)) bought++;
    }
    if (bought > 0) notes.push({ key: 'Supply Officer restocked {n} kinds of stores', vars: { n: bought } });
  }

  // -- Operations: take the next operation ----------------------------------
  const ops = council.seats.ops;
  if (ops && delegated('ops') && isInPort(state) && !state.mission) {
    const readyAt = 70 - ops.temperament * 0.2;
    const waited = state.flags['opsWaited'] ?? 0;
    if (state.readiness.overall < readyAt && waited < 3) {
      state.flags['opsWaited'] = waited + 1;
    } else {
      // Reward per day at sea, discounted by the odds — a bold officer
      // chases the big operations, a cautious one the sure ones. On a
      // deployment, nothing that cannot finish before the clock runs out.
      const daring = 0.5 + ops.temperament / 100;
      const daysLeft = isDeployment(state) ? DEPLOYMENT_DAYS - state.day + 1 : Infinity;
      // A misjudged day: the first workable offer rather than the best.
      const careless = misjudges('ops');
      const pick = [...state.missionOffers]
        .filter((id) => state.prestige >= effectiveMinPrestige(state, missionDef(id)))
        .filter((id) => missionTotalDays(id) <= daysLeft)
        .map((id) => {
          const def = missionDef(id);
          const p = successProbability(state, def);
          const value =
            (Math.pow(p, 2.5 - daring) * Math.pow(def.rewardPrestige, 0.3 + daring * 0.3)) /
            missionTotalDays(id);
          return { id, value };
        })
        .sort((a, b) => (careless ? 0 : b.value - a.value))[0];
      if (pick && startMission(state, pick.id)) {
        state.flags['opsWaited'] = 0;
        notes.push({ key: 'Operations accepted {title}', tvars: { title: missionDef(pick.id).title } });
      }
    }
  }

  // -- Air Boss: the tempo ---------------------------------------------------
  const boss = council.seats.airboss;
  if (boss && delegated('airboss')) {
    const deckFatigue = (watchSummary(state, 'DECK').fatigue + watchSummary(state, 'AIR').fatigue) / 2;
    const bold = boss.temperament >= 55;
    let tempo: Tempo;
    if (state.status === 'port') tempo = 'low';
    else if (state.status !== 'onstation') tempo = bold ? 'normal' : 'low';
    else if (deckFatigue > (bold ? 62 : 50)) tempo = 'low';
    else if (bold && deckFatigue < 40 && computeTasking(state).ratio < 1) tempo = 'high';
    else tempo = 'normal';
    // A misjudged day: the tempo is left where it was.
    if (misjudges('airboss')) tempo = state.tempo;
    if (tempo !== state.tempo) {
      state.tempo = tempo;
      notes.push({ key: 'Air Boss set the tempo to {tempo}', tvars: { tempo: tempo.toUpperCase() } });
    }
  }

  // -- CAG: tomorrow's air tasking order -----------------------------------
  const cag = council.seats.cag;
  // A misjudged day: yesterday's tasking order stands.
  if (cag && delegated('cag') && !misjudges('cag')) {
    if (state.status === 'outbound' && state.mission) {
      const fresh = wingCrewReadiness(state) >= 85 - cag.temperament * 0.3;
      if (fresh && (state.mission.prep ?? 0) < 12) trainOnPassage(state);
      else autoAssign(state);
    } else {
      autoAssign(state);
    }
  }

  return notes;
}
