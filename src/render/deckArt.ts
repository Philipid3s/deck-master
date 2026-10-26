import type { DeckDef, RoomDef } from '../core/types';
import { DECK_H, DECK_W, TILE } from '../data/decks';
import { DEPT_ACCENT, PAL, hexToRgb } from './palette';

/**
 * The static layer of each deck, painted once as real pixel art at one
 * world pixel per art pixel (TILE per tile) and then blitted every frame.
 *
 * Everything that does not change with game state lives here: hull plating,
 * bulkheads, doors, furniture, the flight deck's paint. State — a room
 * running hot, a compartment in poor condition, crew, aircraft — is drawn
 * over it by `deckView.ts`, so this never has to be rebuilt mid-campaign.
 *
 * Furniture is chosen per compartment, not scattered from a generic list:
 * berthing gets racks, the galley gets serving lines, the machinery room
 * gets turbines. That is what turns a schematic into a ship.
 */

export interface DeckLight {
  x: number;
  y: number;
  color: string;
  /** Blink phase and rate, so a console bank never pulses in lockstep. */
  phase: number;
  rate: number;
}

export interface DeckLayer {
  canvas: HTMLCanvasElement;
  lights: DeckLight[];
  /** Points (world px) where rotating radar arrays are drawn live. */
  radars: { x: number; y: number; r: number }[];
}

const W = DECK_W * TILE;
const H = DECK_H * TILE;
const PASSAGE_Y = 11;
const PASSAGE_H = 4;

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Lighten (t > 0) or darken (t < 0) a hex colour. */
function tone(color: string, t: number): string {
  const [r, g, b] = hexToRgb(color);
  if (t >= 0) return hex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  const k = 1 + t;
  return hex(r * k, g * k, b * k);
}

function fill(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/**
 * A solid object seen from above: dark outline, lit top edge, shaded bottom
 * edge and a one-pixel cast shadow down-right. Every piece of furniture
 * goes through this so the light direction is consistent across the ship.
 */
function obj(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 1, y + h, w, 1);
  ctx.fillRect(x + w, y + 1, 1, h);
  fill(ctx, x, y, w, h, '#151a20');
  if (w <= 2 || h <= 2) return;
  fill(ctx, x + 1, y + 1, w - 2, h - 2, color);
  fill(ctx, x + 1, y + 1, w - 2, 1, tone(color, 0.22));
  fill(ctx, x + 1, y + h - 2, w - 2, 1, tone(color, -0.25));
}

function hazardBorder(ctx: Ctx, x: number, y: number, w: number, h: number, t = 2): void {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      if (i >= t && j >= t && i < w - t && j < h - t) continue;
      px(ctx, x + i, y + j, Math.floor((i + j) / 3) % 2 === 0 ? '#d9b42a' : '#1d1f22');
    }
  }
}

const FONT: Record<string, string[]> = {
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};

/** Deck-painted numerals, rotated so they read from the stern. */
function paintNumerals(ctx: Ctx, text: string, cx: number, cy: number, scale: number, color: string): void {
  const charW = 5;
  const charH = 7;
  const gap = 2;
  const total = text.length * (charW + gap) - gap;
  // Rotated 90° clockwise: glyph rows run along x, columns run down y.
  let cursor = cy - (total * scale) / 2;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let r = 0; r < charH; r++) {
        for (let c = 0; c < charW; c++) {
          if (glyph[r]![c] !== '#') continue;
          const gx = cx + ((charH - 1) / 2 - r) * scale;
          const gy = cursor + c * scale;
          fill(ctx, gx, gy, scale, scale, color);
        }
      }
    }
    cursor += (charW + gap) * scale;
  }
}

// ---------------------------------------------------------------------------
// Hull
// ---------------------------------------------------------------------------

/**
 * Pixel-row spans of the hull. The deck data is tile-stepped; interpolating
 * between row centres gives a smooth bow instead of eight-pixel stairs.
 */
function hullSpans(deck: DeckDef): { x0: number; x1: number }[] {
  const rows = deck.hull;
  const spans: { x0: number; x1: number }[] = [];
  for (let py = 0; py < H; py++) {
    const ty = (py + 0.5) / TILE - 0.5;
    const a = rows[Math.max(0, Math.min(rows.length - 1, Math.floor(ty)))]!;
    const b = rows[Math.max(0, Math.min(rows.length - 1, Math.ceil(ty)))]!;
    const t = ty - Math.floor(ty);
    const x0 = (a.x0 + (b.x0 - a.x0) * t) * TILE;
    const x1 = (a.x1 + 1 + (b.x1 - a.x1) * t) * TILE;
    spans.push({ x0: Math.round(x0), x1: Math.round(x1) });
  }
  return spans;
}

