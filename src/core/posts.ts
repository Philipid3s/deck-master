import type { CrewMember, GameState, PostDef, SpecialtyId } from './types';
import { POSTS, postDef, postForSpecialty, postsForRoom } from '../data/posts';
import { getRoom } from '../data/decks';
import { effectiveness, isAvailable, primarySkill, relevantSkill } from './crew';

/**
 * Posts, and who stands where because of them.
 *
 * The player appoints people to a function; the simulation decides which of
 * that function's compartments each person works in today. That split is the
 * whole point: an avionics technician is an avionics technician whether the
 * job is in the shop or in a maintenance bay, and the player should not have
 * to move them between the two by hand.
 */

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function postOf(crew: CrewMember): PostDef {
  return postDef(crew.postId);
}

export function crewInPost(state: GameState, postId: string): CrewMember[] {
  return state.crew.filter((c) => c.postId === postId);
}

/** Fit people in the post — the strength it can actually field today. */
export function postStrength(state: GameState, postId: string): number {
  return crewInPost(state, postId).filter(isAvailable).length;
}

/**
 * How the post is manned against its establishment: below 1 is short-handed,
 * above 1 is more people than the billets call for. Null where the post has
 * no establishment of its own.
 */
export function postManning(state: GameState, postId: string): number | null {
  const billets = postDef(postId).billets;
  if (billets === null || billets <= 0) return null;
  return postStrength(state, postId) / billets;
}

// ---------------------------------------------------------------------------
// Fitness
// ---------------------------------------------------------------------------

export interface PostFit {
  /**
   * Trade match, and the first thing candidates are ranked by: 3 the post's
   * own trade, 2 their secondary, 1 the same department, 0 nothing in common.
   */
  tier: number;
  /** The post trade they are best at. */
  specialty: SpecialtyId | null;
  /** Their skill in it, after cross-trade discounting. */
  skill: number;
  /** What they would actually produce in the post today, fatigue and all. */
  output: number;
  /** Ranking score. Trade fit dominates; ability breaks the ties. */
  score: number;
}

/**
 * How suited someone is to a post.
 *
 * Trade fit deliberately outranks ability, because that is the choice the
 * player is making: a rested airman of the right trade is a better avionics
 * hand than an exhausted chief from another trade, and the ranking should say
 * so. Skill, then today's output, order the people within a tier.
 */
export function postFit(crew: CrewMember, post: PostDef): PostFit {
  let specialty: SpecialtyId | null = null;
  let skill = 0;

  for (const candidate of post.specialties) {
    const value = relevantSkill(crew, candidate);
    if (specialty === null || value > skill) {
      specialty = candidate;
      skill = value;
    }
  }
  if (specialty === null) skill = primarySkill(crew);

  let tier = 0;
  if (specialty !== null && crew.primary === specialty) tier = 3;
  else if (specialty !== null && crew.secondary === specialty) tier = 2;
  else if (post.department === crew.department) tier = 1;

  const output = effectiveness(crew, specialty ?? undefined);
  return {
    tier,
    specialty,
    skill,
    output,
    score: tier * 1000 + skill * 4 + output * 100,
  };
}

/** Best fit first. Ties fall back to the name so the order is stable. */
export function byPostFit(post: PostDef): (a: CrewMember, b: CrewMember) => number {
  return (a, b) =>
    postFit(b, post).score - postFit(a, post).score || a.name.localeCompare(b.name);
}

/** The posts someone could be appointed to, best fit first. */
export function postsByFit(crew: CrewMember): PostDef[] {
  return POSTS.slice().sort(
    (a, b) => postFit(crew, b).score - postFit(crew, a).score || a.name.localeCompare(b.name),
  );
}

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

/**
 * Appoint someone to a post. Their compartment follows from the post, so it
 * is set straight away rather than waiting for the next day to resolve.
 */
export function appointToPost(state: GameState, crewId: string, postId: string): boolean {
  const crew = state.crew.find((c) => c.id === crewId);
  if (!crew || !isAvailable(crew)) return false;
  if (!POSTS.some((p) => p.id === postId)) return false;
  if (crew.postId === postId) return false;

  crew.postId = postId;
  crew.career.push({
    day: state.day,
    key: 'Appointed to {post}',
    tvars: { post: postDef(postId).name },
  });
  stationCrew(state);
  return true;
}

// ---------------------------------------------------------------------------
// Stationing
// ---------------------------------------------------------------------------

/** Labour still outstanding on the orders queued in a compartment. */
function outstandingWork(state: GameState, roomId: string): number {
  return state.workOrders
    .filter((w) => w.roomId === roomId)
    .reduce((sum, w) => sum + Math.max(0, w.labourRequired - w.labourDone), 0);
}

/**
 * Put every person in one of their post's compartments, pulling them toward
 * the ones with work waiting.
 *
 * This is what makes a post work as an assignment: the player appoints eight
 * technicians to avionics maintenance, and the ship decides how many stand in
 * the shop and how many in the bay based on where the backlog is. Deliberately
 * deterministic — same state, same stationing — so a campaign still replays.
 */
export function stationCrew(state: GameState): void {
  for (const post of POSTS) {
    const people = crewInPost(state, post.id);
    if (people.length === 0) continue;

    // Demand per compartment: a floor so every space keeps someone in it,
    // plus the outstanding backlog, which is what actually pulls people.
    const demand = post.rooms.map((roomId) => ({
      roomId,
      capacity: getRoom(roomId).capacity,
      weight: 1 + outstandingWork(state, roomId) * 1.5,
    }));
    const total = demand.reduce((sum, d) => sum + d.weight, 0);

    // Quotas by weight, each capped at what the space can actually use.
    const quotas = demand.map((d) => ({
      ...d,
      quota: Math.min(d.capacity, Math.round((people.length * d.weight) / total)),
    }));

    // Best hands to the busiest space first; whoever is left over goes to the
    // post's home compartment rather than nowhere.
    quotas.sort((a, b) => b.weight - a.weight);
    const ranked = people
      .slice()
      .sort((a, b) => postFit(b, post).score - postFit(a, post).score || a.id.localeCompare(b.id));

    let i = 0;
    for (const slot of quotas) {
      for (let n = 0; n < slot.quota && i < ranked.length; n++, i++) {
        ranked[i]!.assignmentRoomId = slot.roomId;
      }
    }
    for (; i < ranked.length; i++) {
      ranked[i]!.assignmentRoomId = post.primaryRoom;
    }
  }
}

/** The post a compartment's work belongs to, for the room panel. */
export { postsForRoom, postForSpecialty };
