import { Rng } from './rng';
import { missionDef } from '../data/missions';
import type {
  CrewMember,
  EventContext,
  EventDef,
  GameState,
  LogNote,
  PendingEvent,
} from './types';
import { EVENTS, eventDef } from '../data/events';
import { MISSIONS_BY_ID } from '../data/missions';
import { getRoom } from '../data/decks';
import { DEPARTMENTS } from '../data/specialties';
import { rank } from '../data/ranks';
import { isAboardAndFit } from './crew';
import { applyEffects } from './effects';

export function buildContext(state: GameState): EventContext {
  const fit = state.crew.filter(isAboardAndFit);
  const avg = (f: (c: CrewMember) => number) =>
    fit.length === 0 ? 0 : fit.reduce((s, c) => s + f(c), 0) / fit.length;

  return {
    day: state.day,
    prestige: state.prestige,
    credits: state.credits,
    tempo: state.tempo,
    readiness: state.readiness.overall,
    avgMorale: avg((c) => c.morale),
    avgFatigue: avg((c) => c.fatigue),
    supplies: state.supplies,
    missionActive: state.mission !== null,
    missionProgress: state.mission?.progress ?? 0,
    missionDifficulty: 0,
    openWorkOrders: state.workOrders.length,
    flags: state.flags,
    injuredCount: state.crew.filter((c) => c.health !== 'healthy').length,
    readyAircraft: state.aircraft.filter((a) => a.state === 'ready').length,
    status: state.status,
    mechanic: (state.mission && state.status === 'onstation' && missionDef(state.mission.defId).mechanic) || null,
    unidentified: (state.mission?.mech?.found ?? 0) - (state.mission?.mech?.identified ?? 0),
    threatTomorrow: state.mission?.mech?.threatTomorrow ?? 0,
    leakers: state.mission?.mech?.leakers ?? 0,
    evacuees: state.mission?.mech?.evacuees ?? 0,
    intel: state.mission?.mech?.intel ?? 0,
    windowOpen: (state.mission?.mech?.windowDays ?? 0) > 0,
    tension: state.mission?.mech?.tension ?? 0,
  };
}

/** Picks the crew member an event is about. */
function pickSubject(state: GameState, rng: Rng, kind: EventDef['subject']): CrewMember | null {
  const pool = state.crew.filter(isAboardAndFit);
  if (pool.length === 0) return null;

  switch (kind) {
    case 'senior': {
      const seniors = pool.filter((c) => c.rank >= 3);
      return seniors.length > 0 ? rng.pick(seniors) : rng.pick(pool);
    }
    case 'junior': {
      const juniors = pool.filter((c) => c.rank <= 1);
      return juniors.length > 0 ? rng.pick(juniors) : rng.pick(pool);
    }
    case 'tired': {
      const tired = pool.filter((c) => c.fatigue > 55);
      if (tired.length > 0) return rng.pick(tired);
      const sorted = pool.slice().sort((a, b) => b.fatigue - a.fatigue);
      return sorted[0] ?? null;
    }
    case 'injured': {
      const injured = state.crew.filter((c) => c.health !== 'healthy');
      return injured.length > 0 ? rng.pick(injured) : null;
    }
    case 'crew':
      return rng.pick(pool);
    default:
      return null;
  }
}

/**
 * Capture an event's body as a template plus its values, rather than a
 * finished sentence. The card is rendered at display time, so switching
 * language re-renders today's events too.
 */
export function renderBody(
  state: GameState,
  def: EventDef,
  subject: CrewMember | null,
  ctx: EventContext,
): LogNote {
  const room = subject ? getRoom(subject.assignmentRoomId) : null;
  return {
    key: def.body,
    vars: {
      subject: subject?.name ?? '',
      rank: subject ? rank(subject.rank).code : '',
      daysAboard: subject?.daysAboard ?? 0,
      fatigue: Math.round(subject?.fatigue ?? 0),
      morale: Math.round(subject?.morale ?? 0),
      avgFatigue: Math.round(ctx.avgFatigue),
      avgMorale: Math.round(ctx.avgMorale),
      fuel: Math.round(ctx.supplies.fuel),
      parts: Math.round(ctx.supplies.parts),
      food: Math.round(ctx.supplies.food),
      openWorkOrders: ctx.openWorkOrders,
      day: state.day,
      ship: state.shipName,
    },
    tvars: {
      dept: subject ? DEPARTMENTS[subject.department].name : 'the department',
      room: room?.name ?? 'their space',
    },
  };
}

