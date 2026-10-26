/**
 * Crew sprites, generated into offscreen canvases once and then blitted.
 * Authored as character art with a colour key — legible to edit, and it
 * keeps hard pixel edges. Airframes live in `pixelArt.ts`, the decks and
 * their furniture in `deckArt.ts`.
 */

type Key = Record<string, string | null>;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Paint character art onto a canvas. '.' is transparent. */
function paint(rows: string[], key: Key): HTMLCanvasElement {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const color = key[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

/**
 * A crew member is 5x7: helmet, shoulders, legs. Small, but with a strong
 * enough silhouette to read at 1:1 and a helmet colour that carries the
 * specialty (spec section 84).
 */
const CREW_FRAMES: string[][] = [
  // Stride A
  [
    '.oHho.',
    'ohhhho',
    'Obbbbo',
    'bbbbbB',
    'oBbbBo',
    '.l..s.',
    '.l....',
  ],
  // Stride B: the other foot forward, the body a pixel lower
  [
    '......',
    '.oHho.',
    'ohhhho',
    'Obbbbo',
    'bbbbbB',
    'oBbbBo',
    '.s..l.',
  ],
];

const crewCache = new Map<string, HTMLCanvasElement[]>();

/**
 * Two walk frames for a helmet and vest colour, cached per pair. Seen from
 * slightly above: a cranial over shoulders, with a lit top edge, a shaded
 * flank and a dark outline so a person still reads against busy deck paint.
 */
export function crewSprite(helmetColor: string, vest: string): HTMLCanvasElement[] {
  const cacheKey = `${helmetColor}|${vest}`;
  const hit = crewCache.get(cacheKey);
  if (hit) return hit;

  const key: Key = {
    '.': null,
    o: '#11161c',
    O: '#11161c',
    h: helmetColor,
    H: lighten(helmetColor, 0.35),
    b: vest,
    B: lighten(vest, -0.35),
    l: '#2b3440',
    s: '#1b222b',
  };
  const frames = CREW_FRAMES.map((rows) => paint(rows, key));
  crewCache.set(cacheKey, frames);
  return frames;
}

function lighten(color: string, t: number): string {
  const h = color.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out = ch.map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function clearSpriteCaches(): void {
  crewCache.clear();
}