function paintHull(ctx: Ctx, deck: DeckDef, spans: { x0: number; x1: number }[], base: string, flight: boolean): void {
  const img = ctx.getImageData(0, 0, W, H);
  const [br, bg, bb] = hexToRgb(base);
  for (let y = 0; y < H; y++) {
    const s = spans[y]!;
    for (let x = s.x0; x < s.x1; x++) {
      // Fine-grained noise: non-skid on the flight deck, worn paint below.
      const n = (hash(x, y, deck.index) - 0.5) * (flight ? 12 : 7);
      const i = (y * W + x) * 4;
      img.data[i] = br + n;
      img.data[i + 1] = bg + n;
      img.data[i + 2] = bb + n;
      img.data[i + 3] = 255;
    }
  }

  // Plate seams: staggered like real deck plating.
  const seam = tone(base, flight ? -0.1 : -0.16);
  const [sr, sg, sb] = hexToRgb(seam);
  for (let y = 0; y < H; y++) {
    const s = spans[y]!;
    const band = Math.floor(y / 16);
    for (let x = s.x0; x < s.x1; x++) {
      const isRow = y % 16 === 0;
      const isCol = (x + (band % 2) * 24) % 48 === 0;
      if (!isRow && !isCol) continue;
      const i = (y * W + x) * 4;
      img.data[i] = sr;
      img.data[i + 1] = sg;
      img.data[i + 2] = sb;
    }
  }

  // Hull edge: a lit rim along the top, a dark one along the bottom.
  const rim = hexToRgb(PAL.hullOutline);
  const dark = hexToRgb('#1a2129');
  for (let y = 0; y < H; y++) {
    const s = spans[y]!;
    const above = spans[y - 1];
    const below = spans[y + 1];
    for (let x = s.x0; x < s.x1; x++) {
      const edgeTop = !above || x < above.x0 || x >= above.x1;
      const edgeBottom = !below || x < below.x0 || x >= below.x1;
      const edgeSide = x === s.x0 || x === s.x1 - 1;
      if (!edgeTop && !edgeBottom && !edgeSide) continue;
      const c = edgeBottom ? dark : rim;
      const i = (y * W + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------------------
// Interior decks
// ---------------------------------------------------------------------------

function floorColor(kind: string, x: number, y: number, seed: number): string {
  const n = hash(x, y, seed) - 0.5;
  switch (kind) {
    case 'berthing': {
      const tile = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      if (x % 8 === 0 || y % 8 === 0) return '#3a3127';
      return tone(tile ? '#4d4235' : '#463b2f', n * 0.06);
    }
    case 'mess': {
      const tile = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      return tone(tile ? '#57503e' : '#4b4535', n * 0.05);
    }
    case 'medical': {
      if (x % 6 === 0 || y % 6 === 0) return '#56606a';
      return tone('#6c7680', n * 0.05);
    }
    case 'command':
      return tone('#2c3a4b', n * 0.12);
    case 'training':
      return tone('#364554', n * 0.1);
    case 'store':
      return tone((x + y) % 6 === 0 ? '#3a332a' : '#433b31', n * 0.06);
    case 'hangar':
      return tone('#45494e', n * 0.08);
    default: {
      // Diamond plate.
      const bump = (x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2);
      return tone(bump ? '#4a535c' : '#3b434c', n * 0.05);
    }
  }
}

function paintPassage(ctx: Ctx, spans: { x0: number; x1: number }[]): void {
  const y0 = PASSAGE_Y * TILE;
  const y1 = (PASSAGE_Y + PASSAGE_H) * TILE;
  for (let y = y0; y < y1; y++) {
    const s = spans[y]!;
    for (let x = s.x0 + 2; x < s.x1 - 2; x++) {
      const n = hash(x, y, 77) - 0.5;
      const stripe = y === y0 + 1 || y === y1 - 2;
      px(ctx, x, y, stripe ? '#3c4650' : tone('#262d35', n * 0.12));
    }
  }
  // A painted walkway line down the middle, broken at frames.
  const mid = Math.round((PASSAGE_Y + PASSAGE_H / 2) * TILE);
  for (let x = 32; x < W - 32; x++) {
    if (x % 40 < 28) px(ctx, x, mid, '#47515b');
  }
}

/** Interior rectangle of a room, inside its bulkheads, in world px. */
function inner(room: RoomDef): { x: number; y: number; w: number; h: number } {
  return {
    x: room.rect.x * TILE + 3,
    y: room.rect.y * TILE + 3,
    w: room.rect.w * TILE - 6,
    h: room.rect.h * TILE - 6,
  };
}

function paintRoomShell(ctx: Ctx, room: RoomDef, seed: number): void {
  const r = room.rect;
  const x0 = r.x * TILE;
  const y0 = r.y * TILE;
  const w = r.w * TILE;
  const h = r.h * TILE;

  for (let y = y0 + 2; y < y0 + h - 2; y++) {
    for (let x = x0 + 2; x < x0 + w - 2; x++) {
      px(ctx, x, y, floorColor(room.kind, x, y, seed));
    }
  }
  // Shadow cast by the upper bulkhead onto the floor.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, 2);

  // Bulkheads: two pixels, lit top-left, shaded bottom-right.
  fill(ctx, x0, y0, w, 2, '#8a949e');
  fill(ctx, x0, y0, 2, h, '#7a848e');
  fill(ctx, x0, y0 + h - 2, w, 2, '#454e57');
  fill(ctx, x0 + w - 2, y0, 2, h, '#4f5861');
  fill(ctx, x0, y0 + h - 1, w, 1, '#161b21');

  // Department colour along the inner face of the top bulkhead.
  const accent = DEPT_ACCENT[room.department] ?? PAL.frame;
  fill(ctx, x0 + 2, y0 + 2, w - 4, 1, tone(accent, -0.2));

  // Doors onto the passageway: one per ~20 tiles of frontage.
  const doorsOnBottom = r.y + r.h <= PASSAGE_Y;
  const doorsOnTop = r.y >= PASSAGE_Y + PASSAGE_H;
  if (!doorsOnBottom && !doorsOnTop) return;
  const count = Math.max(1, Math.round(r.w / 20));
  for (let i = 0; i < count; i++) {
    const cx = x0 + Math.round(((i + 0.5) / count) * w);
    const dy = doorsOnBottom ? y0 + h - 2 : y0;
    fill(ctx, cx - 5, dy, 10, 2, '#2d343c');
    px(ctx, cx - 6, dy, '#c9a227');
    px(ctx, cx + 5, dy, '#c9a227');
    px(ctx, cx - 6, dy + 1, '#c9a227');
    px(ctx, cx + 5, dy + 1, '#c9a227');
  }
}

function paintTrunk(ctx: Ctx, room: RoomDef): void {
  const x = room.rect.x * TILE;
  const y = room.rect.y * TILE;
  const w = room.rect.w * TILE;
  const h = room.rect.h * TILE;
  if (room.kind === 'elevator') {
    fill(ctx, x, y, w, h, '#4c4a42');
    for (let j = y + 4; j < y + h - 4; j += 8) fill(ctx, x + 3, j, w - 6, 1, '#3a3933');
    hazardBorder(ctx, x, y, w, h, 2);
    // Direction arrows painted on the platform.
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i < 4; i++) {
      fill(ctx, cx - i, cy - 6 + i, i * 2 + 1, 1, '#d9b42a');
      fill(ctx, cx - i, cy + 6 - i, i * 2 + 1, 1, '#d9b42a');
    }
  } else {
    fill(ctx, x + 2, y + 2, w - 4, h - 4, '#2b2722');
    fill(ctx, x + 2, y + 2, w - 4, 1, '#c07a2a');
    fill(ctx, x + 2, y + h - 3, w - 4, 1, '#c07a2a');
    // Ladder rungs.
    fill(ctx, x + 8, y + 4, 1, h - 8, '#9aa3ad');
    fill(ctx, x + w - 9, y + 4, 1, h - 8, '#9aa3ad');
    for (let j = y + 6; j < y + h - 5; j += 3) fill(ctx, x + 9, j, w - 18, 1, '#7d868f');
  }
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

interface Painter {
  ctx: Ctx;
  lights: DeckLight[];
  radars: { x: number; y: number; r: number }[];
  seed: number;
}

function light(p: Painter, x: number, y: number, color: string, rate = 1): void {
  p.lights.push({ x: Math.round(x), y: Math.round(y), color, phase: hash(x, y, p.seed) * 6.28, rate });
}

function console_(p: Painter, x: number, y: number, w = 12, facingUp = false): void {
  const { ctx } = p;
  obj(ctx, x, y, w, 7, '#3a434c');
  fill(ctx, x + 2, y + 2, w - 4, 3, '#14323f');
  for (let i = x + 3; i < x + w - 3; i += 2) {
    px(ctx, i, y + 3, hash(i, y, 3) > 0.5 ? '#4fd98d' : '#2f7f9a');
  }
  light(p, x + w - 3, y + 2, '#e8ad12', 0.7);
  // Operator's chair.
  const cy = facingUp ? y - 4 : y + 8;
  obj(ctx, x + w / 2 - 2, cy, 4, 3, '#2b3138');
}

function rack(ctx: Ctx, x: number, y: number, blanket: string): void {
  obj(ctx, x, y, 16, 7, '#59626b');
  fill(ctx, x + 1, y + 1, 4, 5, '#cfc8b8');
  fill(ctx, x + 5, y + 1, 10, 5, blanket);
  fill(ctx, x + 5, y + 1, 10, 1, tone(blanket, 0.2));
}

function locker(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 6, 8, '#6b7680');
  px(ctx, x + 2, y + 3, '#3a434c');
  px(ctx, x + 3, y + 3, '#3a434c');
}

function crate(ctx: Ctx, x: number, y: number, w = 9, h = 7, color = '#7d6a45'): void {
  obj(ctx, x, y, w, h, color);
  for (let i = 1; i < Math.min(w, h) - 1; i++) {
    px(ctx, x + i, y + i, tone(color, -0.3));
    px(ctx, x + w - 1 - i, y + i, tone(color, -0.3));
  }
}

function shelving(ctx: Ctx, x: number, y: number, w: number, seed: number): void {
  obj(ctx, x, y, w, 8, '#4d555d');
  for (let i = x + 2; i < x + w - 4; i += 5) {
    const c = ['#7d6a45', '#5f7f4a', '#8a6a3a', '#6b7680', '#94804f'][Math.floor(hash(i, y, seed) * 5)]!;
    obj(ctx, i, y + 1, 4, 6, c);
  }
}

function table(ctx: Ctx, x: number, y: number, w: number): void {
  for (let i = x + 2; i < x + w - 2; i += 5) {
    obj(ctx, i, y - 4, 3, 3, '#3a4450');
    obj(ctx, i, y + 8, 3, 3, '#3a4450');
  }
  obj(ctx, x, y, w, 7, '#9aa1a6');
}

function workbench(p: Painter, x: number, y: number, w: number): void {
  const { ctx } = p;
  obj(ctx, x, y, w, 7, '#6e665a');
  for (let i = x + 3; i < x + w - 3; i += 4) {
    const c = ['#c0453f', '#d9b42a', '#4fb3d9', '#9aa3ad'][Math.floor(hash(i, y, 9) * 4)]!;
    px(ctx, i, y + 3, c);
    px(ctx, i + 1, y + 3, tone(c, -0.3));
  }
}

function toolboard(ctx: Ctx, x: number, y: number, w: number): void {
  fill(ctx, x, y, w, 3, '#2f363d');
  for (let i = x + 1; i < x + w - 1; i += 3) px(ctx, i, y + 1, i % 2 ? '#d9b42a' : '#9aa3ad');
}

function machine(p: Painter, x: number, y: number, w: number, h: number, color = '#5d7a6a'): void {
  const { ctx } = p;
  obj(ctx, x, y, w, h, color);
  fill(ctx, x + 3, y + 2, w - 6, Math.max(1, h - 5), tone(color, -0.2));
  obj(ctx, x + w - 6, y + 2, 4, 3, '#2b3138');
  light(p, x + 2, y + 2, '#5b9831', 0.5);
}

function turbine(p: Painter, x: number, y: number, w: number, h: number): void {
  const { ctx } = p;
  obj(ctx, x, y, w, h, '#6f7a84');
  // Cylindrical shading top to bottom.
  for (let j = 1; j < h - 1; j++) {
    const t = j / (h - 1);
    const c = t < 0.3 ? tone('#6f7a84', 0.25 - t * 0.5) : tone('#6f7a84', -(t - 0.3) * 0.5);
    fill(ctx, x + 1, y + j, w - 2, 1, c);
  }
  for (let i = x + 6; i < x + w - 4; i += 7) fill(ctx, i, y + 1, 1, h - 2, '#3e464f');
  light(p, x + 3, y + 2, '#c0392b', 0.4);
}

function pump(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 10, 10, '#4f6a7a');
  fill(ctx, x + 3, y + 3, 4, 4, '#2c3e4a');
  fill(ctx, x + 2, y + 2, 2, 1, '#7f9aaa');
}

function pipeRun(ctx: Ctx, x: number, y: number, w: number, color: string): void {
  fill(ctx, x, y, w, 2, color);
  fill(ctx, x, y, w, 1, tone(color, 0.25));
  for (let i = x + 10; i < x + w; i += 18) fill(ctx, i, y - 1, 2, 4, tone(color, -0.35));
}

function cabinet(p: Painter, x: number, y: number): void {
  const { ctx } = p;
  obj(ctx, x, y, 9, 10, '#5b6670');
  px(ctx, x + 3, y + 3, '#d9d9d9');
  px(ctx, x + 5, y + 3, '#d9d9d9');
  light(p, x + 2, y + 6, hash(x, y, 2) > 0.5 ? '#5b9831' : '#e8ad12', 1.3);
}

function tank(ctx: Ctx, x: number, y: number, w: number, h: number, color = '#3f8a8a'): void {
  obj(ctx, x, y, w, h, color);
  fill(ctx, x + 2, y + 2, 2, h - 4, tone(color, 0.35));
  fill(ctx, x + 1, y + Math.round(h / 2), w - 2, 1, tone(color, -0.3));
}

function bed(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 10, 16, '#7d868f');
  fill(ctx, x + 1, y + 1, 8, 14, '#d8dde2');
  fill(ctx, x + 2, y + 2, 6, 3, '#f2f4f6');
  fill(ctx, x + 1, y + 9, 8, 6, '#9ab3c9');
}

function desk(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 11, 5, '#6d5f45');
  obj(ctx, x + 4, y + 6, 3, 3, '#2b3138');
}

