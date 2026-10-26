import type { GameState, LogNote } from './types';
import { airDefence, defenceNeeded } from './operations';
import { DEPARTMENTS, DEPT_IDS } from '../data/specialties';
import { getRoom } from '../data/decks';
import { eventDef } from '../data/events';
import { SEATS, isDelegated } from './council';
import { alertBoard, autoAssign, computeTasking, keyAssets } from './tasking';
import { isCrewed } from './aircrew';
import { DUTIES_BY_ID, typeSuitability } from '../data/aircraft';
import type { AircraftDuty } from './types';
import { watchPolicy, watchSummary } from './watch';
import { deploymentObjectives, isDeployment } from './deployment';
import { isInPort, isOnStation } from './status';
import { SUPPLY_LABELS } from './economy';
import { isMissionCapable } from './aircraft';
import { checkRequirements, effectiveMinPrestige } from './missions';
import { postManning } from './posts';
import { POSTS } from '../data/posts';
import { missionDef } from '../data/missions';

/**
 * What needs the captain's attention right now, derived from the state each
 * time it is asked — nothing is stored, so an alert disappears the moment
 * its cause is dealt with.
 *
 * Modelled on the alert row in grand strategy games: each one is a short
 * title, a line of detail, a severity, and a place to go and fix it.
 */

export type AlertLevel = 'urgent' | 'warn' | 'info';

export type AlertAction =
  | { kind: 'events' }
  | { kind: 'event'; index: number }
  | { kind: 'council' }
  | { kind: 'roster' }
  | { kind: 'tasking' }
  | { kind: 'missions' }
  | { kind: 'dockyard' }
  | { kind: 'watch' }
  | { kind: 'orders' }
  | { kind: 'room'; roomId: string };

export interface Alert {
  id: string;
  level: AlertLevel;
  /** A single glyph for the alert bar. */
  icon: string;
  /** English source string. */
  title: string;
  detail: LogNote;
  count?: number;
  action: AlertAction;
}

const ORDER: Record<AlertLevel, number> = { urgent: 0, warn: 1, info: 2 };

