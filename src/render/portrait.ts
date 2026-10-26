import type { CrewMember, SpecialtyId } from '../core/types';
import { hashString } from '../core/rng';
import { DEPARTMENTS } from '../data/specialties';
import { presentsFeminine } from '../data/names';

/**
 * Personnel file photographs, as 32x32 pixel art.
 *
 * Every face is generated from the crew member's id, so the same person
 * always looks the same and nobody needs an asset. What they wear follows
 * what they do: khaki for chiefs and officers, flight suits for aircrew,
 * the flight deck's coloured jersey and cranial for the deck trades,
 * coveralls for everyone else. Collar devices show the rank.
 *
 * The expression is the one part that changes: a rested, happy sailor
 * smiles; an exhausted one has hooded eyes and shadows; a miserable one
 * frowns; an injured one wears a dressing. The photo is a readout too.
 */

const SIZE = 32;

type Px = string | null;

const SKIN = ['#f3cfb1', '#e6b48c', '#cf9366', '#ad7247', '#86552f', '#5f3a21'];
const HAIR = ['#1b1714', '#3a2617', '#5c3a1f', '#8a5a2b', '#b07a3a', '#d6b56b', '#7d3420'];
const GREY = '#9a9590';

const OUTLINE = '#11161c';

/** Flight deck jerseys, matching the deck view. */
const JERSEY: Partial<Record<SpecialtyId, string>> = {
  handling: '#e2c23a',
  tractor: '#3d6fd1',
  weapons: '#c0392b',
  damagecontrol: '#c0392b',
  flightops: '#4f9a3c',
};

function shade(hex: string, t: number): string {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out = ch.map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

/** A small deterministic generator seeded from the crew id. */
function picker(seed: number): (n: number) => number {
  let s = seed >>> 0 || 1;
  return (n: number) => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) % n;
  };
}

type Mood = 'happy' | 'neutral' | 'low';

interface Look {
  skin: string;
  hair: string;
  feminine: boolean;
  /** 0 narrow .. 2 wide. */
  face: number;
  hairStyle: 'buzz' | 'crop' | 'tight' | 'bald' | 'curly' | 'bun' | 'bob' | 'pixie';
  mustache: boolean;
  glasses: boolean;
  headwear: 'none' | 'cranial' | 'cap';
  uniform: 'khaki' | 'flightsuit' | 'jersey' | 'coverall';
  jersey: string;
  rank: number;
  dept: string;
}

function lookFor(crew: CrewMember): Look {
  const pick = picker(hashString(crew.id + '|face'));
  const feminine = presentsFeminine(crew.name.split(' ')[0] ?? '');
  // Grey comes with seniority, more often than not.
  const greying = crew.rank >= 5 ? pick(3) === 0 : crew.rank >= 4 ? pick(6) === 0 : false;
  const hair = greying ? GREY : HAIR[pick(HAIR.length)]!;
  const hairStyle = feminine
    ? (['bun', 'bun', 'bob', 'pixie'] as const)[pick(4)]!
    : (['buzz', 'crop', 'tight', 'crop', 'curly', 'bald'] as const)[pick(crew.rank >= 4 ? 6 : 5)]!;

  const officer = crew.rank >= 6;
  const chief = crew.rank >= 4;
  const aircrew = crew.primary === 'pilot' || crew.primary === 'aircrew';
  const jersey = JERSEY[crew.primary];
  const uniform: Look['uniform'] = aircrew ? 'flightsuit' : officer || chief ? 'khaki' : jersey ? 'jersey' : 'coverall';
  const headwear: Look['headwear'] =
    uniform === 'jersey' ? 'cranial' : uniform === 'coverall' && pick(3) === 0 ? 'cap' : 'none';

  return {
    skin: SKIN[pick(SKIN.length)]!,
    hair,
    feminine,
    face: pick(3),
    hairStyle,
    mustache: !feminine && pick(7) === 0,
    glasses: pick(8) === 0,
    headwear,
    uniform,
    jersey: jersey ?? '#4f9a3c',
    rank: crew.rank,
    dept: DEPARTMENTS[crew.department].color,
  };
}