function screenWall(p: Painter, x: number, y: number, w: number): void {
  const { ctx } = p;
  fill(ctx, x, y, w, 4, '#0d2a3a');
  fill(ctx, x + 1, y + 1, w - 2, 2, '#16506b');
  for (let i = x + 2; i < x + w - 2; i += 3) px(ctx, i, y + 1 + (i % 2), '#4fb3d9');
  light(p, x + 2, y + 1, '#4fb3d9', 0.6);
}

function plotTable(p: Painter, x: number, y: number, w: number, h: number): void {
  const { ctx } = p;
  obj(ctx, x, y, w, h, '#33404c');
  fill(ctx, x + 2, y + 2, w - 4, h - 4, '#174a3e');
  for (let i = x + 3; i < x + w - 2; i += 4) fill(ctx, i, y + 2, 1, h - 4, '#1f6a55');
  for (let j = y + 3; j < y + h - 2; j += 4) fill(ctx, x + 2, j, w - 4, 1, '#1f6a55');
  light(p, x + w / 2, y + h / 2, '#e8ad12', 0.9);
}

function engineStand(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y + 6, 22, 3, '#c9a227');
  obj(ctx, x + 2, y, 18, 8, '#6b6058');
  for (let i = x + 5; i < x + 18; i += 3) fill(ctx, i, y + 1, 1, 6, '#4a423c');
  fill(ctx, x + 17, y + 2, 2, 4, '#2a2420');
}