export function computeAlerts(state: GameState): Alert[] {
  const out: Alert[] = [];

  // -- Decisions -----------------------------------------------------------
  if (state.pendingEvents.length > 0) {
    const emergency = state.pendingEvents.find(
      (p) => p.category === 'emergency' || p.category === 'medical' || (eventDef(p.defId)?.priority ?? 0) >= 2,
    );
    out.push({
      id: 'decisions',
      level: emergency ? 'urgent' : 'warn',
      icon: '!',
      title: emergency ? 'Emergency decision pending' : 'Decisions pending',
      detail: emergency
        ? { key: '{title} needs an answer before the day ends', tvars: { title: emergency.title } }
        : { key: '{n} decisions are waiting for you', vars: { n: state.pendingEvents.length } },
      count: state.pendingEvents.length,
      action: { kind: 'events' },
    });
  }

  // -- The deployment ---------------------------------------------------------
  if (isDeployment(state) && !state.campaignEnd) {
    const order = deploymentObjectives(state).find((o) => o.primary);
    if (order?.state === 'atrisk') {
      out.push({
        id: 'orders',
        level: 'urgent',
        icon: '◷',
        title: 'Orders at risk',
        detail: {
          key: '{done} of {need} operations done, {days} days left',
          vars: { done: order.current, need: order.target, days: Math.max(0, 31 - state.day) },
        },
        action: { kind: 'orders' },
      });
    }
  }

  // -- Money and readiness -----------------------------------------------------
  if (state.credits < 0) {
    out.push({
      id: 'credits',
      level: 'urgent',
      icon: '$',
      title: 'Operating account overdrawn',
      detail: { key: 'Sustained debt will cost you the command' },
      action: { kind: 'dockyard' },
    });
  }
  if (state.readiness.overall < 40) {
    out.push({
      id: 'readiness',
      level: 'urgent',
      icon: '▼',
      title: 'Readiness critical',
      detail: { key: 'Readiness {value}% — see the weakest link in SHIP STATUS', vars: { value: Math.round(state.readiness.overall) } },
      action: { kind: 'watch' },
    });
  }

  // -- Air tasking ---------------------------------------------------------
  if (state.mission && isOnStation(state) && !isDelegated(state, 'cag')) {
    const tasking = computeTasking(state);
    if (tasking.ratio < 0.6) {
      out.push({
        id: 'tasking',
        level: 'urgent',
        icon: '✈',
        title: 'Air tasking falls short',
        detail: { key: 'Objective cover {value}% — the operation is barely moving', vars: { value: Math.round(tasking.ratio * 100) } },
        action: { kind: 'tasking' },
      });
    } else if (alertBoard(state).ready.length === 0) {
      out.push({
        id: 'no-alert',
        level: 'warn',
        icon: '⚡',
        title: 'No deck alert standing',
        detail: { key: 'Nothing is ready to launch at five minutes — the operation carries its risk unchecked' },
        action: { kind: 'tasking' },
      });
    } else if (tasking.uncrewed > 0) {
      out.push({
        id: 'uncrewed',
        level: 'warn',
        icon: '✈',
        title: 'Airframes without a pilot',
        detail: { key: '{n} tasked airframes will not launch', vars: { n: tasking.uncrewed } },
        count: tasking.uncrewed,
        action: { kind: 'tasking' },
      });
    }
  }

  // -- Airframes out of service -----------------------------------------------
  const total = state.aircraft.length;
  const down = state.aircraft.filter((a) => !isMissionCapable(a));
  if (down.length > 0) {
    const damaged = down.filter((a) => a.state === 'damaged').length;
    const waiting = new Set(state.workOrders.filter((w) => !w.partsDrawn).map((w) => w.aircraftId));
    const share = down.length / Math.max(1, total);
    out.push({
      id: 'aircraft-down',
      level: share >= 0.4 || (isOnStation(state) && share >= 0.3) ? 'urgent' : 'warn',
      icon: '✖',
      title: 'Airframes out of service',
      detail: {
        key: '{n} of {total} out of service — {damaged} damaged, {shops} in the shops, {parts} waiting for parts',
        vars: {
          n: down.length,
          total,
          damaged,
          shops: down.filter((a) => a.state === 'maintenance').length,
          parts: down.filter((a) => waiting.has(a.id)).length,
        },
      },
      count: down.length,
      action: { kind: 'tasking' },
    });
  }

  // -- Work held up for parts -----------------------------------------------------
  const noParts = state.workOrders.filter((w) => !w.partsDrawn).length;
  if (noParts > 0 && state.supplies.parts < 40) {
    out.push({
      id: 'parts',
      level: 'warn',
      icon: '⚙',
      title: 'Work orders waiting for parts',
      detail: {
        key: '{n} jobs stalled, spare parts at {value}%',
        vars: { n: noParts, value: Math.round(state.supplies.parts) },
      },
      count: noParts,
      action: { kind: 'dockyard' },
    });
  }

  // -- Aircrew seats ------------------------------------------------------------
  const unmanned = state.aircraft.filter((a) => (a.crewIds ?? []).some((id) => id === ''));
  if (unmanned.length > 0 && !out.some((a) => a.id === 'uncrewed') && !isDelegated(state, 'cag')) {
    out.push({
      id: 'seats',
      level: 'info',
      icon: '◌',
      title: 'Airframes short of aircrew',
      detail: { key: '{n} airframes have empty seats', vars: { n: unmanned.length } },
      count: unmanned.length,
      action: { kind: 'tasking' },
    });
  }

  // -- Posts short of people ----------------------------------------------------
  const short = POSTS.map((p) => ({ p, m: postManning(state, p.id) }))
    .filter((x): x is { p: (typeof POSTS)[number]; m: number } => x.m !== null && x.m < 0.75)
    .sort((a, b) => a.m - b.m);
  if (short.length > 0) {
    out.push({
      id: 'manning',
      level: short[0]!.m < 0.5 ? 'warn' : 'info',
      icon: '♙',
      title: 'Posts short-handed',
      detail: {
        key: '{list} below strength',
        vars: { list: short.slice(0, 3).map((x) => `${x.p.short} ${Math.round(x.m * 100)}%`).join(', ') },
      },
      count: short.length,
      action: { kind: 'roster' },
    });
  }

  // -- The operation's own mechanic -------------------------------------------------
  if (state.mission && state.status === 'onstation' && !state.campaignEnd) out.push(...mechanicAlerts(state));

  // -- Capability: is there anything to fly the mission with? --------------------------
  if (state.mission && !state.campaignEnd) out.push(...capabilityAlerts(state));

  // -- Operations held back by readiness --------------------------------------------
  if (state.mission) {
    const unmet = checkRequirements(state, missionDef(state.mission.defId)).filter((c) => !c.met);
    if (unmet.length > 0) {
      out.push({
        id: 'requirements',
        level: 'warn',
        icon: '◎',
        title: 'Operation below its requirements',
        detail: {
          key: '{label} {actual} of {required} needed — progress is slowed',
          vars: { actual: Math.round(unmet[0]!.actual), required: unmet[0]!.required },
          tvars: { label: unmet[0]!.label },
        },
        count: unmet.length,
        action: { kind: 'watch' },
      });
    }
  } else if (isInPort(state) && state.missionOffers.length > 0) {
    const blocked = state.missionOffers.filter((id) => {
      const def = missionDef(id);
      return state.prestige < effectiveMinPrestige(state, def) || checkRequirements(state, def).some((c) => !c.met);
    });
    if (blocked.length > 0) {
      out.push({
        id: 'offers-blocked',
        level: 'info',
        icon: '◎',
        title: 'Operations waiting on the ship',
        detail: {
          key: '{n} operations on the board need more readiness or standing',
          vars: { n: blocked.length },
        },
        count: blocked.length,
        action: { kind: 'missions' },
      });
    }
  }

  // -- Work-ups wearing out the crews the operation needs -------------------------
  if (state.status === 'outbound' && state.mission) {
    const key = keyAssets(state);
    const tiring = state.aircraft.filter((a) => a.duty === 'training' && key.ids.has(a.id));
    if (tiring.length > 0 && key.duty) {
      out.push({
        id: 'key-training',
        level: 'warn',
        icon: 'z',
        title: 'Work-ups tiring key crews',
        detail: {
          key: '{list} — the operation will need them rested for {duty}',
          vars: { list: tiring.map((a) => `#${a.tail}`).join(', ') },
          tvars: { duty: DUTIES_BY_ID[key.duty].name },
        },
        count: tiring.length,
        action: { kind: 'tasking' },
      });
    }
  }

  // -- No operation ----------------------------------------------------------
  if (isInPort(state) && !state.mission && !state.campaignEnd && !isDelegated(state, 'ops') && state.missionOffers.length > 0) {
    out.push({
      id: 'idle',
      level: isDeployment(state) ? 'warn' : 'info',
      icon: '⚓',
      title: 'Alongside without orders',
      detail: { key: '{n} operations on the board', vars: { n: state.missionOffers.length } },
      action: { kind: 'missions' },
    });
  }

  // -- Fatigue -----------------------------------------------------------------
  if (!isDelegated(state, 'xo')) {
    const tired = DEPT_IDS.filter(
      (d) => watchSummary(state, d).fatigue >= 62 && watchPolicy(state, d) !== 'rotation',
    );
    if (tired.length > 0) {
      out.push({
        id: 'fatigue',
        level: 'warn',
        icon: 'z',
        title: 'Departments worn out',
        detail: {
          key: '{list} — consider three watches',
          vars: { list: tired.map((d) => DEPARTMENTS[d].short).join(', ') },
        },
        count: tired.length,
        action: { kind: 'watch' },
      });
    }
  }

  // -- Stores -------------------------------------------------------------------
  const low = (Object.keys(state.supplies) as (keyof typeof state.supplies)[]).filter((k) => state.supplies[k] < 25);
  if (low.length > 0) {
    out.push({
      id: 'stores',
      level: low.some((k) => state.supplies[k] < 10) ? 'urgent' : 'warn',
      icon: '◫',
      title: 'Stores running low',
      detail: isInPort(state)
        ? { key: 'Low: {list} — buy alongside', tvars: { list: SUPPLY_LABELS[low[0]!] } }
        : { key: 'Low: {list} — a replenishment at sea would help', tvars: { list: SUPPLY_LABELS[low[0]!] } },
      count: low.length,
      action: { kind: 'dockyard' },
    });
  }

  // -- Spaces -------------------------------------------------------------------
  const critical = Object.values(state.rooms)
    .filter((r) => r.condition < 30)
    .sort((a, b) => a.condition - b.condition);
  if (critical.length > 0) {
    out.push({
      id: 'rooms',
      level: 'warn',
      icon: '⚠',
      title: 'Spaces in critical condition',
      detail: {
        key: '{room} at {value}%',
        vars: { value: Math.round(critical[0]!.condition) },
        tvars: { room: getRoom(critical[0]!.id).name },
      },
      count: critical.length,
      action: { kind: 'room', roomId: critical[0]!.id },
    });
  }

  // -- The council ----------------------------------------------------------------
  const council = state.council;
  if (council) {
    const vacant = SEATS.filter((s) => !council.seats[s.id]);
    if (vacant.length > 0) {
      out.push({
        id: 'vacant',
        level: 'warn',
        icon: '♜',
        title: 'Council seat vacant',
        detail: { key: '{seat} has no head', tvars: { seat: vacant[0]!.title } },
        count: vacant.length,
        action: { kind: 'council' },
      });
    }
    const unhappy = SEATS.filter((s) => (council.seats[s.id]?.opinion ?? 0) <= -40);
    if (unhappy.length > 0) {
      out.push({
        id: 'unhappy',
        level: 'warn',
        icon: '☹',
        title: 'Disaffected officers',
        detail: { key: '{seat} works at reduced effect', tvars: { seat: unhappy[0]!.title } },
        count: unhappy.length,
        action: { kind: 'council' },
      });
    }
  }

  // -- Promotions ---------------------------------------------------------------------
  const promotable = state.crew.filter((c) => c.promotable).length;
  if (promotable > 0) {
    out.push({
      id: 'promote',
      level: 'info',
      icon: '★',
      title: 'Crew eligible for promotion',
      detail: { key: '{n} people have earned a promotion', vars: { n: promotable } },
      count: promotable,
      action: { kind: 'roster' },
    });
  }

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}

