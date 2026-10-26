import type { DeptId, PostDef, SpecialtyId } from '../core/types';

/**
 * The ship's posts — the *functions* people are appointed to.
 *
 * A trade covers several compartments: avionics work happens in the avionics
 * shop and in the maintenance bays, engine work in the engine shop, a bay and
 * the machine shop. Appointing someone to a single compartment therefore
 * either strands them somewhere the work never arrives, or forces the player
 * to shuffle people between spaces that do the same job. A post is the unit
 * that matches how the work is actually defined.
 *
 * `rooms` is the compartments the post's people work in. Where they are on
 * any given day is derived from it by `stationCrew()`, which pulls them
 * toward whichever of those spaces has work waiting — so a compartment still
 * has occupants, and the deck still shows people where the job is.
 *
 * One post per trade today. `specialties` is a list because nothing in the
 * simulation requires it to stay that way.
 */
const post = (
  id: string,
  name: string,
  short: string,
  department: DeptId,
  specialty: SpecialtyId,
  rooms: string[],
  billets: number | null,
): PostDef => ({
  id,
  name,
  short,
  department,
  specialties: [specialty],
  rooms,
  // The first room is the post's home: where its people muster when there is
  // nothing pulling them anywhere in particular.
  primaryRoom: rooms[0]!,
  billets,
});

export const POSTS: PostDef[] = [
  post(
    'post-avionics',
    'Avionics Maintenance',
    'AVIONICS',
    'MAINT',
    'avionics',
    ['d2-avionics', 'd2-maint1'],
    9,
  ),
  post(
    'post-engine',
    'Engine Maintenance',
    'ENGINES',
    'MAINT',
    'engine',
    ['d2-engineshop', 'd2-maint1', 'd4-machineshop'],
    8,
  ),
  post(
    'post-airframe',
    'Airframe Maintenance',
    'AIRFRAMES',
    'MAINT',
    'airframe',
    ['d2-airframe', 'd2-maint2', 'd4-machineshop'],
    8,
  ),
  post(
    'post-ordnance',
    'Ordnance Handling',
    'ORDNANCE',
    'AIR',
    'weapons',
    ['d2-ordnance', 'd7-weaponsprep'],
    6,
  ),
  post(
    'post-handling',
    'Flight Deck Handling',
    'DECK HANDLING',
    'DECK',
    'handling',
    ['d1-landing', 'd1-catapult', 'd2-hangarctrl'],
    8,
  ),
  post(
    'post-movement',
    'Aircraft Movement',
    'MOVEMENT',
    'DECK',
    'tractor',
    ['d1-parking', 'd2-park1', 'd2-park2'],
    5,
  ),
  post(
    'post-flightops',
    'Flight Operations',
    'FLIGHT OPS',
    'AIR',
    'flightops',
    ['d1-catcontrol', 'd3-ready1', 'd2-fueling'],
    5,
  ),
  post(
    'post-airpicture',
    'Air Picture Watch',
    'AIR PICTURE',
    'OPS',
    'radar',
    ['d3-cic', 'd1-radar'],
    6,
  ),
  post(
    'post-aircontrol',
    'Air Traffic Control',
    'AIR CONTROL',
    'OPS',
    'aircontrol',
    ['d3-cic', 'd1-island'],
    4,
  ),
  post(
    'post-comms',
    'Communications Watch',
    'COMMS WATCH',
    'OPS',
    'comms',
    ['d3-comms', 'd3-intel'],
    4,
  ),
  post(
    'post-electrical',
    'Electrical & Machinery',
    'ELECTRICAL',
    'ENG',
    'electrical',
    ['d4-electrical', 'd4-machinery', 'd7-reactorctrl'],
    7,
  ),
  post(
    'post-damagecontrol',
    'Damage Control Watch',
    'DAMAGE CONTROL',
    'ENG',
    'damagecontrol',
    ['d4-dcc', 'd4-pump'],
    6,
  ),
  post(
    'post-medical',
    'Medical Department',
    'MEDICAL',
    'MED',
    'medic',
    ['d3-medical', 'd3-dental'],
    4,
  ),
  post(
    'post-supply',
    'Stores & Supply',
    'SUPPLY',
    'SUP',
    'supply',
    ['d2-parts', 'd6-genstore', 'd3-galley'],
    5,
  ),

  // The squadrons are established by the embarked air wing rather than by the
  // ship, so their strength comes from the seats the wing has to fill (see
  // `generateAircrew`) and they carry no billet figure of their own.
  post(
    'post-squadrons',
    'Flying Squadrons',
    'SQUADRONS',
    'AIR',
    'pilot',
    ['d3-ready1', 'd3-ready2'],
    null,
  ),
  post(
    'post-missioncrew',
    'Mission Aircrew',
    'MISSION AIRCREW',
    'AIR',
    'aircrew',
    ['d3-ready2', 'd3-ready1'],
    null,
  ),
];

export const POSTS_BY_ID: Record<string, PostDef> = Object.fromEntries(
  POSTS.map((p) => [p.id, p]),
);

/** Throws on an unknown id: a bad post reference is a bug, not a state. */
export function postDef(id: string): PostDef {
  const found = POSTS_BY_ID[id];
  if (!found) throw new Error(`Unknown post ${id}`);
  return found;
}

const BY_SPECIALTY: Record<string, PostDef> = Object.fromEntries(
  POSTS.flatMap((p) => p.specialties.map((s) => [s, p])),
);

/** The post a trade belongs to. Every specialty has exactly one; a test asserts it. */
export function postForSpecialty(specialty: SpecialtyId): PostDef {
  const found = BY_SPECIALTY[specialty];
  if (!found) throw new Error(`No post covers ${specialty}`);
  return found;
}

/** The posts whose people work in a given compartment. */
export function postsForRoom(roomId: string): PostDef[] {
  return POSTS.filter((p) => p.rooms.includes(roomId));
}

/** Compartments that have no post working in them cannot be manned. */
export function isManned(roomId: string): boolean {
  return postsForRoom(roomId).length > 0;
}