function bombCart(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y + 3, 20, 5, '#c9a227');
  obj(ctx, x + 2, y, 15, 6, '#5e6b3a');
  fill(ctx, x + 12, y + 1, 1, 4, '#d9b42a');
  fill(ctx, x + 16, y + 2, 3, 2, '#3d4526');
}

function tractor(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 14, 9, '#d9b42a');
  fill(ctx, x + 8, y + 2, 4, 5, '#2b3138');
  fill(ctx, x - 1, y + 1, 2, 2, '#1b1e22');
  fill(ctx, x - 1, y + 6, 2, 2, '#1b1e22');
}

function toolCart(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 9, 6, '#a33a33');
  fill(ctx, x + 2, y + 2, 5, 1, '#d6d6d6');
}

function sofa(ctx: Ctx, x: number, y: number, w: number): void {
  obj(ctx, x, y, w, 7, '#5a3f3a');
  fill(ctx, x + 2, y + 3, w - 4, 3, '#6f504a');
}

function pew(ctx: Ctx, x: number, y: number, w: number): void {
  obj(ctx, x, y, w, 4, '#6d5232');
}

function washer(ctx: Ctx, x: number, y: number): void {
  obj(ctx, x, y, 9, 9, '#c9ced3');
  fill(ctx, x + 3, y + 3, 3, 3, '#3a4a5a');
}

function weights(ctx: Ctx, x: number, y: number): void {
  fill(ctx, x, y, 18, 10, '#2f4f7a');
  obj(ctx, x + 4, y + 3, 10, 4, '#3a3a3a');
  fill(ctx, x + 1, y + 4, 16, 1, '#9aa3ad');
  fill(ctx, x + 1, y + 2, 2, 5, '#1b1e22');
  fill(ctx, x + 15, y + 2, 2, 5, '#1b1e22');
}

function reactor(p: Painter, cx: number, cy: number, r: number): void {
  const { ctx } = p;
  for (let y = -r - 2; y <= r + 2; y++) {
    for (let x = -r - 2; x <= r + 2; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 2) continue;
      let c: string;
      if (d > r) c = Math.floor((Math.atan2(y, x) + Math.PI) * 4) % 2 ? '#d9b42a' : '#1d1f22';
      else if (d > r - 2) c = '#151a20';
      else c = tone('#7a848e', -d / r * 0.35 + (x + y < 0 ? 0.1 : 0));
      px(ctx, cx + x, cy + y, c);
    }
  }
  light(p, cx, cy, '#4fd98d', 0.35);
}

function redCross(ctx: Ctx, x: number, y: number): void {
  fill(ctx, x + 3, y, 3, 9, '#b8312a');
  fill(ctx, x, y + 3, 9, 3, '#b8312a');
}

/** Lay items along a wall, evenly spaced. */
function along(x: number, w: number, itemW: number, gap: number, draw: (x: number) => void): void {
  const n = Math.max(1, Math.floor((w + gap) / (itemW + gap)));
  const used = n * itemW + (n - 1) * gap;
  let cx = x + Math.floor((w - used) / 2);
  for (let i = 0; i < n; i++) {
    draw(cx);
    cx += itemW + gap;
  }
}

type Layout = (p: Painter, r: { x: number; y: number; w: number; h: number }, room: RoomDef) => void;

const berthing: Layout = (p, r) => {
  const blankets = ['#3b4f6e', '#3f5a4a', '#5a4a6e'];
  const blanket = blankets[Math.floor(hash(r.x, r.y, 4) * blankets.length)]!;
  for (let y = r.y + 3; y + 7 < r.y + r.h - 6; y += 10) {
    along(r.x + 2, r.w - 12, 16, 4, (x) => rack(p.ctx, x, y, blanket));
  }
  for (let y = r.y + 3; y + 8 < r.y + r.h - 4; y += 10) locker(p.ctx, r.x + r.w - 8, y);
};

const officers: Layout = (p, r) => {
  along(r.x + 2, r.w - 4, 16, 10, (x) => rack(p.ctx, x, r.y + 3, '#6e3b3b'));
  along(r.x + 4, r.w - 8, 11, 12, (x) => desk(p.ctx, x, r.y + r.h - 22));
};

const mess: Layout = (p, r, room) => {
  if (room.id.includes('galley')) {
    // Serving line and ranges along the top bulkhead.
    along(r.x + 2, r.w - 4, 10, 2, (x) => obj(p.ctx, x, r.y + 2, 10, 8, '#8f969c'));
    obj(p.ctx, r.x + 4, r.y + 22, r.w - 8, 6, '#b5bcc2');
    for (let x = r.x + 8; x < r.x + r.w - 8; x += 12) light(p, x, r.y + 5, '#e05a2a', 1.6);
    return;
  }
  if (room.id.includes('chapel')) {
    for (let y = r.y + 6; y < r.y + r.h - 12; y += 8) pew(p.ctx, r.x + 6, y, r.w - 24);
    obj(p.ctx, r.x + r.w - 14, r.y + r.h / 2 - 8, 8, 16, '#d8c9a0');
    light(p, r.x + r.w - 10, r.y + r.h / 2, '#f1c506', 0.4);
    return;
  }
  if (room.id.includes('rec')) {
    sofa(p.ctx, r.x + 6, r.y + 6, Math.min(40, r.w - 20));
    screenWall(p, r.x + 6, r.y + 1, Math.min(30, r.w - 20));
    obj(p.ctx, r.x + r.w / 2, r.y + 26, 18, 12, '#3f6b3f');
    sofa(p.ctx, r.x + 6, r.y + r.h - 18, Math.min(30, r.w - 20));
    return;
  }
  for (let y = r.y + 8; y + 11 < r.y + r.h - 4; y += 20) {
    along(r.x + 4, r.w - 8, 30, 8, (x) => table(p.ctx, x, y, 30));
  }
};

