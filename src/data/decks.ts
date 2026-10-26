import type { DeckDef, DeptId, PropKind, RoomDef, RoomKind, SpecialtyId } from '../core/types';

/**
 * Carrier structure, transcribed from `specifications/pixel art decks.png`.
 *
 * Every deck shares one tile grid (DECK_W x DECK_H) so the camera, the
 * mini carrier map and pathfinding can treat decks interchangeably. Each
 * deck carries its own hull silhouette: the ship narrows as you go down.
 *
 * Layout follows the concept art — an upper room band, a full-length
 * central passageway, and a lower room band — with elevators and ladders
 * at fixed frames so vertical movement lines up between decks.
 */

export const TILE = 8;
export const DECK_W = 208;
export const DECK_H = 26;

/** Fixed frames for vertical connections, shared by every deck. */
const ELEVATOR_X = [62, 150];
const STAIR_X = [26, 106, 186];

const UPPER_Y = 2;
const UPPER_H = 9;
const PASSAGE_Y = 11;
const PASSAGE_H = 4;
const LOWER_Y = 15;
const LOWER_H = 9;

/**
 * Hull silhouette. Bow is to the right and tapers to a point; the stern
 * (left) is blunt with a small transom. `inset` pulls the sides in for
 * decks further below the waterline.
 */
function makeHull(inset: number, bowLen: number): { y: number; x0: number; x1: number }[] {
  const rows: { y: number; x0: number; x1: number }[] = [];
  const mid = (DECK_H - 1) / 2;
  for (let y = 0; y < DECK_H; y++) {
    const fromMid = Math.abs(y - mid) / mid; // 0 at centreline, 1 at the edge
    const sideInset = Math.round(inset * fromMid * fromMid);
    const x0 = 2 + sideInset;
    // Bow taper: the closer to the edge, the sooner the hull ends.
    const bowCut = Math.round(bowLen * fromMid * fromMid);
    const x1 = DECK_W - 3 - bowCut;
    rows.push({ y, x0, x1 });
  }
  return rows;
}

interface BandEntry {
  id: string;
  name: string;
  short: string;
  kind: RoomKind;
  dept: DeptId;
  /** Relative width; the band is divided proportionally. */
  w: number;
  spec?: SpecialtyId[];
  cap?: number;
  props?: PropKind[];
}

/** Distributes entries across [x0,x1] proportionally to their `w`. */
function band(
  deck: number,
  y: number,
  h: number,
  x0: number,
  x1: number,
  entries: BandEntry[],
): RoomDef[] {
  const gap = 1;
  const totalW = entries.reduce((s, e) => s + e.w, 0);
  const usable = x1 - x0 - gap * (entries.length - 1);
  const rooms: RoomDef[] = [];
  let cursor = x0;
  entries.forEach((e, i) => {
    const w = i === entries.length - 1 ? x1 - cursor : Math.max(6, Math.round((usable * e.w) / totalW));
    rooms.push({
      id: e.id,
      deck,
      name: e.name,
      short: e.short,
      kind: e.kind,
      department: e.dept,
      rect: { x: cursor, y, w, h },
      specialties: e.spec ?? [],
      capacity: e.cap ?? Math.max(2, Math.floor((w * h) / 22)),
      props: layoutProps(w, h, e.props ?? propsForKind(e.kind)),
    });
    cursor += w + gap;
  });
  return rooms;
}

function propsForKind(kind: RoomKind): PropKind[] {
  switch (kind) {
    case 'work':
      return ['toolrack', 'bench', 'console'];
    case 'command':
      return ['console', 'plot', 'console'];
    case 'berthing':
      return ['bunk', 'bunk', 'locker'];
    case 'mess':
      return ['table', 'table', 'bench'];
    case 'medical':
      return ['bench', 'locker', 'console'];
    case 'training':
      return ['console', 'bench', 'plot'];
    case 'store':
      return ['crate', 'crate', 'locker'];
    case 'hangar':
      return ['toolrack', 'crate'];
    default:
      return ['crate'];
  }
}