// ---------------------------------------------------------------------------
// Mission mechanics
// ---------------------------------------------------------------------------

function mechanicAlerts(state: GameState): Alert[] {
  const out: Alert[] = [];
  const def = missionDef(state.mission!.defId);
  const m = state.mission!.mech ?? {};
  if (def.mechanic === 'threat') {
    const tomorrow = m.threatTomorrow ?? 0;
    const have = airDefence(state);
    const need = defenceNeeded(tomorrow);
    if (tomorrow > 0 && have < need) {
      out.push({
        id: 'raid',
        level: tomorrow >= 2 ? 'urgent' : 'warn',
        icon: '✈',
        title: 'Raid expected — defence short',
        detail: {
          key: 'Air defence {have} of {need}: more CAP or a fuller deck alert',
          vars: { have: have.toFixed(1), need: need.toFixed(1) },
        },
        action: { kind: 'tasking' },
      });
    }
  }
  if (def.mechanic === 'window' && (m.windowDays ?? 0) > 0) {
    out.push({
      id: 'window',
      level: 'warn',
      icon: '◎',
      title: 'Strike window open',
      detail: { key: '{n} days to put the package on target', vars: { n: m.windowDays ?? 0 } },
      action: { kind: 'tasking' },
    });
  }
  if (def.mechanic === 'contacts' && (m.found ?? 0) - (m.identified ?? 0) >= 4) {
    out.push({
      id: 'contacts',
      level: 'warn',
      icon: '?',
      title: 'Contacts piling up',
      detail: { key: '{n} contacts unidentified — more recon', vars: { n: (m.found ?? 0) - (m.identified ?? 0) } },
      action: { kind: 'tasking' },
    });
  }
  if (def.mechanic === 'escalation' && (m.tension ?? 0) >= 75) {
    out.push({
      id: 'tension',
      level: (m.tension ?? 0) >= 85 ? 'urgent' : 'warn',
      icon: '⚡',
      title: 'Tension rising',
      detail: { key: 'Tension {n}: presence in the air brings it down', vars: { n: Math.round(m.tension ?? 0) } },
      action: { kind: 'tasking' },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

/** Airframes able to fly a duty today: capable, crewed, and suited to it. */
function ableFor(state: GameState, duty: AircraftDuty, minFit = 0.6): number {
  return state.aircraft.filter(
    (a) => isMissionCapable(a) && isCrewed(state, a) && typeSuitability(a.typeId, duty) >= minFit,
  ).length;
}

/**
 * Whether the wing can actually do the operation in hand: a key task with
 * nothing to fly it, support missing, or a best possible order that still
 * falls short. The best order is worked out on a copy of the state, as if
 * on station, so nothing the player has set is touched.
 */
function capabilityAlerts(state: GameState): Alert[] {
  const out: Alert[] = [];
  const mission = state.mission!;
  const def = missionDef(mission.defId);

  // Key tasks: the duties the operation leans on.
  const keyDuties = (Object.entries(def.dutyWeights) as [AircraftDuty, number][])
    .filter(([, w]) => w >= 0.5)
    .sort((a, b) => b[1] - a[1]);
  const missing = keyDuties.filter(([d]) => ableFor(state, d) === 0);
  if (missing.length > 0) {
    out.push({
      id: 'capability',
      level: 'urgent',
      icon: '⊘',
      title: 'No airframe for a key task',
      detail: {
        key: '{title} needs {duty}: no capable, crewed airframe can fly it',
        tvars: { title: def.title, duty: DUTIES_BY_ID[missing[0]![0]].name },
      },
      count: missing.length,
      action: { kind: isInPort(state) ? 'dockyard' : 'tasking' },
    });
  }

  // Support the operation would want and cannot have.
  const lacking: string[] = [];
  if (ableFor(state, 'planeguard', 0.4) === 0) lacking.push(DUTIES_BY_ID.planeguard.name);
  if (def.dutyWeights.strike && ableFor(state, 'escort', 0.5) === 0) lacking.push(DUTIES_BY_ID.escort.name);
  if (ableFor(state, 'tanker', 0.5) === 0) lacking.push(DUTIES_BY_ID.tanker.name);
  if (lacking.length > 0) {
    out.push({
      id: 'support',
      level: 'warn',
      icon: '⊕',
      title: 'Support missing',
      detail: { key: 'Nothing available for: {list}', tvars: { list: lacking[0]! } },
      count: lacking.length,
      action: { kind: isInPort(state) ? 'dockyard' : 'tasking' },
    });
  }

  // The best the wing could do today, whatever is tasked now.
  if (missing.length === 0) {
    const trial = structuredClone(state);
    trial.status = 'onstation';
    autoAssign(trial);
    const best = computeTasking(trial).ratio;
    if (best < 0.95) {
      out.push({
        id: 'cover',
        level: 'warn',
        icon: '◔',
        title: 'The wing cannot cover the operation',
        detail: {
          key: 'Even the best order reaches {value}% of what {title} needs',
          vars: { value: Math.round(best * 100) },
          tvars: { title: def.title },
        },
        action: { kind: 'tasking' },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The journal
// ---------------------------------------------------------------------------

export interface JournalEntry {
  day: number;
  note: LogNote;
}

const JOURNAL_LIMIT = 240;

/** Record the day's notes in the journal, newest first. */
export function writeJournal(state: GameState, day: number, notes: LogNote[]): void {
  const entries = notes.map((note) => ({ day, note }));
  state.journal = [...entries.reverse(), ...(state.journal ?? [])].slice(0, JOURNAL_LIMIT);
}
