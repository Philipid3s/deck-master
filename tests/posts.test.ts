import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { openWorkOrder } from '../src/core/aircraft';
import {
  appointToPost,
  crewInPost,
  postFit,
  postManning,
  postStrength,
  postsByFit,
  stationCrew,
} from '../src/core/posts';
import { POSTS, postDef, postForSpecialty, postsForRoom } from '../src/data/posts';
import { ALL_ROOMS } from '../src/data/decks';
import { SPECIALTY_IDS } from '../src/data/specialties';
import { CREW_COMPOSITION } from '../src/core/crew';
import type { GameState, SpecialtyId } from '../src/core/types';

/** Where each kind of work order lands, mirroring SYSTEM_ROOM in aircraft.ts. */
const ORDER_ROOMS: Record<string, string> = {
  avionics: 'd2-avionics',
  engine: 'd2-engineshop',
  airframe: 'd2-airframe',
  weapons: 'd2-ordnance',
};

describe('the post catalogue', () => {
  it('covers every trade exactly once', () => {
    for (const specialty of SPECIALTY_IDS) {
      expect(() => postForSpecialty(specialty), specialty).not.toThrow();
    }
    const covered = POSTS.flatMap((p) => p.specialties);
    expect(new Set(covered).size, 'a trade is covered twice').toBe(covered.length);
    expect(new Set(covered).size).toBe(SPECIALTY_IDS.length);
  });

  it('only names compartments that exist, and starts in one of them', () => {
    const known = new Set(ALL_ROOMS.map((r) => r.id));
    for (const post of POSTS) {
      expect(post.rooms.length, post.id).toBeGreaterThan(0);
      for (const roomId of post.rooms) {
        expect(known.has(roomId), `${post.id} -> ${roomId}`).toBe(true);
      }
      expect(post.rooms).toContain(post.primaryRoom);
    }
  });

  it('puts every room a work order lands in inside the right trade post', () => {
    for (const [specialty, roomId] of Object.entries(ORDER_ROOMS)) {
      const post = postForSpecialty(specialty as SpecialtyId);
      expect(post.rooms, `${specialty} orders land in ${roomId}`).toContain(roomId);
    }
  });

  it("is the single statement of the ship's establishment", () => {
    const billeted = POSTS.filter((p) => p.billets !== null);
    expect(CREW_COMPOSITION).toHaveLength(billeted.length);
    const total = CREW_COMPOSITION.reduce((sum, e) => sum + e.count, 0);
    expect(newCampaign(1).crew.filter((c) => postDef(c.postId).billets !== null)).toHaveLength(
      total,
    );
  });
});

describe('everyone holds a post', () => {
  it('appoints the whole company by trade at campaign start', () => {
    const s = newCampaign(4242);
    for (const c of s.crew) {
      expect(() => postDef(c.postId), c.name).not.toThrow();
      expect(postDef(c.postId).specialties, `${c.name} (${c.primary})`).toContain(c.primary);
    }
  });

  it('stands everyone in one of their own post rooms', () => {
    const s = newCampaign(7);
    for (const c of s.crew) {
      expect(postDef(c.postId).rooms, `${c.name} in ${c.assignmentRoomId}`).toContain(
        c.assignmentRoomId,
      );
    }
  });

  it('keeps them in their post rooms across a week of turns', () => {
    const s = newCampaign(11);
    for (let day = 0; day < 7; day++) {
      s.pendingEvents = [];
      endDay(s);
    }
    for (const c of s.crew) {
      expect(postDef(c.postId).rooms).toContain(c.assignmentRoomId);
    }
  });
});

describe('stationing follows the work', () => {
  it('pulls a trade into the space its backlog is in', () => {
    const s = newCampaign(21);
    const post = postForSpecialty('avionics');
    const shop = ORDER_ROOMS.avionics!;

    // No work anywhere: people are spread across the post's spaces.
    s.workOrders.length = 0;
    stationCrew(s);
    const spreadInShop = crewInPost(s, post.id).filter((c) => c.assignmentRoomId === shop).length;

    // A heavy avionics backlog should draw the trade to the shop.
    for (const a of s.aircraft) openWorkOrder(s, a.id, 'avionics', 3);
    stationCrew(s);
    const drawnToShop = crewInPost(s, post.id).filter((c) => c.assignmentRoomId === shop).length;

    expect(drawnToShop).toBeGreaterThan(spreadInShop);
  });

  it('leaves nobody stranded where their trade never has work', () => {
    // The bug the post model exists to remove: technicians appointed to a
    // compartment their trade's orders never reach did nothing, for ever.
    const s = newCampaign(4242);
    for (const a of s.aircraft) {
      openWorkOrder(s, a.id, 'avionics', 2);
      openWorkOrder(s, a.id, 'engine', 2);
    }
    stationCrew(s);

    for (const specialty of ['avionics', 'engine'] as SpecialtyId[]) {
      const post = postForSpecialty(specialty);
      const people = crewInPost(s, post.id);
      const inTheRightPlace = people.filter(
        (c) => c.assignmentRoomId === ORDER_ROOMS[specialty],
      ).length;
      // With all of the trade's work in one space, the whole trade is in it.
      // More than the space's nominal capacity is deliberate: an extra pair
      // of hands on the backlog beats a technician standing idle next door.
      expect(inTheRightPlace, specialty).toBe(people.length);
    }
  });

  it('never puts more people in a space than it can use', () => {
    const s = newCampaign(31);
    for (const a of s.aircraft) openWorkOrder(s, a.id, 'avionics', 3);
    stationCrew(s);
    for (const room of ALL_ROOMS) {
      const here = s.crew.filter((c) => c.assignmentRoomId === room.id).length;
      // The overflow falls back to the post's home space, which may exceed
      // capacity; no other space should.
      const isHome = POSTS.some((p) => p.primaryRoom === room.id);
      if (!isHome) expect(here, room.id).toBeLessThanOrEqual(room.capacity);
    }
  });

  it('is deterministic: the same state stations the same way', () => {
    const s = newCampaign(41);
    for (const a of s.aircraft) openWorkOrder(s, a.id, 'engine', 2);
    stationCrew(s);
    const first = s.crew.map((c) => `${c.id}:${c.assignmentRoomId}`).join('|');
    stationCrew(s);
    expect(s.crew.map((c) => `${c.id}:${c.assignmentRoomId}`).join('|')).toBe(first);
  });
});