function moodOf(crew: CrewMember): Mood {
  if (crew.morale >= 66) return 'happy';
  if (crew.morale < 40) return 'low';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

class Grid {
  readonly px: Px[] = new Array(SIZE * SIZE).fill(null);
  set(x: number, y: number, c: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    this.px[y * SIZE + x] = c;
  }
  get(x: number, y: number): Px {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return this.px[y * SIZE + x]!;
  }
  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
}

const CX = 15.5;
const CY = 13;

/** Half-width of the head at a given row, for the face shape. */
function headHalf(look: Look, y: number): number {
  const rx = 6.4 + look.face * 0.5;
  const ry = 7.8;
  const dy = (y + 0.5 - CY) / ry;
  if (Math.abs(dy) > 1) return 0;
  let w = rx * Math.sqrt(1 - dy * dy);
  // A narrower jaw below the cheekbones.
  if (y > CY + 2) w -= (y - CY - 2) * 0.32;
  return w;
}

function inHead(look: Look, x: number, y: number): boolean {
  return Math.abs(x + 0.5 - CX) <= headHalf(look, y);
}

function drawBody(g: Grid, look: Look): void {
  const base =
    look.uniform === 'khaki' ? '#b8a06a' : look.uniform === 'flightsuit' ? '#5f6340' : look.uniform === 'jersey' ? look.jersey : '#2f4a6e';
  const dark = shade(base, -0.3);
  const light = shade(base, 0.18);

  // Shoulders: a trapezoid widening to the bottom of the frame.
  for (let y = 22; y < SIZE; y++) {
    const half = Math.min(14.5, 5 + (y - 22) * 1.6);
    for (let x = 0; x < SIZE; x++) {
      const dx = x + 0.5 - CX;
      if (Math.abs(dx) > half) continue;
      let c = base;
      if (dx > half - 2.5) c = dark;
      else if (dx < -half + 2 && y > 24) c = light;
      g.set(x, y, c);
    }
  }

  // Neck.
  const skinDark = shade(look.skin, -0.22);
  for (let y = 19; y < 24; y++) {
    for (let x = 13; x <= 18; x++) g.set(x, y, x >= 17 ? skinDark : look.skin);
  }
  // The jaw's shadow on the neck.
  g.rect(13, 20, 6, 1, shade(look.skin, -0.3));

  switch (look.uniform) {
    case 'khaki': {
      // Open collar over a white undershirt.
      for (let y = 22; y < 27; y++) {
        const w = Math.max(0, 3 - (y - 22) * 0.6);
        for (let x = Math.round(CX - w); x <= Math.round(CX + w) - 1; x++) g.set(x, y, '#e8e6e0');
      }
      for (let i = 0; i < 4; i++) {
        g.set(11 + i, 22 + i, dark);
        g.set(20 - i, 22 + i, dark);
      }
      // Collar devices: silver bars for an officer, a gold anchor for a chief.
      const device = look.rank >= 6 ? '#d7dce0' : '#d9b42a';
      g.set(10, 24, device);
      g.set(21, 24, device);
      if (look.rank >= 6) {
        g.set(10, 25, device);
        g.set(21, 25, device);
        g.set(9, 24, device);
        g.set(22, 24, device);
      }
      // Pocket.
      g.rect(7, 27, 4, 3, dark);
      g.rect(21, 27, 4, 3, dark);
      break;
    }
    case 'flightsuit': {
      g.rect(15, 23, 1, 9, dark);
      g.set(13, 23, dark);
      g.set(18, 23, dark);
      // Squadron patch and name tag.
      g.rect(7, 26, 4, 3, look.dept);
      g.rect(20, 26, 5, 2, '#2a2620');
      g.rect(21, 26, 3, 1, '#d6d0c0');
      break;
    }
    case 'jersey': {
      g.rect(13, 22, 6, 1, dark);
      // Float-coat collar and the reflective tape.
      g.rect(3, 29, 26, 1, '#e8e8e8');
      break;
    }
    case 'coverall': {
      g.rect(15, 23, 1, 9, dark);
      g.rect(20, 26, 5, 2, '#d6d0c0');
      g.rect(7, 26, 4, 1, '#1d2a3c');
      break;
    }
  }
}

function drawHead(g: Grid, look: Look, crew: CrewMember, mood: Mood): void {
  const skin = look.skin;
  const skinDark = shade(skin, -0.2);
  const skinLight = shade(skin, 0.12);

  // Ears first, so the head overlaps them.
  for (const side of [-1, 1]) {
    const ex = Math.round(CX + side * (headHalf(look, 13) + 0.2) - 0.5);
    g.set(ex, 12, side > 0 ? skinDark : skin);
    g.set(ex, 13, side > 0 ? skinDark : skin);
    g.set(ex, 14, skinDark);
  }

  for (let y = 5; y < 21; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inHead(look, x, y)) continue;
      const dx = x + 0.5 - CX;
      let c = skin;
      if (dx > headHalf(look, y) - 2) c = skinDark;
      else if (dx < -headHalf(look, y) + 2 && y < 14) c = skinLight;
      g.set(x, y, c);
    }
  }

  const tired = crew.fatigue >= 65;
  const eyeY = 13;
  const lx = 13;
  const rx = 19;

  // Brows.
  const brow = look.hair === GREY ? '#6f6a66' : shade(look.hair, -0.1);
  const browY = eyeY - 3;
  g.rect(lx - 1, browY, 3, 1, brow);
  g.rect(rx - 1, browY, 3, 1, brow);
  if (mood === 'low') {
    g.set(lx + 1, browY - 1, brow);
    g.set(rx - 1, browY - 1, brow);
  }

  // Eyes: white and pupil, hooded when exhausted.
  if (tired) {
    g.rect(lx - 1, eyeY, 2, 1, '#2a2020');
    g.rect(rx - 1, eyeY, 2, 1, '#2a2020');
    g.rect(lx - 1, eyeY + 1, 2, 1, shade(skin, -0.32));
    g.rect(rx - 1, eyeY + 1, 2, 1, shade(skin, -0.32));
  } else {
    for (const ex of [lx, rx]) {
      g.set(ex - 1, eyeY, '#f1f1ee');
      g.set(ex, eyeY, '#1d1a1a');
      g.set(ex - 1, eyeY - 1, shade(skin, -0.35));
      g.set(ex, eyeY - 1, shade(skin, -0.35));
    }
  }

  // Nose: a shadow on the side away from the light.
  g.set(16, 15, skinDark);
  g.set(16, 16, shade(skin, -0.3));

  // Mouth follows morale.
  const lip = shade(skin, -0.55);
  const lower = shade(skin, -0.18);
  if (mood === 'happy') {
    g.rect(14, 18, 4, 1, lip);
    g.rect(15, 18, 2, 1, '#efece6');
    g.set(13, 17, lip);
    g.set(18, 17, lip);
    g.rect(14, 19, 4, 1, lower);
  } else if (mood === 'low') {
    g.rect(14, 18, 4, 1, lip);
    g.set(13, 19, lip);
    g.set(18, 19, lip);
  } else {
    g.rect(14, 18, 4, 1, lip);
    g.rect(14, 19, 4, 1, lower);
  }
  // Cheeks: a touch of colour under the eyes.
  g.set(11, 16, shade(skin, -0.08));
  g.set(20, 16, shade(skin, -0.12));

  if (look.mustache) {
    g.rect(13, 17, 6, 1, look.hair === GREY ? '#7d7873' : look.hair);
    g.rect(14, 18, 4, 1, shade(skin, -0.55));
  }

  if (look.glasses) {
    const f = '#22252a';
    for (const ex of [lx, rx]) {
      g.set(ex - 2, eyeY, f);
      g.set(ex + 1, eyeY, f);
      g.rect(ex - 2, eyeY - 1, 4, 1, f);
      g.rect(ex - 2, eyeY + 1, 4, 1, f);
    }
    g.set(15, eyeY - 1, f);
    g.set(16, eyeY - 1, f);
  }

  // Injured: a dressing across the brow.
  if (crew.health === 'injured' || crew.health === 'hospitalized') {
    for (let x = 9; x <= 22; x++) if (inHead(look, x, 9)) g.set(x, 9, '#ecebe6');
    for (let x = 9; x <= 22; x++) if (inHead(look, x, 10)) g.set(x, 10, '#ecebe6');
    g.set(19, 9, '#b8312a');
  } else if (crew.health === 'sick') {
    g.set(10, 15, shade(skin, 0.25));
    g.set(21, 15, shade(skin, 0.25));
  }
}