/** Scatters props on a deterministic lattice so rooms read as furnished. */
function layoutProps(w: number, h: number, kinds: PropKind[]): { x: number; y: number; kind: PropKind }[] {
  if (kinds.length === 0) return [];
  const out: { x: number; y: number; kind: PropKind }[] = [];
  const stepX = 4;
  const stepY = 3;
  let i = 0;
  for (let y = 2; y < h - 1; y += stepY) {
    for (let x = 2; x < w - 1; x += stepX) {
      out.push({ x, y, kind: kinds[i % kinds.length]! });
      i++;
    }
  }
  return out;
}

/** Elevator and ladder trunks, repeated on every deck at the same frames. */
function verticalConnections(deck: number, decks: number[]): RoomDef[] {
  const rooms: RoomDef[] = [];
  ELEVATOR_X.forEach((x, i) => {
    rooms.push({
      id: `d${deck}-elev${i + 1}`,
      deck,
      name: i === 0 ? 'Aircraft Elevator (Fwd)' : 'Aircraft Elevator (Aft)',
      short: i === 0 ? 'ELEV FWD' : 'ELEV AFT',
      kind: 'elevator',
      department: 'DECK',
      rect: { x, y: PASSAGE_Y - 1, w: 8, h: PASSAGE_H + 2 },
      specialties: [],
      capacity: 4,
      connects: decks,
      props: [],
    });
  });
  STAIR_X.forEach((x, i) => {
    rooms.push({
      id: `d${deck}-stair${i + 1}`,
      deck,
      name: 'Ladder / Access',
      short: 'LADDER',
      kind: 'stairs',
      department: 'DECK',
      rect: { x, y: PASSAGE_Y, w: 5, h: PASSAGE_H },
      specialties: [],
      capacity: 3,
      connects: decks,
      props: [],
    });
  });
  return rooms;
}

const ALL_DECKS = [1, 2, 3, 4, 5, 6, 7, 8];

// ---------------------------------------------------------------------------
// Deck 01 — Flight Deck
// ---------------------------------------------------------------------------

function deck01(): DeckDef {
  const rooms: RoomDef[] = [];
  // The flight deck is open: a few very large areas rather than a room grid.
  rooms.push({
    id: 'd1-landing',
    deck: 1,
    name: 'Landing Area',
    short: 'LANDING',
    kind: 'flight',
    department: 'DECK',
    rect: { x: 8, y: 3, w: 92, h: 10 },
    specialties: ['handling', 'flightops'],
    capacity: 14,
    props: [
      { x: 14, y: 4, kind: 'arrestor' },
      { x: 30, y: 4, kind: 'arrestor' },
      { x: 46, y: 4, kind: 'arrestor' },
      { x: 62, y: 4, kind: 'arrestor' },
    ],
  });
  rooms.push({
    id: 'd1-catapult',
    deck: 1,
    name: 'Takeoff Area (Catapults)',
    short: 'CATAPULTS',
    kind: 'flight',
    department: 'DECK',
    rect: { x: 118, y: 3, w: 84, h: 9 },
    specialties: ['handling', 'flightops'],
    capacity: 12,
    props: [
      { x: 10, y: 3, kind: 'catapult' },
      { x: 40, y: 3, kind: 'catapult' },
      { x: 10, y: 6, kind: 'catapult' },
      { x: 40, y: 6, kind: 'catapult' },
    ],
  });
  rooms.push({
    id: 'd1-parking',
    deck: 1,
    name: 'Parked Aircraft',
    short: 'PARKING',
    kind: 'flight',
    department: 'DECK',
    rect: { x: 8, y: 16, w: 96, h: 8 },
    specialties: ['handling', 'tractor'],
    capacity: 10,
    props: [],
  });
  rooms.push({
    id: 'd1-catcontrol',
    deck: 1,
    name: 'Catapult Control',
    short: 'CAT CTRL',
    kind: 'work',
    department: 'DECK',
    rect: { x: 128, y: 16, w: 18, h: 7 },
    specialties: ['flightops', 'handling'],
    capacity: 4,
    props: layoutProps(18, 7, ['console', 'console']),
  });
  rooms.push({
    id: 'd1-island',
    deck: 1,
    name: 'Island — Bridge & Flight Control',
    short: 'ISLAND',
    kind: 'command',
    department: 'CMD',
    rect: { x: 104, y: 14, w: 20, h: 9 },
    specialties: ['aircontrol', 'comms'],
    capacity: 8,
    props: layoutProps(20, 9, ['console', 'plot', 'console']),
  });
  rooms.push({
    id: 'd1-radar',
    deck: 1,
    name: 'Radar / Sensors',
    short: 'RADAR',
    kind: 'work',
    department: 'OPS',
    rect: { x: 150, y: 16, w: 20, h: 7 },
    specialties: ['radar', 'comms'],
    capacity: 5,
    props: layoutProps(20, 7, ['radar', 'console']),
  });
  rooms.push({
    id: 'd1-safetynet',
    deck: 1,
    name: 'Deck Edge Safety Net',
    short: 'SAFETY NET',
    kind: 'store',
    department: 'DECK',
    rect: { x: 174, y: 16, w: 16, h: 6 },
    specialties: [],
    capacity: 2,
    props: [],
  });
  rooms.push(...verticalConnections(1, ALL_DECKS));
  return {
    index: 1,
    id: 'deck01',
    name: 'Flight Deck',
    short: 'FLIGHT DECK',
    w: DECK_W,
    h: DECK_H,
    hull: makeHull(0, 26),
    rooms,
  };
}

