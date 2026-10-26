import type { Aircraft, CrewMember, GameState } from './types';
import { SAVE_VERSION } from './newGame';
import { Rng } from './rng';
import { AIRCRAFT_TYPES_BY_ID, aircraftType } from '../data/aircraft';
import { assignInitialAircrew, generateAircrew } from './aircrew';
import { postForSpecialty, postsForRoom } from '../data/posts';
import { stationCrew } from './posts';

const SLOT_KEY = 'deck-master.save';
const AUTOSAVE_KEY = 'deck-master.autosave';

/**
 * The entire campaign is plain JSON (spec section 70) — there are no class
 * instances or functions anywhere in GameState, so serialisation is a
 * straight round-trip.
 */
export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as GameState;
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!Array.isArray(parsed.crew) || !Array.isArray(parsed.aircraft)) return null;
    if (parsed.version !== SAVE_VERSION && !migrate(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Brings an older save up to the current shape, in place.
 *
 * Returns false for a save too old to rescue, in which case the campaign is
 * refused rather than loaded half-formed.
 */
function migrate(state: GameState): boolean {
  if (state.version === 1) {
    // Version 2 replaced the fictional airframes with the real types a
    // current carrier air wing flies. Each old type maps to its counterpart,
    // so a campaign in progress keeps its wing rather than losing it.
    const RETYPE: Record<string, string> = {
      f22n: 'fa18e',
      f26: 'f35c',
      ea20: 'ea18g',
      ea30: 'ea18g',
      e5: 'e2d',
      mh80: 'mh60r',
      mh92: 'mh60s',
      c3: 'cmv22b',
    };
    for (const a of state.aircraft as Aircraft[]) {
      a.typeId = RETYPE[a.typeId] ?? a.typeId;
      if (!AIRCRAFT_TYPES_BY_ID[a.typeId]) return false;
    }
    for (const d of state.deliveries) {
      if (d.kind === 'aircraft') d.refId = RETYPE[d.refId] ?? d.refId;
    }

    // Version 2 also introduced named aircrew. A version 1 campaign has no
    // aircrew in its company at all, so the squadrons are generated from the
    // campaign seed and posted to the airframes exactly as they would be at
    // the start of a new campaign.
    for (const a of state.aircraft as Aircraft[]) {
      if (!Array.isArray(a.crewIds)) {
        a.crewIds = new Array<string>(aircraftType(a.typeId).crewRequired).fill('');
      }
    }
    for (const c of state.crew as CrewMember[]) {
      c.sortiesFlown ??= 0;
      c.consecutiveFlyingDays ??= 0;
    }
    // Ids continue above whatever the company already used.
    const highest = state.crew.reduce((max, c) => {
      const n = Number(c.id.replace(/\D/g, ''));
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    state.crew.push(...generateAircrew(new Rng(state.seed ^ 0x5eed), highest + 1));
    assignInitialAircrew(state);
    state.version = 2;
  }
  if (state.version === 2) {
    // Version 3 appoints people to a post — the function they hold — rather
    // than to a single compartment. An existing campaign keeps its people
    // where they were by reading the post back off the space they stood in,
    // falling back to the post their trade belongs to.
    for (const c of state.crew as CrewMember[]) {
      if (c.postId) continue;
      const covering = postsForRoom(c.assignmentRoomId).find((p) =>
        p.specialties.includes(c.primary),
      );
      c.postId = (covering ?? postForSpecialty(c.primary)).id;
    }
    stationCrew(state);
    state.version = 3;
  }
  return state.version === SAVE_VERSION;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, slot: string = SLOT_KEY): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(slot, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: string = SLOT_KEY): GameState | null {
  const store = storage();
  if (!store) return null;
  const json = store.getItem(slot);
  return json ? deserialize(json) : null;
}

export function hasSave(slot: string = SLOT_KEY): boolean {
  return storage()?.getItem(slot) !== null && storage()?.getItem(slot) !== undefined;
}

export function deleteSave(slot: string = SLOT_KEY): void {
  storage()?.removeItem(slot);
}

export function autosave(state: GameState): void {
  saveGame(state, AUTOSAVE_KEY);
}

export function loadAutosave(): GameState | null {
  return loadGame(AUTOSAVE_KEY);
}

export { SLOT_KEY, AUTOSAVE_KEY };