function drawHair(g: Grid, look: Look, behind: boolean): void {
  const hair = look.hair;
  const hairDark = shade(hair, -0.3);
  const hairLight = shade(hair, 0.2);

  if (behind) {
    if (look.hairStyle === 'bun') {
      for (let y = 1; y <= 6; y++) {
        for (let x = 12; x <= 19; x++) {
          const d = Math.hypot(x + 0.5 - CX, y + 0.5 - 3.6);
          if (d <= 2.9) g.set(x, y, d > 2.2 ? hairDark : hair);
        }
      }
    }
    if (look.hairStyle === 'bob') {
      for (let y = 7; y <= 19; y++) {
        const half = headHalf(look, Math.min(y, 13)) + 1.6;
        for (let x = 0; x < SIZE; x++) {
          if (Math.abs(x + 0.5 - CX) <= half) g.set(x, y, x + 0.5 > CX + 2 ? hairDark : hair);
        }
      }
    }
    return;
  }

  if (look.hairStyle === 'bald') {
    // A sheen on the crown instead of hair.
    g.set(13, 7, shade(look.skin, 0.3));
    g.set(14, 7, shade(look.skin, 0.3));
    return;
  }

  // Hairline row, by style.
  const line =
    look.hairStyle === 'buzz' || look.hairStyle === 'tight'
      ? 8
      : look.hairStyle === 'pixie' || look.hairStyle === 'bob'
        ? 10
        : 9;
  const top = look.hairStyle === 'curly' ? 3 : look.hairStyle === 'buzz' ? 5 : 4;

  for (let y = top; y <= line; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x + 0.5 - CX;
      // Hair sits a pixel proud of the skull, more for curly hair.
      const extra = look.hairStyle === 'curly' ? 1.6 : look.hairStyle === 'buzz' ? 0.2 : 0.8;
      const half = headHalf(look, Math.max(y, 6)) + extra;
      if (Math.abs(dx) > half) continue;
      // Bangs: the fringe comes lower in the middle for pixie and bob cuts.
      let c = hair;
      if (look.hairStyle === 'buzz') c = shade(hair, 0.15);
      if (dx > half - 2) c = hairDark;
      else if (y === top + 1 && dx < 0) c = hairLight;
      if (look.hairStyle === 'curly' && (x + y) % 3 === 0) c = hairDark;
      g.set(x, y, c);
    }
  }
  // Sideburns / side hair.
  const sides = look.hairStyle === 'tight' ? 0 : look.hairStyle === 'bob' ? 6 : 2;
  for (let y = line + 1; y <= line + sides; y++) {
    const half = headHalf(look, y);
    g.set(Math.round(CX - half - 0.5), y, hair);
    g.set(Math.round(CX + half - 0.5), y, hairDark);
  }
  if (look.hairStyle === 'pixie') {
    g.rect(11, line + 1, 3, 1, hair);
  }
}