// ---------------------------------------------------------------------------
// Decks 02–08 — banded interior layouts
// ---------------------------------------------------------------------------

function deck02(): DeckDef {
  const rooms = [
    ...band(2, UPPER_Y, UPPER_H, 8, 200, [
      { id: 'd2-park1', name: 'Aircraft Parking (Fwd)', short: 'PARKING F', kind: 'hangar', dept: 'DECK', w: 22, spec: ['handling', 'tractor'], cap: 8 },
      { id: 'd2-maint1', name: 'Aircraft Maintenance Bay 1', short: 'MAINT 1', kind: 'hangar', dept: 'MAINT', w: 20, spec: ['engine', 'airframe'], cap: 10 },
      { id: 'd2-avionics', name: 'Avionics Shop', short: 'AVIONICS', kind: 'work', dept: 'MAINT', w: 16, spec: ['avionics'], cap: 8 },
      { id: 'd2-engineshop', name: 'Engine Shop', short: 'ENGINE SHOP', kind: 'work', dept: 'MAINT', w: 16, spec: ['engine'], cap: 8 },
      { id: 'd2-ordnance', name: 'Ordnance Handling', short: 'ORDNANCE', kind: 'work', dept: 'AIR', w: 16, spec: ['weapons'], cap: 7 },
      { id: 'd2-parts', name: 'Parts & Stores', short: 'PARTS', kind: 'store', dept: 'SUP', w: 15, spec: ['supply'], cap: 5 },
    ]),
    ...band(2, LOWER_Y, LOWER_H, 8, 200, [
      { id: 'd2-park2', name: 'Aircraft Parking (Aft)', short: 'PARKING A', kind: 'hangar', dept: 'DECK', w: 22, spec: ['handling', 'tractor'], cap: 8 },
      { id: 'd2-maint2', name: 'Aircraft Maintenance Bay 2', short: 'MAINT 2', kind: 'hangar', dept: 'MAINT', w: 20, spec: ['airframe', 'engine'], cap: 10 },
      { id: 'd2-airframe', name: 'Airframe Work Bays', short: 'WORK BAYS', kind: 'work', dept: 'MAINT', w: 18, spec: ['airframe'], cap: 8 },
      { id: 'd2-fueling', name: 'Fueling Point', short: 'FUELING', kind: 'work', dept: 'AIR', w: 14, spec: ['flightops'], cap: 4 },
      { id: 'd2-hangarctrl', name: 'Hangar Control', short: 'HANGAR CTRL', kind: 'command', dept: 'DECK', w: 15, spec: ['handling', 'flightops'], cap: 5 },
      { id: 'd2-tools', name: 'Tool Room', short: 'TOOL ROOM', kind: 'store', dept: 'MAINT', w: 12, spec: ['supply'], cap: 3 },
    ]),
    ...verticalConnections(2, ALL_DECKS),
  ];
  return { index: 2, id: 'deck02', name: 'Hangar Deck', short: 'HANGAR DECK', w: DECK_W, h: DECK_H, hull: makeHull(1, 22), rooms };
}