const medical: Layout = (p, r, room) => {
  if (room.id.includes('dental')) {
    obj(p.ctx, r.x + r.w / 2 - 6, r.y + 16, 12, 20, '#5f9ec9');
    cabinet(p, r.x + 4, r.y + 3);
    redCross(p.ctx, r.x + 4, r.y + r.h - 14);
    return;
  }
  along(r.x + 4, r.w - 8, 10, 8, (x) => bed(p.ctx, x, r.y + 3));
  for (let x = r.x + 6; x < r.x + r.w - 14; x += 22) cabinet(p, x, r.y + r.h - 16);
  redCross(p.ctx, r.x + r.w - 16, r.y + r.h - 16);
};

const command: Layout = (p, r, room) => {
  screenWall(p, r.x + 4, r.y + 1, r.w - 8);
  if (room.id.includes('reactor')) {
    along(r.x + 4, r.w - 8, 14, 6, (x) => console_(p, x, r.y + 8));
    along(r.x + 4, r.w - 8, 9, 4, (x) => cabinet(p, x, r.y + r.h - 14));
    return;
  }
  along(r.x + 4, r.w - 8, 14, 6, (x) => console_(p, x, r.y + 8));
  if (r.w > 60) plotTable(p, r.x + r.w / 2 - 14, r.y + r.h - 24, 28, 14);
  else along(r.x + 4, r.w - 8, 14, 6, (x) => console_(p, x, r.y + r.h - 16, 14, true));
};

const training: Layout = (p, r, room) => {
  if (room.id.includes('ready')) {
    screenWall(p, r.x + 6, r.y + 1, r.w - 12);
    for (let y = r.y + 10; y + 9 < r.y + r.h - 4; y += 11) {
      along(r.x + 4, r.w - 8, 8, 3, (x) => obj(p.ctx, x, y, 8, 7, '#7a2f2f'));
    }
    return;
  }
  if (room.id.includes('gym')) {
    weights(p.ctx, r.x + 6, r.y + 6);
    weights(p.ctx, r.x + 6, r.y + r.h - 20);
    fill(p.ctx, r.x + 30, r.y + 8, r.w - 40, r.h - 20, '#2b4466');
    obj(p.ctx, r.x + r.w - 20, r.y + 6, 10, 18, '#3a3a3a');
    return;
  }
  screenWall(p, r.x + 6, r.y + 1, r.w - 12);
  for (let y = r.y + 10; y + 9 < r.y + r.h - 4; y += 12) {
    along(r.x + 4, r.w - 8, 11, 5, (x) => desk(p.ctx, x, y));
  }
};

const store: Layout = (p, r, room) => {
  if (room.id.includes('fuel')) {
    along(r.x + 4, r.w - 8, 26, 6, (x) => tank(p.ctx, x, r.y + 6, 26, r.h - 14, '#8a6a2a'));
    return;
  }
  if (room.id.includes('freshwater')) {
    along(r.x + 4, r.w - 8, 22, 6, (x) => tank(p.ctx, x, r.y + 6, 22, r.h - 14));
    return;
  }
  if (room.id.includes('magazine')) {
    for (let y = r.y + 4; y + 8 < r.y + r.h - 4; y += 11) {
      along(r.x + 4, r.w - 8, 20, 4, (x) => bombCart(p.ctx, x, y));
    }
    hazardBorder(p.ctx, r.x, r.y, r.w, r.h, 1);
    return;
  }
  if (room.id.includes('refrig')) {
    for (let y = r.y + 4; y + 8 < r.y + r.h - 4; y += 12) shelving(p.ctx, r.x + 4, y, r.w - 8, p.seed);
    fill(p.ctx, r.x, r.y, r.w, 1, '#9fd3e6');
    return;
  }
  if (room.id.includes('void')) {
    pipeRun(p.ctx, r.x + 2, r.y + 8, r.w - 4, '#3f6f9a');
    pipeRun(p.ctx, r.x + 2, r.y + r.h - 14, r.w - 4, '#9a3f3f');
    return;
  }
  if (room.id.includes('safetynet')) return;
  if (room.id.includes('lobby')) {
    hazardBorder(p.ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 1);
    return;
  }
  for (let y = r.y + 3; y + 8 < r.y + r.h - 12; y += 12) shelving(p.ctx, r.x + 4, y, r.w - 8, p.seed + y);
  along(r.x + 4, r.w - 8, 9, 6, (x) => crate(p.ctx, x, r.y + r.h - 12));
};