function drawHeadwear(g: Grid, look: Look): void {
  if (look.headwear === 'cranial') {
    // The cranial: a coloured shell, ear defenders and goggles on the brow.
    const shell = look.jersey;
    for (let y = 3; y <= 9; y++) {
      const half = headHalf(look, Math.max(y, 6)) + 1;
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - CX;
        if (Math.abs(dx) > half) continue;
        g.set(x, y, dx > half - 2 ? shade(shell, -0.3) : y === 4 && dx < 0 ? shade(shell, 0.3) : shell);
      }
    }
    g.rect(9, 8, 14, 2, '#2a2d33');
    g.rect(11, 8, 4, 2, '#5f87a8');
    g.rect(17, 8, 4, 2, '#5f87a8');
    for (const x of [7, 23]) {
      g.rect(x, 11, 2, 4, '#2a2d33');
      g.set(x, 11, '#4a4e55');
    }
    return;
  }
  if (look.headwear === 'cap') {
    const cap = '#1d2a44';
    for (let y = 4; y <= 8; y++) {
      const half = headHalf(look, Math.max(y, 6)) + 0.8;
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - CX;
        if (Math.abs(dx) > half) continue;
        g.set(x, y, dx > half - 2 ? shade(cap, -0.3) : cap);
      }
    }
    // Ship's name in gold on the front, the bill below.
    g.rect(13, 6, 6, 1, '#d9b42a');
    g.rect(9, 9, 14, 1, shade(cap, -0.35));
  }
}