function deck03(): DeckDef {
  const rooms = [
    ...band(3, UPPER_Y, UPPER_H, 10, 198, [
      { id: 'd3-ready1', name: 'Ready Room — Fighter Squadron', short: 'READY 1', kind: 'training', dept: 'AIR', w: 18, spec: ['flightops', 'pilot'], cap: 26 },
      { id: 'd3-ready2', name: 'Ready Room — Support Squadron', short: 'READY 2', kind: 'training', dept: 'AIR', w: 16, spec: ['flightops', 'aircrew'], cap: 22 },
      { id: 'd3-cic', name: 'Combat Information Center', short: 'CIC', kind: 'command', dept: 'OPS', w: 22, spec: ['radar', 'aircontrol'], cap: 12 },
      { id: 'd3-comms', name: 'Communications', short: 'COMMS', kind: 'work', dept: 'OPS', w: 15, spec: ['comms'], cap: 6 },
      { id: 'd3-intel', name: 'Intelligence & EW', short: 'INTEL/EW', kind: 'work', dept: 'OPS', w: 15, spec: ['radar', 'comms'], cap: 6 },
      { id: 'd3-officer', name: 'Officer Country', short: 'OFFICERS', kind: 'berthing', dept: 'CMD', w: 16, cap: 8 },
    ]),
    ...band(3, LOWER_Y, LOWER_H, 10, 198, [
      { id: 'd3-wardroom', name: 'Wardroom / Mess', short: 'WARDROOM', kind: 'mess', dept: 'SUP', w: 18, spec: ['supply'], cap: 10 },
      { id: 'd3-galley', name: 'Galley', short: 'GALLEY', kind: 'mess', dept: 'SUP', w: 16, spec: ['supply'], cap: 8 },
      { id: 'd3-medical', name: 'Medical Clinic', short: 'MEDICAL', kind: 'medical', dept: 'MED', w: 20, spec: ['medic'], cap: 10 },
      { id: 'd3-dental', name: 'Dental', short: 'DENTAL', kind: 'medical', dept: 'MED', w: 12, spec: ['medic'], cap: 3 },
      { id: 'd3-training', name: 'Training Center', short: 'TRAINING', kind: 'training', dept: 'CMD', w: 20, cap: 14 },
      { id: 'd3-store', name: 'Ship Store', short: 'SHIP STORE', kind: 'store', dept: 'SUP', w: 12, spec: ['supply'], cap: 3 },
    ]),
    ...verticalConnections(3, ALL_DECKS),
  ];
  return { index: 3, id: 'deck03', name: 'Main Deck', short: 'MAIN DECK', w: DECK_W, h: DECK_H, hull: makeHull(2, 20), rooms };
}