const work: Layout = (p, r, room) => {
  const id = room.id;
  const { ctx } = p;
  if (id.includes('avionics') || id.includes('comms') || id.includes('intel') || id.includes('sonar') || id.includes('radar')) {
    along(r.x + 3, r.w - 6, 9, 3, (x) => cabinet(p, x, r.y + 2));
    along(r.x + 4, r.w - 8, 14, 6, (x) => console_(p, x, r.y + 22));
    return;
  }
  if (id.includes('engineshop')) {
    toolboard(ctx, r.x + 4, r.y + 1, r.w - 8);
    engineStand(ctx, r.x + 6, r.y + 10);
    if (r.w > 70) engineStand(ctx, r.x + 40, r.y + 10);
    workbench(p, r.x + 4, r.y + r.h - 14, r.w - 8);
    return;
  }
  if (id.includes('ordnance') || id.includes('weaponsprep')) {
    // A few weapons staged on carts, with room left to move them.
    along(r.x + 6, r.w - 12, 20, 14, (x) => bombCart(ctx, x, r.y + 8));
    along(r.x + 16, r.w - 32, 20, 22, (x) => bombCart(ctx, x, r.y + r.h - 18));
    return;
  }
  if (id.includes('reactoraux')) {
    reactor(p, r.x + 30, r.y + r.h / 2, 18);
    if (r.w > 110) reactor(p, r.x + 80, r.y + r.h / 2, 18);
    pipeRun(ctx, r.x + 2, r.y + 4, r.w - 4, '#a8902f');
    along(r.x + r.w - 30, 26, 9, 2, (x) => cabinet(p, x, r.y + r.h - 14));
    return;
  }
  if (id.includes('machinery') || id.includes('propulsion') || id.includes('auxmach')) {
    // Main turbines with their reduction gear, pumps alongside.
    const tw = Math.min(80, Math.floor((r.w - 40) / 2));
    turbine(p, r.x + 6, r.y + 6, tw, 24);
    if (r.w > 120) turbine(p, r.x + 14 + tw, r.y + 6, tw, 24);
    obj(ctx, r.x + 6, r.y + 34, 16, 12, '#5d6a74');
    along(r.x + r.w - 26, 22, 10, 2, (x) => pump(ctx, x, r.y + 8));
    along(r.x + r.w - 26, 22, 10, 2, (x) => pump(ctx, x, r.y + 22));
    pipeRun(ctx, r.x + 2, r.y + r.h - 16, r.w - 4, '#a8902f');
    pipeRun(ctx, r.x + 2, r.y + r.h - 9, r.w - 4, '#3f6f9a');
    return;
  }
  if (id.includes('boilers') || id.includes('generators') || id.includes('electrical') || id.includes('technical')) {
    along(r.x + 3, r.w - 6, 9, 2, (x) => cabinet(p, x, r.y + 2));
    machine(p, r.x + 8, r.y + 22, Math.min(40, r.w - 20), 14, '#6a6a4a');
    pipeRun(ctx, r.x + 2, r.y + r.h - 8, r.w - 4, '#9a3f3f');
    return;
  }
  if (id.includes('cooling') || id.includes('pump') || id.includes('ballast') || id.includes('bilge') || id.includes('vent') || id.includes('sewage')) {
    along(r.x + 4, r.w - 8, 10, 6, (x) => pump(ctx, x, r.y + 6));
    pipeRun(ctx, r.x + 2, r.y + 26, r.w - 4, '#3f6f9a');
    pipeRun(ctx, r.x + 2, r.y + 34, r.w - 4, '#5f9a6f');
    along(r.x + 6, r.w - 12, 10, 10, (x) => pump(ctx, x, r.y + r.h - 16));
    return;
  }
  if (id.includes('steering') || id.includes('stabilizer')) {
    turbine(p, r.x + 10, r.y + 14, r.w - 40, 22);
    cabinet(p, r.x + r.w - 20, r.y + 4);
    return;
  }
  if (id.includes('laundry')) {
    along(r.x + 3, r.w - 6, 9, 3, (x) => washer(ctx, x, r.y + 3));
    obj(ctx, r.x + 4, r.y + r.h - 14, r.w - 8, 6, '#b5bcc2');
    return;
  }
  if (id.includes('heads')) {
    along(r.x + 2, r.w - 4, 10, 1, (x) => {
      fill(ctx, x, r.y + 2, 1, 16, '#8a949e');
      obj(ctx, x + 3, r.y + 4, 5, 6, '#e6e9ec');
    });
    along(r.x + 4, r.w - 8, 10, 4, (x) => obj(ctx, x, r.y + r.h - 16, 10, 10, '#4f7f9a'));
    return;
  }
  if (id.includes('fueling')) {
    along(r.x + 6, r.w - 12, 14, 12, (x) => {
      obj(ctx, x, r.y + 8, 14, 14, '#b8312a');
      fill(ctx, x + 4, r.y + 12, 6, 6, '#d9b42a');
    });
    pipeRun(ctx, r.x + 2, r.y + r.h - 10, r.w - 4, '#7b4fa8');
    return;
  }
  if (id.includes('catcontrol')) return;
  // Generic shop: benches, a machine, tool boards.
  toolboard(ctx, r.x + 4, r.y + 1, r.w - 8);
  workbench(p, r.x + 4, r.y + 8, Math.min(r.w - 8, 40));
  if (r.w > 60) machine(p, r.x + r.w - 26, r.y + 8, 20, 12);
  along(r.x + 4, r.w - 8, 9, 10, (x) => toolCart(ctx, x, r.y + r.h - 14));
};

const hangar: Layout = (p, r, room) => {
  const { ctx } = p;
  // Spot outlines for parked airframes, painted on the deck.
  for (let x = r.x + 4; x + 40 < r.x + r.w; x += 52) {
    for (let i = 0; i < 44; i += 3) {
      px(ctx, x + i, r.y + 3, '#a8902f');
      px(ctx, x + i, r.y + r.h - 4, '#a8902f');
    }
  }
  if (room.id.includes('maint')) {
    toolboard(ctx, r.x + 4, r.y + 1, r.w - 8);
    toolCart(ctx, r.x + 6, r.y + r.h - 12);
    toolCart(ctx, r.x + r.w - 16, r.y + r.h - 12);
    engineStand(ctx, r.x + r.w / 2 - 11, r.y + r.h - 14);
  } else {
    tractor(ctx, r.x + r.w - 20, r.y + r.h - 14);
  }
};

const LAYOUTS: Record<string, Layout> = {
  berthing,
  mess,
  medical,
  command,
  training,
  store,
  work,
  hangar,
};

// ---------------------------------------------------------------------------
// The flight deck
// ---------------------------------------------------------------------------