function render(g: Grid, look: Look): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;

  // Background: the department's colour, dimmed, with a soft top light.
  for (let y = 0; y < SIZE; y++) {
    ctx.fillStyle = shade(look.dept, -0.62 - (y / SIZE) * 0.2);
    ctx.fillRect(0, y, SIZE, 1);
  }
  for (let y = 0; y < SIZE; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, y, SIZE, 1);
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const p = g.get(x, y);
      if (p) {
        ctx.fillStyle = p;
        ctx.fillRect(x, y, 1, 1);
      } else if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

const cache = new Map<string, string>();

/** The crew member's file photo, as a 32x32 data URL. */
export function portraitUrl(crew: CrewMember): string {
  const mood = moodOf(crew);
  const tired = crew.fatigue >= 65;
  const key = `${crew.id}|${crew.rank}|${crew.primary}|${mood}|${tired}|${crew.health}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const look = lookFor(crew);
  const g = new Grid();
  drawHair(g, look, true);
  drawBody(g, look);
  drawHead(g, look, crew, mood);
  if (look.headwear === 'none') drawHair(g, look, false);
  else drawHeadwear(g, look);

  const url = render(g, look).toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** An `<img>` of the photo at a whole-number scale, so pixels stay square. */
export function portraitElement(crew: CrewMember, scale = 2, className = 'portrait'): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = portraitUrl(crew);
  img.width = SIZE * scale;
  img.height = SIZE * scale;
  img.alt = crew.name;
  return img;
}

// ===========================================================================
// Officer portraits — the council
// ===========================================================================

/**
 * What an officer's portrait needs. Kept structural so the renderer does not
 * depend on the council module.
 */
export interface OfficerSitter {
  id: string;
  name: string;
  rankCode: string;
  opinion: number;
  /** Wears wings, a flight jacket and sometimes aviator glasses. */
  aviator: boolean;
  /** Department colour for the backdrop. */
  color: string;
}

const OS = 48;

class BigGrid {
  readonly px: Px[] = new Array(OS * OS).fill(null);
  set(x: number, y: number, c: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= OS || y >= OS) return;
    this.px[y * OS + x] = c;
  }
  get(x: number, y: number): Px {
    if (x < 0 || y < 0 || x >= OS || y >= OS) return null;
    return this.px[y * OS + x]!;
  }
  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
}

const OCX = 23.5;
const OCY = 22;

function rgbaOf(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

/**
 * The council's portraits: larger and posed. Every officer wears the
 * combination cover, with gold oak leaves on the visor for commanders and
 * captains, a ribbon rack and their warfare device; aviators wear the
 * leather flight jacket with its fur collar, and some the glasses. A
 * backlight in the department's colour picks out the silhouette.
 *
 * The expression is their opinion of the captain: a confident half-smile
 * when it is high, a level look when it is neutral, a raised brow and a
 * hard mouth when it is low.
 */
export function officerPortraitUrl(o: OfficerSitter): string {
  const mood = o.opinion >= 30 ? 'warm' : o.opinion <= -20 ? 'cold' : 'level';
  const key = `off|${o.id}|${o.rankCode}|${mood}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pick = picker(hashString(o.id + '|officer'));
  const feminine = presentsFeminine(o.name.split(' ')[0] ?? '');
  const skin = SKIN[pick(SKIN.length)]!;
  const senior = o.rankCode === 'CAPT' || o.rankCode === 'CMDCM';
  const hair = senior && pick(2) === 0 ? GREY : HAIR[pick(HAIR.length)]!;
  const shades = o.aviator && pick(5) < 2;
  const jaw = feminine ? 0.42 : 0.26 + pick(3) * 0.04;
  const rx = feminine ? 8.6 : 9.2 + pick(3) * 0.4;
  const eyeColor = ['#3b2a1e', '#2a3b52', '#3d5a3a', '#1d1a1a', '#5a4a2a'][pick(5)]!;
  const rim = shade(o.color, 0.35);

  const g = new BigGrid();
  const skinD = shade(skin, -0.22);
  const skinDD = shade(skin, -0.38);
  const skinL = shade(skin, 0.14);

  const half = (y: number): number => {
    const ry = 11.5;
    const dy = (y + 0.5 - OCY) / ry;
    if (Math.abs(dy) > 1) return 0;
    let w = rx * Math.sqrt(1 - dy * dy);
    if (y > OCY + 3) w -= (y - OCY - 3) * jaw;
    return Math.max(0, w);
  };
  const inFace = (x: number, y: number) => Math.abs(x + 0.5 - OCX) <= half(y);

  // -- Shoulders: flight jacket or khaki ------------------------------------
  const jacket = o.aviator;
  const cloth = jacket ? '#5a3a24' : '#b8a06a';
  const clothD = shade(cloth, -0.3);
  const clothL = shade(cloth, 0.18);
  for (let y = 33; y < OS; y++) {
    const w = Math.min(23.5, 8 + (y - 33) * 1.9);
    for (let x = 0; x < OS; x++) {
      const dx = x + 0.5 - OCX;
      if (Math.abs(dx) > w) continue;
      let c = cloth;
      if (dx > w - 3) c = clothD;
      else if (dx < -w + 2.5) c = clothL;
      if (jacket && (x * 7 + y * 3) % 11 === 0) c = shade(cloth, -0.12);
      g.set(x, y, c);
    }
  }
  // Neck.
  for (let y = 30; y < 36; y++) for (let x = 19; x <= 28; x++) g.set(x, y, x >= 26 ? skinD : skin);
  g.rect(19, 31, 10, 1, skinDD);

  if (jacket) {
    // Fur collar and the zip.
    for (let y = 33; y < 40; y++) {
      const spread = 4 + (y - 33);
      for (let x = Math.round(OCX - spread - 4); x < Math.round(OCX - spread + 1); x++) {
        g.set(x, y, (x + y) % 2 ? '#8a6a44' : '#6e5232');
      }
      for (let x = Math.round(OCX + spread - 1); x < Math.round(OCX + spread + 4); x++) {
        g.set(x, y, (x + y) % 2 ? '#6e5232' : '#5a4228');
      }
    }
    g.rect(21, 35, 6, 4, '#7d6a4e');
    g.rect(23, 39, 2, 9, '#2a1d14');
    // Wings and the name patch.
    g.rect(8, 41, 7, 1, '#d9b42a');
    g.rect(10, 40, 3, 1, '#f0d060');
    g.rect(32, 40, 8, 4, '#1d1a16');
    g.rect(33, 41, 6, 1, '#d6d0c0');
    g.rect(33, 42, 4, 1, '#d6d0c0');
  } else {
    // Khaki: open collar, undershirt, collar devices, ribbons, warfare pin.
    for (let y = 33; y < 39; y++) {
      const w = Math.max(0, 4 - (y - 33) * 0.7);
      for (let x = Math.round(OCX - w); x < Math.round(OCX + w); x++) g.set(x, y, '#ecebe5');
    }
    for (let i = 0; i < 6; i++) {
      g.set(15 + i, 33 + i, clothD);
      g.set(32 - i, 33 + i, clothD);
    }
    const device = o.rankCode === 'CMDCM' ? '#d9b42a' : '#dfe4e8';
    for (const x of [13, 33]) {
      g.rect(x, 36, 2, 2, device);
      if (o.rankCode === 'CAPT') g.set(x + 1, 35, device);
    }
    const ribbons = ['#2f5aa8', '#c0392b', '#e8c04a', '#3f8a4a', '#ffffff', '#7a2f8a', '#d98d4f'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) g.rect(7 + c * 3, 42 + r * 2, 3, 1, ribbons[pick(ribbons.length)]!);
    }
    g.rect(7, 40, 9, 1, '#d9b42a');
    g.rect(9, 39, 5, 1, '#f0d060');
    g.rect(32, 41, 8, 3, '#1d1a16');
    g.rect(33, 42, 6, 1, '#d6d0c0');
  }

  // -- Ears and face -----------------------------------------------------
  for (const side of [-1, 1]) {
    const ex = Math.round(OCX + side * (half(21) + 0.4) - 0.5);
    for (let y = 19; y <= 24; y++) g.set(ex, y, side > 0 ? skinD : skin);
    g.set(ex, 25, skinDD);
  }
  for (let y = 9; y < 34; y++) {
    for (let x = 0; x < OS; x++) {
      if (!inFace(x, y)) continue;
      const dx = x + 0.5 - OCX;
      const h = half(y);
      let c = skin;
      if (dx > h - 3) c = skinD;
      else if (dx < -h + 3 && y < 24) c = skinL;
      // Cheekbones and the jaw's shadow.
      if (y >= 24 && y <= 26 && Math.abs(dx) > h - 4.5 && Math.abs(dx) < h - 2.5) c = skinD;
      if (y >= 30) c = dx > 0 ? skinDD : skinD;
      g.set(x, y, c);
    }
  }

  // -- Brows, eyes, nose, mouth -------------------------------------------
  const brow = hair === GREY ? '#6f6a66' : shade(hair, -0.15);
  const lx = 19;
  const rxE = 27;
  const ey = 20;
  g.rect(lx - 2, ey - 3, 4, 1, brow);
  g.set(lx - 2, ey - 2, brow);
  g.rect(rxE - 1, ey - 3, 4, 1, brow);
  g.set(rxE + 2, ey - 2, brow);
  if (mood === 'cold') {
    // One brow raised: not convinced.
    g.rect(rxE - 1, ey - 4, 4, 1, brow);
    g.rect(rxE - 1, ey - 3, 4, 1, skin);
  }
  if (shades) {
    // Aviator glasses: gold rims, dark lenses with a highlight.
    for (const ex of [lx, rxE]) {
      g.rect(ex - 2, ey - 1, 5, 3, '#1f2a33');
      g.set(ex - 1, ey - 1, '#6f8fa8');
      g.rect(ex - 3, ey - 2, 7, 1, '#c9a227');
    }
    g.rect(lx + 3, ey - 1, rxE - lx - 5, 1, '#c9a227');
  } else {
    for (const ex of [lx, rxE]) {
      g.rect(ex - 1, ey - 1, 3, 1, skinDD);
      g.set(ex - 1, ey, '#f1f1ee');
      g.set(ex, ey, eyeColor);
      g.set(ex + 1, ey, '#1a1515');
      g.set(ex, ey + 1, skinD);
    }
  }
  // Nose: lit ridge, shadowed side and tip.
  for (let y = ey + 1; y <= ey + 5; y++) {
    g.set(23, y, skinL);
    g.set(24, y, skinD);
  }
  g.rect(22, ey + 6, 4, 1, skinDD);
  // Mouth.
  const lip = shade(skin, -0.5);
  const my = ey + 9;
  if (mood === 'warm') {
    g.rect(20, my, 7, 1, lip);
    g.set(27, my - 1, lip);
    g.rect(21, my + 1, 5, 1, shade(skin, -0.15));
  } else if (mood === 'cold') {
    g.rect(20, my, 7, 1, lip);
    g.set(19, my + 1, lip);
    g.set(27, my + 1, lip);
  } else {
    g.rect(20, my, 7, 1, lip);
    g.rect(21, my + 1, 5, 1, shade(skin, -0.15));
  }
  if (!feminine && pick(5) === 0) {
    // A clipped moustache.
    g.rect(20, my - 1, 7, 1, hair === GREY ? '#8a8580' : shade(hair, -0.1));
  }

  // -- Hair at the temples, under the cover --------------------------------
  const hairD = shade(hair, -0.3);
  for (let y = 13; y <= (feminine ? 27 : 19); y++) {
    const h = half(y);
    g.set(Math.round(OCX - h - 0.5), y, hair);
    g.set(Math.round(OCX - h + 0.5), y, hair);
    g.set(Math.round(OCX + h - 1.5), y, hairD);
    g.set(Math.round(OCX + h - 0.5), y, hairD);
  }

  // -- Combination cover ----------------------------------------------------
  // Sized to the head: the crown only a little wider than the skull and
  // flaring slightly at the top, the visor no wider than the brow.
  const capTop = o.rankCode === 'CMDCM' ? '#b8a06a' : '#e8e6e0';
  const band = rx + 0.9;
  for (let y = 6; y <= 12; y++) {
    const w = y <= 9 ? band + 0.6 - Math.max(0, 7 - y) * 1.2 : band;
    for (let x = 0; x < OS; x++) {
      const dx = x + 0.5 - OCX;
      if (Math.abs(dx) > w) continue;
      let c = y <= 9 ? capTop : '#1a1a1e';
      if (y <= 9 && dx > w - 2.5) c = shade(capTop, -0.18);
      if (y === 7 && dx < 0) c = shade(capTop, 0.2);
      g.set(x, y, c);
    }
  }
  // Badge on the band.
  g.rect(22, 9, 4, 3, '#d9b42a');
  g.set(23, 8, '#f0d060');
  g.set(24, 8, '#f0d060');
  g.set(23, 10, '#8a6a1a');
  // Visor, with the gold leaf of a commander or captain.
  const v0 = Math.round(OCX - rx + 0.5);
  const v1 = Math.round(OCX + rx - 1.5);
  for (let x = v0; x <= v1; x++) {
    g.set(x, 13, '#0f0f12');
    if (x > v0 + 2 && x < v1 - 2) g.set(x, 14, '#1d1d22');
  }
  if (o.rankCode === 'CAPT' || o.rankCode === 'CDR') {
    for (let x = v0 + 1; x <= v1 - 1; x += 2) g.set(x, 13, x % 4 === 1 ? '#f0d060' : '#c9a227');
  }
  g.rect(v0 + 1, 12, v1 - v0 - 1, 1, '#c9a227');

  // -- Composite ------------------------------------------------------------
  const c = document.createElement('canvas');
  c.width = OS;
  c.height = OS;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < OS; y++) {
    ctx.fillStyle = shade('#0c1a2e', -(y / OS) * 0.35);
    ctx.fillRect(0, y, OS, 1);
  }
  // A soft glow of the department's colour behind the head.
  for (let y = 0; y < OS; y++) {
    for (let x = 0; x < OS; x++) {
      const d = Math.hypot(x - 30, y - 16) / 26;
      if (d < 1) {
        ctx.fillStyle = rgbaOf(o.color, (1 - d) * 0.22);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (let y = 0; y < OS; y++) {
    for (let x = 0; x < OS; x++) {
      const p = g.get(x, y);
      if (p) {
        // Backlight: the rim of the silhouette away from the key light.
        const edgeRight = !g.get(x + 1, y);
        ctx.fillStyle = edgeRight && x > OCX ? rim : p;
        ctx.fillRect(x, y, 1, 1);
      } else if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export function officerPortraitElement(
  o: OfficerSitter,
  scale = 2,
  className = 'portrait officer-portrait',
): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = officerPortraitUrl(o);
  img.width = OS * scale;
  img.height = OS * scale;
  img.alt = o.name;
  return img;
}