function deck04(): DeckDef {
  const rooms = [
    ...band(4, UPPER_Y, UPPER_H, 10, 196, [
      { id: 'd4-engctrl', name: 'Engineering Control', short: 'ENG CTRL', kind: 'command', dept: 'ENG', w: 20, spec: ['electrical'], cap: 8 },
      { id: 'd4-machinery', name: 'Main Machinery Room', short: 'MACHINERY', kind: 'work', dept: 'ENG', w: 24, spec: ['electrical', 'damagecontrol'], cap: 12 },
      { id: 'd4-boilers', name: 'Boilers / Auxiliary Systems', short: 'AUX SYS', kind: 'work', dept: 'ENG', w: 20, spec: ['electrical'], cap: 8 },
      { id: 'd4-electrical', name: 'Electrical Room', short: 'ELECTRICAL', kind: 'work', dept: 'ENG', w: 16, spec: ['electrical'], cap: 6 },
      { id: 'd4-cooling', name: 'Cooling Systems', short: 'COOLING', kind: 'work', dept: 'ENG', w: 16, spec: ['electrical'], cap: 5 },
    ]),
    ...band(4, LOWER_Y, LOWER_H, 10, 196, [
      { id: 'd4-dcc', name: 'Damage Control Central', short: 'DC CENTRAL', kind: 'command', dept: 'ENG', w: 20, spec: ['damagecontrol'], cap: 10 },
      { id: 'd4-pump', name: 'Pump Room', short: 'PUMP ROOM', kind: 'work', dept: 'ENG', w: 16, spec: ['damagecontrol'], cap: 5 },
      { id: 'd4-machineshop', name: 'Workshop / Machine Shop', short: 'MACHINE SHOP', kind: 'work', dept: 'MAINT', w: 22, spec: ['airframe', 'engine'], cap: 9 },
      { id: 'd4-dcstore', name: 'Damage Control Locker', short: 'DC LOCKER', kind: 'store', dept: 'ENG', w: 14, spec: ['damagecontrol'], cap: 4 },
      { id: 'd4-maintstore', name: 'Maintenance Storage', short: 'MAINT STORE', kind: 'store', dept: 'SUP', w: 16, spec: ['supply'], cap: 4 },
    ]),
    ...verticalConnections(4, ALL_DECKS),
  ];
  return { index: 4, id: 'deck04', name: 'Engineering Deck', short: 'ENGINEERING DECK', w: DECK_W, h: DECK_H, hull: makeHull(3, 18), rooms };
}

function deck05(): DeckDef {
  const rooms = [
    ...band(5, UPPER_Y, UPPER_H, 10, 196, [
      { id: 'd5-berth1', name: 'Crew Quarters — Forward', short: 'BERTHING F', kind: 'berthing', dept: 'SUP', w: 24, cap: 40 },
      { id: 'd5-berth2', name: 'Crew Quarters — Midships', short: 'BERTHING M', kind: 'berthing', dept: 'SUP', w: 24, cap: 40 },
      { id: 'd5-berth3', name: 'Crew Quarters — Aft', short: 'BERTHING A', kind: 'berthing', dept: 'SUP', w: 24, cap: 40 },
      { id: 'd5-chapel', name: 'Chapel / Quiet Room', short: 'CHAPEL', kind: 'mess', dept: 'SUP', w: 14, cap: 6 },
      { id: 'd5-laundry', name: 'Laundry', short: 'LAUNDRY', kind: 'work', dept: 'SUP', w: 12, spec: ['supply'], cap: 4 },
    ]),
    ...band(5, LOWER_Y, LOWER_H, 10, 196, [
      { id: 'd5-mess', name: 'Crew Mess', short: 'CREW MESS', kind: 'mess', dept: 'SUP', w: 26, spec: ['supply'], cap: 30 },
      { id: 'd5-rec', name: 'Recreation Area', short: 'RECREATION', kind: 'mess', dept: 'SUP', w: 20, cap: 18 },
      { id: 'd5-gym', name: 'Gym', short: 'GYM', kind: 'training', dept: 'SUP', w: 16, cap: 12 },
      { id: 'd5-heads', name: 'Showers / Head', short: 'HEADS', kind: 'work', dept: 'SUP', w: 14, cap: 8 },
      { id: 'd5-elevlobby', name: 'Elevator Lobby', short: 'LOBBY', kind: 'store', dept: 'DECK', w: 12, cap: 4 },
    ]),
    ...verticalConnections(5, ALL_DECKS),
  ];
  return { index: 5, id: 'deck05', name: 'Crew Deck', short: 'CREW DECK', w: DECK_W, h: DECK_H, hull: makeHull(4, 16), rooms };
}