function paintFlightDeck(p: Painter, deck: DeckDef, spans: { x0: number; x1: number }[]): void {
  const { ctx } = p;
  const inside = (x: number, y: number) => {
    const s = spans[Math.round(y)];
    return !!s && x >= s.x0 + 3 && x < s.x1 - 3;
  };
  const dot = (x: number, y: number, c: string) => {
    if (inside(x, y)) px(ctx, x, y, c);
  };

  // Catwalk grating along both deck edges.
  for (let y = 0; y < H; y++) {
    const s = spans[y]!;
    if (y > 4 && y < H - 5) continue;
    for (let x = s.x0 + 1; x < s.x1 - 1; x++) {
      px(ctx, x, y, (x + y) % 3 === 0 ? '#22282e' : '#353b41');
    }
  }

  // Tie-down pockets every two tiles.
  for (let y = 10; y < H - 8; y += 12) {
    for (let x = 20 + ((y / 12) % 2) * 6; x < W - 20; x += 12) {
      dot(x, y, '#2e3135');
      dot(x + 1, y, '#2e3135');
    }
  }

  // ---- Angled landing area ---------------------------------------------
  const ax = 6 * TILE;
  const ay = 12.4 * TILE;
  const bx = 104 * TILE;
  const by = 4.8 * TILE;
  const len = Math.hypot(bx - ax, by - ay);
  const dx = (bx - ax) / len;
  const dy = (by - ay) / len;
  const nx = -dy;
  const ny = dx;
  const half = 4.3 * TILE;
  const along_ = (t: number, o: number): [number, number] => [ax + dx * t + nx * o, ay + dy * t + ny * o];

  // Rubber build-up where hooks and tyres meet the deck.
  for (let t = len * 0.12; t < len * 0.62; t += 1) {
    for (let o = -14; o <= 14; o++) {
      const [x, y] = along_(t, o);
      if (hash(Math.round(x), Math.round(y), 5) < 0.55 - Math.abs(o) / 40) dot(Math.round(x), Math.round(y), '#35383c');
    }
  }
  // Edge lines and centreline.
  for (let t = 0; t < len; t += 1) {
    const dash = t % 20 < 12;
    for (const side of [-half, half]) {
      if (!dash) continue;
      const [x, y] = along_(t, side);
      dot(Math.round(x), Math.round(y), '#d8dcdf');
      dot(Math.round(x), Math.round(y) + 1, '#b9bec2');
    }
    if (t % 28 < 16 && t > 10) {
      const [x, y] = along_(t, 0);
      dot(Math.round(x), Math.round(y), '#e2d27a');
      dot(Math.round(x), Math.round(y) + 1, '#c9b860');
    }
    // Foul line, red and white, outboard of the starboard edge.
    const [fx, fy] = along_(t, half + 7);
    dot(Math.round(fx), Math.round(fy), Math.floor(t / 6) % 2 ? '#c0392b' : '#e6e6e6');
  }
  // Arresting wires: four cables across the landing area.
  for (const f of [0.17, 0.23, 0.29, 0.35]) {
    for (let o = -half - 4; o <= half + 4; o += 0.5) {
      const [x, y] = along_(len * f, o);
      dot(Math.round(x), Math.round(y), '#a4abb2');
      dot(Math.round(x) + 1, Math.round(y) + 1, '#1f2327');
    }
    for (const o of [-half - 6, half + 6]) {
      const [x, y] = along_(len * f, o);
      obj(ctx, x - 2, y - 2, 5, 4, '#2a2e33');
    }
  }
  // Drop lights at the round-down.
  for (let i = -2; i <= 2; i++) {
    obj(ctx, 3 * TILE, ay + i * 5 - 1, 3, 3, '#e8ad12');
    p.lights.push({ x: 3 * TILE + 1, y: Math.round(ay + i * 5), color: '#ffd76a', phase: i * 0.6, rate: 2.2 });
  }

  // ---- Bow catapults ------------------------------------------------------
  for (const cy of [5.6 * TILE, 9.2 * TILE]) {
    const start = 121 * TILE;
    // Jet blast deflector, raised behind the shuttle.
    obj(ctx, start - 22, cy - 13, 8, 26, '#5a5f66');
    for (let j = cy - 11; j < cy + 12; j += 3) fill(ctx, start - 21, j, 6, 1, '#454a50');
    hazardBorder(ctx, start - 22, cy - 13, 8, 26, 1);
    for (let x = start; x < W; x++) {
      if (!inside(x, cy)) continue;
      px(ctx, x, cy - 1, '#6b7076');
      px(ctx, x, cy, '#16191c');
      px(ctx, x, cy + 1, '#6b7076');
      if (x % 16 < 8) {
        dot(x, cy - 7, '#d8dcdf');
        dot(x, cy + 7, '#d8dcdf');
      }
    }
    obj(ctx, start + 4, cy - 2, 6, 5, '#d9b42a');
  }

  // Hull number at the bow, readable from an approaching aircraft.
  paintNumerals(ctx, '79', 186 * TILE, 15 * TILE, 3, '#d8dcdf');

  // ---- Parking and taxi lines --------------------------------------------
  const park = deck.rooms.find((r) => r.id === 'd1-parking');
  if (park) {
    const x0 = park.rect.x * TILE;
    const y0 = park.rect.y * TILE - 4;
    for (let x = x0; x < (park.rect.x + park.rect.w) * TILE; x++) {
      if (x % 10 < 6) dot(x, y0, '#d9b42a');
    }
  }
  for (let x = 104 * TILE; x < 196 * TILE; x++) {
    if (x % 10 < 6) dot(x, 13.6 * TILE, '#d9b42a');
  }

  // Oil and fuel stains, scattered deterministically.
  for (let i = 0; i < 60; i++) {
    const sx = Math.floor(hash(i, 1, 11) * W);
    const sy = Math.floor(hash(i, 2, 11) * H);
    const r = 1 + Math.floor(hash(i, 3, 11) * 3);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r && hash(sx + x, sy + y, 12) > 0.3) dot(sx + x, sy + y, '#383b3e');
      }
    }
  }

  for (const room of deck.rooms) {
    if (room.kind === 'elevator') {
      paintTrunk(ctx, room);
    } else if (room.kind === 'stairs') {
      const x = room.rect.x * TILE + 8;
      const y = room.rect.y * TILE + 6;
      obj(ctx, x, y, 22, 18, '#3a3d41');
      hazardBorder(ctx, x, y, 22, 18, 1);
      for (let j = y + 4; j < y + 15; j += 3) fill(ctx, x + 6, j, 10, 1, '#7d868f');
    }
  }

  // ---- Island --------------------------------------------------------------
  const island = deck.rooms.find((r) => r.id === 'd1-island');
  if (island) paintIsland(p, island);

  const cat = deck.rooms.find((r) => r.id === 'd1-catcontrol');
  if (cat) {
    // The catapult control station is a glazed bubble flush with the deck.
    const cx = (cat.rect.x + cat.rect.w / 2) * TILE;
    const cy = (cat.rect.y + cat.rect.h / 2) * TILE;
    for (let y = -11; y <= 11; y++) {
      for (let x = -24; x <= 24; x++) {
        const d = (x / 24) ** 2 + (y / 11) ** 2;
        if (d > 1) continue;
        const c = d > 0.8 ? '#5a6068' : x + y < -10 && d < 0.5 ? '#5a87ad' : '#1f3346';
        px(ctx, cx + x, cy + y, c);
      }
    }
    light(p, cx + 14, cy + 2, '#5b9831', 1.1);
    light(p, cx - 14, cy + 2, '#c0392b', 0.9);
  }

  const radar = deck.rooms.find((r) => r.id === 'd1-radar');
  if (radar) {
    // The landing radar sponson: a small housing, a radome and a dish.
    const x = radar.rect.x * TILE + 26;
    const y = radar.rect.y * TILE + 12;
    const w = radar.rect.w * TILE - 52;
    const h = radar.rect.h * TILE - 26;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 6, y + 6, w, h);
    obj(ctx, x, y, w, h, '#7a828a');
    obj(ctx, x + 4, y + 4, w - 8, h - 8, '#8a929a');
    radome(ctx, x + 12, y + h / 2, 6);
    p.radars.push({ x: x + w - 18, y: y + h / 2, r: 9 });
    light(p, x + w - 4, y + 3, '#e8ad12', 0.9);
  }

  const net = deck.rooms.find((r) => r.id === 'd1-safetynet');
  if (net) {
    const x0 = net.rect.x * TILE + 4;
    const y0 = net.rect.y * TILE + 6;
    const w = net.rect.w * TILE - 8;
    const h = net.rect.h * TILE - 12;
    fill(ctx, x0, y0, w, h, '#2b2f33');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) px(ctx, x0 + x, y0 + y, '#5b6168');
      }
    }
    hazardBorder(ctx, x0, y0, w, h, 1);
  }
}

