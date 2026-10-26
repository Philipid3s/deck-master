import { clamp, Rng } from './rng';
import type { CrewMember, Effect, GameState, LogNote, Scope, SpecialtyId } from './types';
import { gainExperience, grow, isAvailable, isAboardAndFit, skillOf } from './crew';
import { damageAircraft, openWorkOrder, repairAircraft } from './aircraft';
import { ALL_ROOMS } from '../data/decks';
import { equipmentBonus } from './equipmentEffects';

/** Resolves an effect scope to the crew it touches. */
export function resolveScope(
  state: GameState,
  scope: Scope | undefined,
  subjectId: string | null,
): CrewMember[] {
  if (!scope) return subjectId ? state.crew.filter((c) => c.id === subjectId) : [];
  switch (scope.kind) {
    case 'all':
      return state.crew.filter(isAboardAndFit);
    case 'onduty':
      return state.crew.filter(isAvailable);
    case 'department':
      return state.crew.filter((c) => c.department === scope.department && isAboardAndFit(c));
    case 'room':
      return state.crew.filter((c) => c.assignmentRoomId === scope.roomId);
    case 'crew':
      return state.crew.filter((c) => c.id === scope.crewId);
    case 'subject':
      return subjectId ? state.crew.filter((c) => c.id === subjectId) : [];
  }
}

export interface EffectResult {
  notes: LogNote[];
  creditsDelta: number;
  prestigeDelta: number;
  casualties: string[];
}

/**
 * Applies one declarative consequence. Keeping consequences as data rather
 * than code is what lets events be authored freely in `data/events.ts`
 * (spec section 71).
 */
export function applyEffect(
  state: GameState,
  rng: Rng,
  effect: Effect,
  subjectId: string | null,
  result: EffectResult,
): void {
  switch (effect.t) {
    case 'credits': {
      state.credits += effect.v;
      result.creditsDelta += effect.v;
      break;
    }
    case 'prestige': {
      state.prestige = Math.max(0, state.prestige + effect.v);
      result.prestigeDelta += effect.v;
      break;
    }
    case 'morale': {
      for (const c of resolveScope(state, effect.scope, subjectId)) {
        c.morale = clamp(c.morale + effect.v, 0, 100);
      }
      break;
    }
    case 'fatigue': {
      for (const c of resolveScope(state, effect.scope, subjectId)) {
        c.fatigue = clamp(c.fatigue + effect.v, 0, 100);
      }
      break;
    }
    case 'xp': {
      for (const c of resolveScope(state, effect.scope, subjectId)) {
        gainExperience(c, effect.v);
      }
      break;
    }
    case 'skill': {
      for (const c of resolveScope(state, effect.scope, subjectId)) {
        const spec: SpecialtyId = effect.specialty === 'primary' ? c.primary : effect.specialty;
        c.skills[spec] = grow(skillOf(c, spec), effect.v);
      }
      break;
    }
    case 'supply': {
      state.supplies[effect.k] = clamp(state.supplies[effect.k] + effect.v, 0, state.suppliesMax[effect.k]);
      break;
    }
    case 'missionProgress': {
      if (state.mission) {
        state.mission.progress = clamp(state.mission.progress + effect.v, 0, 100);
      }
      break;
    }
    case 'missionRisk': {
      if (state.mission) state.mission.riskModifier += effect.v;
      break;
    }
    case 'mech': {
      // Moves a figure of the mission's own mechanic: tension, intelligence...
      const mech = state.mission?.mech;
      if (mech) {
        const next = (mech[effect.key] ?? 0) + effect.v;
        mech[effect.key] = effect.key === 'tension' || effect.key === 'intel' ? clamp(next, 0, 100) : Math.max(0, next);
      }
      break;
    }
    case 'roomCondition': {
      const rooms = effect.roomId
        ? ALL_ROOMS.filter((r) => r.id === effect.roomId)
        : effect.department
          ? ALL_ROOMS.filter((r) => r.department === effect.department)
          : [];
      // Firefighting and rescue equipment blunts damage, never improvement.
      const scale =
        effect.v < 0 ? 1 - Math.min(0.5, equipmentBonus(state, 'emergencyDamage')) : 1;
      for (const r of rooms) {
        const rs = state.rooms[r.id];
        if (rs) rs.condition = clamp(rs.condition + effect.v * scale, 0, 100);
      }
      break;
    }
    case 'aircraftDamage': {
      const hit = damageAircraft(state, rng, effect.count, effect.amount);
      if (hit.length > 0) {
        result.notes.push({ key: 'Aircraft damaged: {list}', vars: { list: hit.join(', ') } });
      }
      break;
    }
    case 'aircraftRepair': {
      repairAircraft(state, rng, effect.count, effect.amount);
      break;
    }
    case 'workOrder': {
      const candidates = rng.shuffle(state.aircraft.filter((a) => a.state !== 'damaged'));
      for (let i = 0; i < effect.count && i < candidates.length; i++) {
        openWorkOrder(
          state,
          candidates[i]!.id,
          rng.pick(['engine', 'avionics', 'airframe'] as const),
          effect.severity ?? 1,
        );
      }
      break;
    }
    case 'injure': {
      const pool = resolveScope(state, effect.scope ?? { kind: 'onduty' }, subjectId).filter(
        (c) => c.health === 'healthy',
      );
      for (const c of rng.shuffle(pool).slice(0, effect.count)) {
        c.health = 'injured';
        c.status = 'injured';
        c.awayDays = effect.days;
        c.morale = clamp(c.morale - 8, 0, 100);
        c.career.push({ day: state.day, key: 'Injured on duty' });
        state.totalCasualties++;
        result.casualties.push(c.name);
      }
      break;
    }
    case 'leave': {
      for (const c of resolveScope(state, effect.scope, subjectId)) {
        c.status = 'leave';
        c.awayDays = effect.days;
        c.career.push({
          day: state.day,
          key: 'Granted {days} days leave',
          vars: { days: effect.days },
        });
      }
      break;
    }
    case 'schedule': {
      if (effect.chance === undefined || rng.chance(effect.chance)) {
        state.scheduledEvents.push({
          defId: effect.eventId,
          day: state.day + effect.inDays,
          subjectId,
        });
      }
      break;
    }
    case 'flag': {
      state.flags[effect.key] = (state.flags[effect.key] ?? 0) + effect.v;
      break;
    }
    case 'tempo': {
      state.tempo = effect.v;
      result.notes.push({
        key: 'Operational tempo set to {tempo}',
        tvars: { tempo: effect.v.toUpperCase() },
      });
      break;
    }
    case 'log': {
      result.notes.push({ key: effect.text });
      break;
    }
  }
}

export function applyEffects(
  state: GameState,
  rng: Rng,
  effects: Effect[],
  subjectId: string | null,
): EffectResult {
  const result: EffectResult = { notes: [], creditsDelta: 0, prestigeDelta: 0, casualties: [] };
  for (const e of effects) applyEffect(state, rng, e, subjectId, result);
  return result;
}