function deck06(): DeckDef {
  const rooms = [
    ...band(6, UPPER_Y, UPPER_H, 12, 194, [
      { id: 'd6-fuel', name: 'Aviation Fuel Storage', short: 'FUEL STORAGE', kind: 'store', dept: 'SUP', w: 24, spec: ['supply'], cap: 5 },
      { id: 'd6-ballast', name: 'Ballast Tanks Access', short: 'BALLAST', kind: 'work', dept: 'ENG', w: 18, spec: ['damagecontrol'], cap: 4 },
      { id: 'd6-technical', name: 'Technical Spaces', short: 'TECHNICAL', kind: 'work', dept: 'ENG', w: 20, spec: ['electrical'], cap: 6 },
      { id: 'd6-vent', name: 'Ventilation Systems', short: 'VENTILATION', kind: 'work', dept: 'ENG', w: 18, spec: ['electrical'], cap: 5 },
      { id: 'd6-generators', name: 'Emergency Generators', short: 'EMERG GEN', kind: 'work', dept: 'ENG', w: 18, spec: ['electrical'], cap: 5 },
    ]),
    ...band(6, LOWER_Y, LOWER_H, 12, 194, [
      { id: 'd6-sewage', name: 'Sewage Treatment', short: 'SEWAGE', kind: 'work', dept: 'ENG', w: 18, spec: ['damagecontrol'], cap: 4 },
      { id: 'd6-workshopstore', name: 'Workshop Storage', short: 'SHOP STORE', kind: 'store', dept: 'MAINT', w: 20, spec: ['supply'], cap: 4 },
      { id: 'd6-genstore', name: 'General Stores', short: 'GEN STORES', kind: 'store', dept: 'SUP', w: 22, spec: ['supply'], cap: 6 },
      { id: 'd6-access1', name: 'Access / Maintenance', short: 'ACCESS', kind: 'work', dept: 'ENG', w: 18, spec: ['damagecontrol'], cap: 4 },
      { id: 'd6-medstore', name: 'Medical Stores', short: 'MED STORES', kind: 'store', dept: 'MED', w: 16, spec: ['medic', 'supply'], cap: 3 },
    ]),
    ...verticalConnections(6, ALL_DECKS),
  ];
  return { index: 6, id: 'deck06', name: 'Support Deck', short: 'SUPPORT DECK', w: DECK_W, h: DECK_H, hull: makeHull(6, 14), rooms };
}

function deck07(): DeckDef {
  const rooms = [
    ...band(7, UPPER_Y, UPPER_H, 16, 190, [
      { id: 'd7-reactorctrl', name: 'Reactor Control', short: 'REACTOR CTRL', kind: 'command', dept: 'ENG', w: 22, spec: ['electrical'], cap: 8 },
      { id: 'd7-reactoraux', name: 'Reactor Auxiliary', short: 'REACTOR AUX', kind: 'work', dept: 'ENG', w: 22, spec: ['electrical', 'damagecontrol'], cap: 8 },
      { id: 'd7-propulsion', name: 'Propulsion Machinery', short: 'PROPULSION', kind: 'work', dept: 'ENG', w: 24, spec: ['electrical'], cap: 10 },
      { id: 'd7-auxmach', name: 'Auxiliary Machinery', short: 'AUX MACH', kind: 'work', dept: 'ENG', w: 20, spec: ['electrical'], cap: 6 },
    ]),
    ...band(7, LOWER_Y, LOWER_H, 16, 190, [
      { id: 'd7-magazine', name: 'Ammunition Magazine', short: 'MAGAZINE', kind: 'store', dept: 'AIR', w: 24, spec: ['weapons'], cap: 6 },
      { id: 'd7-weaponsprep', name: 'Weapons Preparation', short: 'WPN PREP', kind: 'work', dept: 'AIR', w: 20, spec: ['weapons'], cap: 8 },
      { id: 'd7-refrig', name: 'Refrigerated Stores', short: 'REEFER', kind: 'store', dept: 'SUP', w: 20, spec: ['supply'], cap: 4 },
      { id: 'd7-hold', name: 'Stores Hold', short: 'HOLD', kind: 'store', dept: 'SUP', w: 22, spec: ['supply'], cap: 5 },
    ]),
    ...verticalConnections(7, ALL_DECKS),
  ];
  return { index: 7, id: 'deck07', name: 'Lower Deck', short: 'LOWER DECK', w: DECK_W, h: DECK_H, hull: makeHull(8, 12), rooms };
}