function toPending(
  state: GameState,
  def: EventDef,
  subject: CrewMember | null,
  ctx: EventContext,
): PendingEvent {
  return {
    defId: def.id,
    subjectId: subject?.id ?? null,
    subjectName: subject?.name ?? '',
    title: def.title,
    body: renderBody(state, def, subject, ctx),
    category: def.category,
  };
}

/**
 * Daily event selection (spec section 81).
 *
 * Scheduled follow-ups fire first and unconditionally — an ongoing story
 * beat always outranks a fresh random draw. The remainder of the day's
 * 1-3 slots are filled by weighted selection over events whose conditions
 * hold and whose cooldown has expired.
 */
export function generateDailyEvents(state: GameState, rng: Rng): PendingEvent[] {
  const ctx = buildContext(state);
  const pending: PendingEvent[] = [];
  const usedIds = new Set<string>();

  // 1. Scheduled chain events due today.
  const dueNow = state.scheduledEvents.filter((s) => s.day <= state.day);
  state.scheduledEvents = state.scheduledEvents.filter((s) => s.day > state.day);
  for (const sched of dueNow) {
    const def = eventDef(sched.defId);
    if (!def || usedIds.has(def.id)) continue;
    const subject = sched.subjectId
      ? (state.crew.find((c) => c.id === sched.subjectId) ?? null)
      : pickSubject(state, rng, def.subject);
    pending.push(toPending(state, def, subject, ctx));
    usedIds.add(def.id);
    state.eventCooldowns[def.id] = state.day + def.cooldown;
  }

  // 2. Fill the remaining slots. 1-3 events per day.
  const target = rng.int(1, 3);
  const eligible = EVENTS.filter((def) => {
    if (def.chained) return false;
    if (usedIds.has(def.id)) return false;
    if (def.weight <= 0) return false;
    if (def.minDay !== undefined && state.day < def.minDay) return false;
    if ((state.eventCooldowns[def.id] ?? -1) > state.day) return false;
    if (def.condition && !def.condition(ctx)) return false;
    return true;
  });

  // Mission event pools get a boost so an active mission colours the day.
  const missionPool = new Set(
    state.mission ? (missionEventPool(state) ?? []) : [],
  );

  while (pending.length < target) {
    const remaining = eligible.filter((d) => !usedIds.has(d.id));
    if (remaining.length === 0) break;
    const chosen = rng.pickWeighted(remaining, (d) => {
      let w = d.weight;
      if (missionPool.has(d.id)) w *= 2.4;
      if (d.priority) w *= 1 + d.priority * 0.6;
      return w;
    });
    if (!chosen) break;
    const subject = pickSubject(state, rng, chosen.subject);
    // Personnel events without a valid subject are skipped rather than shown
    // with placeholder text.
    if (chosen.subject && !subject) {
      usedIds.add(chosen.id);
      continue;
    }
    pending.push(toPending(state, chosen, subject, ctx));
    usedIds.add(chosen.id);
    state.eventCooldowns[chosen.id] = state.day + chosen.cooldown;
  }

  // Highest priority first so emergencies are answered before paperwork.
  pending.sort((a, b) => {
    const pa = eventDef(a.defId)?.priority ?? 0;
    const pb = eventDef(b.defId)?.priority ?? 0;
    return pb - pa;
  });

  return pending;
}

function missionEventPool(state: GameState): string[] | null {
  if (!state.mission) return null;
  return MISSIONS_BY_ID[state.mission.defId]?.eventPool ?? null;
}

/** Resolve one event choice, applying its consequences to the state. */
export function resolveEvent(
  state: GameState,
  rng: Rng,
  pendingIndex: number,
  choiceIndex: number,
): { notes: LogNote[]; casualties: string[] } {
  const pending = state.pendingEvents[pendingIndex];
  if (!pending) return { notes: [], casualties: [] };
  const def = eventDef(pending.defId);
  if (!def) return { notes: [], casualties: [] };
  const choice = def.choices[choiceIndex];
  if (!choice) return { notes: [], casualties: [] };

  const result = applyEffects(state, rng, choice.effects, pending.subjectId);

  state.eventLog.unshift({
    day: state.day,
    title: def.title,
    choice: choice.label,
    category: def.category,
  });
  if (state.eventLog.length > 120) state.eventLog.length = 120;

  state.pendingEvents.splice(pendingIndex, 1);
  return { notes: result.notes, casualties: result.casualties };
}