describe('appointing people', () => {
  it('moves someone to a new post and stands them in it', () => {
    const s = newCampaign(51);
    const target = postForSpecialty('supply');
    const person = s.crew.find((c) => c.primary === 'avionics')!;

    expect(appointToPost(s, person.id, target.id)).toBe(true);
    expect(person.postId).toBe(target.id);
    expect(target.rooms).toContain(person.assignmentRoomId);
    expect(person.career.some((e) => e.key === 'Appointed to {post}')).toBe(true);
  });

  it('refuses a post that does not exist, and a no-op', () => {
    const s = newCampaign(52);
    const person = s.crew[0]!;
    expect(appointToPost(s, person.id, 'post-nonsense')).toBe(false);
    expect(appointToPost(s, person.id, person.postId)).toBe(false);
  });

  it('reports manning against the establishment', () => {
    const s = newCampaign(53);
    const post = postForSpecialty('medic');
    expect(postManning(s, post.id)).toBeCloseTo(
      postStrength(s, post.id) / post.billets!,
      5,
    );

    // Strip the post and it reads as short-handed.
    for (const c of crewInPost(s, post.id).slice(1)) {
      appointToPost(s, c.id, postForSpecialty('supply').id);
    }
    expect(postManning(s, post.id)!).toBeLessThan(1);
  });

  it('has no establishment figure for the squadrons', () => {
    const s = newCampaign(54);
    expect(postManning(s, postForSpecialty('pilot').id)).toBeNull();
    expect(postStrength(s, postForSpecialty('pilot').id)).toBeGreaterThan(0);
  });
});

describe('ranking by fitness', () => {
  it('puts the post trade above ability', () => {
    const s = newCampaign(61);
    const post = postForSpecialty('avionics');
    const greenTechnician = s.crew
      .filter((c) => c.primary === 'avionics')
      .sort((a, b) => a.attrs.technical - b.attrs.technical)[0]!;
    const expertOutsider = s.crew
      .filter((c) => c.primary === 'electrical')
      .sort((a, b) => b.attrs.technical - a.attrs.technical)[0]!;

    expect(postFit(greenTechnician, post).tier).toBe(3);
    expect(postFit(greenTechnician, post).score).toBeGreaterThan(
      postFit(expertOutsider, post).score,
    );
  });

  it("offers a person their own trade's post first", () => {
    const s = newCampaign(62);
    for (const specialty of ['avionics', 'medic', 'handling'] as SpecialtyId[]) {
      const person = s.crew.find((c) => c.primary === specialty)!;
      expect(postsByFit(person)[0]!.id, specialty).toBe(postForSpecialty(specialty).id);
    }
  });

  it('lists the posts that work in a shared compartment', () => {
    // A maintenance bay is worked by more than one trade, which is exactly
    // why a compartment is not the unit of assignment.
    const posts = postsForRoom('d2-maint1').map((p) => p.id);
    expect(posts.length).toBeGreaterThan(1);
    expect(posts).toContain(postForSpecialty('avionics').id);
    expect(posts).toContain(postForSpecialty('engine').id);
  });
});

describe('maintenance actually gets done', () => {
  it('works the backlog down instead of stranding the trade', () => {
    const s: GameState = newCampaign(4242);
    s.supplies.parts = 100;
    for (const a of s.aircraft) openWorkOrder(s, a.id, 'avionics', 2);
    const outstanding = () =>
      s.workOrders.reduce((sum, w) => sum + (w.labourRequired - w.labourDone), 0);
    const before = outstanding();

    s.pendingEvents = [];
    endDay(s);

    expect(outstanding()).toBeLessThan(before);
  });
});