function deck08(): DeckDef {
  const rooms = [
    ...band(8, UPPER_Y, UPPER_H, 22, 184, [
      { id: 'd8-sonar', name: 'Sonar Room', short: 'SONAR', kind: 'work', dept: 'OPS', w: 22, spec: ['radar'], cap: 5 },
      { id: 'd8-steering', name: 'Steering Gear Room', short: 'STEERING', kind: 'work', dept: 'ENG', w: 24, spec: ['electrical'], cap: 6 },
      { id: 'd8-stabilizer', name: 'Stabilizer Systems', short: 'STABILIZERS', kind: 'work', dept: 'ENG', w: 22, spec: ['damagecontrol'], cap: 5 },
      { id: 'd8-void1', name: 'Void / Maintenance', short: 'VOID', kind: 'store', dept: 'ENG', w: 18, cap: 2 },
    ]),
    ...band(8, LOWER_Y, LOWER_H, 22, 184, [
      { id: 'd8-freshwater', name: 'Fresh Water Tanks', short: 'FRESH WATER', kind: 'store', dept: 'SUP', w: 26, spec: ['supply'], cap: 3 },
      { id: 'd8-bilge', name: 'Bilge / Pump Access', short: 'BILGE', kind: 'work', dept: 'ENG', w: 22, spec: ['damagecontrol'], cap: 4 },
      { id: 'd8-access2', name: 'Access / Maintenance', short: 'ACCESS', kind: 'work', dept: 'ENG', w: 20, spec: ['damagecontrol'], cap: 4 },
      { id: 'd8-void2', name: 'Void / Maintenance', short: 'VOID', kind: 'store', dept: 'ENG', w: 18, cap: 2 },
    ]),
    ...verticalConnections(8, ALL_DECKS),
  ];
  return { index: 8, id: 'deck08', name: 'Hull — Below Waterline', short: 'BELOW WATERLINE', w: DECK_W, h: DECK_H, hull: makeHull(11, 10), rooms };
}

export const DECKS: DeckDef[] = [
  deck01(),
  deck02(),
  deck03(),
  deck04(),
  deck05(),
  deck06(),
  deck07(),
  deck08(),
];

export const ROOMS_BY_ID: Record<string, RoomDef> = {};
for (const deck of DECKS) {
  for (const room of deck.rooms) {
    ROOMS_BY_ID[room.id] = room;
  }
}

export const ALL_ROOMS: RoomDef[] = Object.values(ROOMS_BY_ID);

export function getDeck(index: number): DeckDef {
  const d = DECKS.find((x) => x.index === index);
  if (!d) throw new Error(`No deck ${index}`);
  return d;
}

export function getRoom(id: string): RoomDef {
  const r = ROOMS_BY_ID[id];
  if (!r) throw new Error(`No room ${id}`);
  return r;
}

/** Centre tile of a room, used as a default standing position. */
export function roomCenter(room: RoomDef): { x: number; y: number } {
  return {
    x: room.rect.x + Math.floor(room.rect.w / 2),
    y: room.rect.y + Math.floor(room.rect.h / 2),
  };
}

/** Evenly spaced workstations inside a room so crew do not overlap. */
export function workstations(room: RoomDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const { x, y, w, h } = room.rect;
  for (let j = 1; j < h - 1; j += 2) {
    for (let i = 1; i < w - 1; i += 2) {
      out.push({ x: x + i, y: y + j });
    }
  }
  return out;
}

/** Rooms on a deck that crew can be assigned to work in. */
export function assignableRooms(deckIndex?: number): RoomDef[] {
  return ALL_ROOMS.filter(
    (r) =>
      r.kind !== 'elevator' &&
      r.kind !== 'stairs' &&
      (deckIndex === undefined || r.deck === deckIndex),
  );
}