function radome(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.3) continue;
      const c = d > r - 1 ? '#151a20' : x + y < -r * 0.5 ? '#f2f4f6' : x + y > r * 0.6 ? '#a9b0b7' : '#d6dade';
      px(ctx, cx + x, cy + y, c);
    }
  }
}

/** A phased-array face: a dark panel with a fine element grid. */
function arrayFace(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  obj(ctx, x, y, w, h, '#2a3340');
  for (let j = y + 2; j < y + h - 1; j += 2) {
    for (let i = x + 2; i < x + w - 1; i += 2) px(ctx, i, j, '#3c4a5c');
  }
}

function paintIsland(p: Painter, room: RoomDef): void {
  const { ctx } = p;
  const x = room.rect.x * TILE + 4;
  const y = room.rect.y * TILE + 6;
  const w = room.rect.w * TILE - 8;
  const h = room.rect.h * TILE - 10;

  // The island casts a long shadow across the deck, away from the light.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(x + w, y + 3);
  ctx.lineTo(x + w + 18, y + 16);
  ctx.lineTo(x + w + 18, y + h + 14);
  ctx.lineTo(x + 18, y + h + 14);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // Stepped superstructure: each level smaller and lighter, as it rises
  // toward the light.
  obj(ctx, x, y, w, h, '#6f777f');
  for (let i = x + 4; i < x + w - 6; i += 9) obj(ctx, i, y + h - 6, 6, 4, '#c9ced3');
  obj(ctx, x + 10, y + 5, w - 22, h - 14, '#7f878f');
  obj(ctx, x + 26, y + 10, w - 58, h - 26, '#8f979e');
  // Primary flight control and the bridge look out over the deck: a band of
  // windows along the port face of the top level.
  const tx = x + 40;
  const tw = w - 86;
  obj(ctx, tx, y + 14, tw, h - 34, '#a0a8ae');
  for (let i = tx + 2; i < tx + tw - 2; i += 3) {
    fill(ctx, i, y + 15, 2, 2, hash(i, y, 4) > 0.7 ? '#e8c46a' : '#1a2733');
  }

  // Radar array faces on the corners of the second level.
  arrayFace(ctx, x + 12, y + 7, 12, 8);
  arrayFace(ctx, x + w - 26, y + 7, 12, 8);
  arrayFace(ctx, x + 12, y + h - 20, 12, 8);
  arrayFace(ctx, x + w - 26, y + h - 20, 12, 8);

  // Exhaust grilles aft, vents forward.
  for (const gx of [x + 30, x + 42]) {
    obj(ctx, gx, y + h - 18, 9, 6, '#3a4048');
    for (let i = gx + 2; i < gx + 8; i += 2) fill(ctx, i, y + h - 17, 1, 4, '#22272d');
  }

  // Mast with yardarms and radomes.
  const mx = tx + tw / 2;
  const my = y + h / 2 + 2;
  fill(ctx, mx - 1, my - 12, 3, 22, '#2b3138');
  fill(ctx, mx - 12, my - 6, 25, 1, '#2b3138');
  fill(ctx, mx - 9, my + 5, 19, 1, '#2b3138');
  radome(ctx, mx - 13, my - 6, 3);
  radome(ctx, mx + 13, my - 6, 3);
  radome(ctx, x + w - 34, my + 2, 4);
  p.radars.push({ x: mx, y: my - 1, r: 9 });

  light(p, mx, my - 12, '#c0392b', 0.8);
  light(p, x + w - 4, y + 3, '#5b9831', 1.2);
  light(p, x + 3, y + 3, '#c0392b', 1.0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const cache = new Map<number, DeckLayer>();

export function deckLayer(deck: DeckDef): DeckLayer {
  const hit = cache.get(deck.index);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  const painter: Painter = { ctx, lights: [], radars: [], seed: deck.index * 101 };

  const spans = hullSpans(deck);
  const flight = deck.index === 1;
  const base = flight ? '#45484c' : PAL.deckPlate[deck.index - 1] ?? PAL.deckPlate[0]!;
  paintHull(ctx, deck, spans, base, flight);

  if (flight) {
    paintFlightDeck(painter, deck, spans);
  } else {
    paintPassage(ctx, spans);
    for (const room of deck.rooms) {
      if (room.kind === 'elevator' || room.kind === 'stairs') {
        paintTrunk(ctx, room);
        continue;
      }
      paintRoomShell(ctx, room, painter.seed);
      const layout = LAYOUTS[room.kind] ?? work;
      // Officer country is berthing for officers: staterooms, not racks.
      if (room.id === 'd3-officer') officers(painter, inner(room), room);
      else layout(painter, inner(room), room);
    }
  }

  const layer = { canvas, lights: painter.lights, radars: painter.radars };
  cache.set(deck.index, layer);
  return layer;
}

// ---------------------------------------------------------------------------
// Sea
// ---------------------------------------------------------------------------

let ocean: HTMLCanvasElement | null = null;

/**
 * A seamless tile of open water: deep blue with broken wave crests. The deck
 * view scrolls it, faster when the ship is under way.
 */
export function oceanTile(): HTMLCanvasElement {
  if (ocean) return ocean;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      const n = hash(x, y, 909);
      px(ctx, x, y, n > 0.97 ? '#163d57' : n < 0.03 ? '#0a2236' : '#0e2b42');
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 0, 31) * 128);
    const y = Math.floor(hash(i, 1, 31) * 64);
    const len = 4 + Math.floor(hash(i, 2, 31) * 9);
    for (let k = 0; k < len; k++) {
      px(ctx, (x + k) % 128, y, k === 0 || k === len - 1 ? '#1d4a68' : '#2a6283');
      px(ctx, (x + k + 1) % 128, (y + 1) % 64, '#0a2236');
    }
  }
  ocean = c;
  return c;
}
