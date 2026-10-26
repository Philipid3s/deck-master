import { TILE } from '../data/decks';
import { aircraftType } from '../data/aircraft';

/**
 * Airframe sprites, baked as true pixel art at the deck's own resolution.
 *
 * One art pixel is one world pixel (TILE pixels per tile), the same density
 * as the deck plating, the props and the crew, so the whole ship reads as a
 * single piece of pixel art instead of illustrations pasted onto a diagram.
 *
 * Each type is a blueprint in metres — nose at x = 0, y lateral from the
 * centreline — rasterised onto a material grid, then shaded by rule: light
 * from the top-left, a one-pixel dark outline, contact shadow under any
 * part that overlaps another. Blueprints are short to write, every type
 * shares the same light and outline, and a folded-wing variant is just a
 * second shape list.
 *
 * Aircraft point at the bow (screen right), the way they are spotted for
 * launch and the way the ship is drawn.
 */

type Mat =
  | 'body'
  | 'wing'
  | 'radome'
  | 'dark'
  | 'nozzle'
  | 'canopy'
  | 'tail'
  | 'dome'
  | 'domeBand'
  | 'prop'
  | 'rotor'
  | 'cowl'
  | 'pod'
  | 'insig'
  | 'fold'
  | 'nacelle';

type Pt = [number, number];

type Shape =
  | { mat: Mat; poly: Pt[]; mirror?: boolean }
  | { mat: Mat; ellipse: [number, number, number, number]; mirror?: boolean }
  | { mat: Mat; rect: [number, number, number, number]; mirror?: boolean };

interface Blueprint {
  /** Overall length and span in metres, used to fit the box. */
  length: number;
  span: number;
  scheme: 'gull' | 'stealth';
  shapes: Shape[];
  folded: Shape[];
  /** Panel lines in metres, darkening whatever they cross. */
  lines?: [Pt, Pt][];
  foldedLines?: [Pt, Pt][];
}

// ---------------------------------------------------------------------------
// Colour schemes
// ---------------------------------------------------------------------------

const GULL: Record<Mat, string> = {
  body: '#97a1ab',
  wing: '#8a949e',
  radome: '#a9b0b7',
  dark: '#2b3138',
  nozzle: '#5c5249',
  canopy: '#1d3247',
  tail: '#8a949e',
  dome: '#c9ced3',
  domeBand: '#4a525b',
  prop: '#20252b',
  rotor: '#2b3138',
  cowl: '#a4adb6',
  pod: '#9aa3ad',
  insig: '#717b86',
  fold: '#aeb6be',
  nacelle: '#9aa4ae',
};

const STEALTH: Record<Mat, string> = {
  ...GULL,
  body: '#7b848d',
  wing: '#737c86',
  radome: '#7f8891',
  canopy: '#5a4720',
  insig: '#646d76',
  fold: '#8d969f',
  tail: '#737c86',
};

const OUTLINE = '#11161c';

/** Squadron accent on the fins, keyed by the squadron designator. */
const SQUADRON_TAIL: Record<string, string> = {
  'VFA-14': '#1d1f24',
  'VFA-41': '#14161a',
  'VFA-151': '#7a2a26',
  'VAQ-133': '#4a3a6e',
  'VAW-117': '#2f4f7a',
  'HSC-14': '#8a3b25',
  'HSM-71': '#2d5a4a',
};

export function tailColorFor(squadron: string | undefined): string | null {
  if (!squadron) return null;
  const code = squadron.split(' ')[0] ?? '';
  return SQUADRON_TAIL[code] ?? null;
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

function hornet(twoSeat: boolean, growler: boolean): Blueprint {
  const shapes: Shape[] = [];
  if (growler) {
    // Jamming pods hang under the wing; only the noses ahead of it show.
    shapes.push({ mat: 'pod', ellipse: [10.2, 3.0, 2.0, 0.34] });
    shapes.push({ mat: 'pod', ellipse: [10.6, 4.9, 1.9, 0.32] });
  }
  shapes.push(
    { mat: 'wing', poly: [[8.6, 1.4], [12.0, 6.6], [13.2, 6.8], [13.5, 6.6], [14.1, 1.3]] },
    { mat: 'wing', poly: [[14.7, 1.1], [16.6, 3.4], [17.9, 3.4], [18.2, 2.6], [17.5, 1.1]] },
    {
      mat: 'body',
      poly: [[0, 0], [1, 0.3], [2.5, 0.55], [4.5, 0.7], [7, 0.8], [9, 1.25], [13, 1.4], [16, 1.3], [17.4, 1.1], [17.4, 0]],
    },
    { mat: 'body', poly: [[4.2, 0.7], [6.5, 1.1], [8.6, 1.8], [9.4, 1.8], [9.4, 0.8]] },
    { mat: 'radome', poly: [[0, 0], [1, 0.3], [1.7, 0.42], [1.7, 0]] },
    { mat: 'tail', poly: [[12.2, 1.15], [15.5, 2.35], [16.6, 2.35], [15.2, 1.05]] },
    { mat: 'nozzle', rect: [17.1, 0.3, 18.3, 1.0] },
    { mat: 'canopy', ellipse: [twoSeat ? 4.1 : 3.5, 0, twoSeat ? 2.1 : 1.5, 0.45] },
    { mat: 'insig', ellipse: [12.4, -4.9, 0.55, 0.55], mirror: false },
  );
  if (growler) shapes.push({ mat: 'pod', rect: [11.6, 6.6, 13.6, 7.05] });

  const folded: Shape[] = [];
  if (growler) {
    folded.push({ mat: 'pod', ellipse: [10.2, 3.0, 2.0, 0.34] });
  }
  folded.push(
    { mat: 'wing', poly: [[8.6, 1.4], [10.6, 4.4], [13.8, 4.4], [14.1, 1.3]] },
    { mat: 'wing', poly: [[14.7, 1.1], [16.6, 3.4], [17.9, 3.4], [18.2, 2.6], [17.5, 1.1]] },
    {
      mat: 'body',
      poly: [[0, 0], [1, 0.3], [2.5, 0.55], [4.5, 0.7], [7, 0.8], [9, 1.25], [13, 1.4], [16, 1.3], [17.4, 1.1], [17.4, 0]],
    },
    { mat: 'body', poly: [[4.2, 0.7], [6.5, 1.1], [8.6, 1.8], [9.4, 1.8], [9.4, 0.8]] },
    { mat: 'radome', poly: [[0, 0], [1, 0.3], [1.7, 0.42], [1.7, 0]] },
    // The outer panel stands up at the fold: from above, a bright edge.
    { mat: 'fold', rect: [10.4, 4.25, 13.9, 4.75] },
    { mat: 'tail', poly: [[12.2, 1.15], [15.5, 2.35], [16.6, 2.35], [15.2, 1.05]] },
    { mat: 'nozzle', rect: [17.1, 0.3, 18.3, 1.0] },
    { mat: 'canopy', ellipse: [twoSeat ? 4.1 : 3.5, 0, twoSeat ? 2.1 : 1.5, 0.45] },
  );

  return {
    length: 18.3,
    span: growler ? 14.1 : 13.6,
    scheme: 'gull',
    shapes,
    folded,
    lines: [
      [[12.9, 1.5], [13.0, 6.3]],
      [[9.4, 0.9], [16.8, 0.9]],
      [[9.4, -0.9], [16.8, -0.9]],
    ],
    foldedLines: [
      [[9.4, 0.9], [16.8, 0.9]],
      [[9.4, -0.9], [16.8, -0.9]],
    ],
  };
}

function hawkeye(): Blueprint {
  const common = (wings: Shape[]): Shape[] => [
    ...wings,
    { mat: 'wing', poly: [[14.3, 0.3], [14.6, 3.95], [16.4, 3.95], [16.6, 0.3]] },
    {
      mat: 'body',
      poly: [[0, 0], [0.8, 0.6], [2, 0.9], [4, 1.05], [11, 1.05], [14, 0.75], [16, 0.45], [16.9, 0.3], [16.9, 0]],
    },
    { mat: 'canopy', rect: [1.5, -0.75, 2.5, 0.75], mirror: false },
    { mat: 'tail', rect: [13.8, 3.65, 16.9, 4.05] },
    { mat: 'tail', rect: [14.2, 1.55, 16.7, 1.85] },
  ];
  const nacelles: Shape[] = [
    { mat: 'nacelle', poly: [[2.0, 3.3], [2.6, 2.7], [9.6, 2.7], [10.6, 3.3], [9.6, 3.9], [2.6, 3.9]], mirror: true },
    { mat: 'prop', rect: [1.75, 1.2, 2.15, 5.4] },
  ];
  return {
    length: 17.6,
    span: 24.6,
    scheme: 'gull',
    shapes: [
      ...common([{ mat: 'wing', poly: [[5.0, 1.0], [6.0, 12.25], [7.6, 12.25], [8.8, 1.0]] }]),
      ...nacelles,
      { mat: 'dome', ellipse: [9.0, 0, 3.65, 3.65] },
      { mat: 'domeBand', rect: [8.7, -3.5, 9.3, 3.5], mirror: false },
    ],
    folded: [
      ...common([
        { mat: 'wing', poly: [[5.0, 1.0], [5.4, 4.4], [8.6, 4.4], [8.8, 1.0]] },
        // Outer panels swing back and lie alongside the fuselage.
        { mat: 'fold', poly: [[8.0, 3.9], [8.6, 4.45], [16.2, 4.45], [16.2, 3.75]] },
      ]),
      ...nacelles,
      { mat: 'dome', ellipse: [9.0, 0, 3.65, 3.65] },
      { mat: 'domeBand', rect: [8.7, -3.5, 9.3, 3.5], mirror: false },
    ],
    lines: [[[7.0, 4.2], [7.2, 11.8]]],
  };
}

function rotorBlades(cx: number, cy: number, radius: number, angles: number[], width: number): Shape[] {
  return angles.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const nx = -dy * width * 0.5;
    const ny = dx * width * 0.5;
    const tipX = cx + dx * radius;
    const tipY = cy + dy * radius;
    return {
      mat: 'rotor' as Mat,
      mirror: false,
      poly: [
        [cx + nx, cy + ny],
        [tipX + nx, tipY + ny],
        [tipX - nx, tipY - ny],
        [cx - nx, cy - ny],
      ] as Pt[],
    };
  });
}

function seahawk(romeo: boolean): Blueprint {
  const hull: Shape[] = [
    { mat: 'wing', poly: [[16.3, 0.3], [16.5, 1.7], [17.5, 1.7], [17.5, 0.3]] },
    {
      mat: 'body',
      poly: [[2.9, 0], [3.2, 0.7], [4.2, 1.1], [10.6, 1.15], [11.3, 0.7], [11.3, 0.45], [17.6, 0.3], [18.1, 0.3], [18.1, 0]],
    },
    { mat: 'body', poly: [[8.5, 1.1], [9.0, 1.65], [10.6, 1.65], [10.8, 1.1]] },
    { mat: 'cowl', rect: [6.8, -0.62, 10.6, 0.62], mirror: false },
    { mat: 'canopy', poly: [[3.0, 0], [3.3, 0.65], [4.6, 0.92], [4.6, 0]] },
    { mat: 'tail', rect: [15.4, -0.3, 18.1, 0.3], mirror: false },
    { mat: 'prop', rect: [16.6, -0.62, 18.5, -0.42], mirror: false },
  ];
  if (romeo) hull.push({ mat: 'dark', rect: [5.0, 1.1, 6.0, 1.45] });
  return {
    length: 18.6,
    span: 16.4,
    scheme: 'gull',
    shapes: [
      ...hull,
      ...rotorBlades(8.2, 0, 8.15, [45, 135, 225, 315], 0.6),
      { mat: 'dark', ellipse: [8.2, 0, 0.6, 0.6] },
    ],
    folded: [
      ...hull,
      // Blades swing aft and lie along the tail.
      { mat: 'rotor', rect: [8.2, 0.15, 16.4, 0.5] },
      { mat: 'rotor', rect: [8.2, 0.75, 15.6, 1.1] },
      { mat: 'dark', ellipse: [8.2, 0, 0.6, 0.6] },
    ],
  };
}

function osprey(): Blueprint {
  const body: Shape[] = [
    { mat: 'wing', rect: [14.8, 0, 17.0, 2.8] },
    {
      mat: 'body',
      poly: [[0, 0], [1.0, 0.7], [2.5, 1.1], [4, 1.25], [13, 1.25], [15.5, 0.9], [17.5, 0.6], [17.5, 0]],
    },
    { mat: 'body', poly: [[6.0, 1.2], [6.6, 1.9], [11.0, 1.9], [11.6, 1.2]] },
    { mat: 'canopy', poly: [[1.0, 0], [1.2, 0.7], [2.7, 1.0], [2.7, 0]] },
    { mat: 'tail', rect: [14.4, 2.6, 17.4, 2.95] },
  ];
  return {
    length: 17.5,
    span: 25.8,
    scheme: 'gull',
    shapes: [
      ...body,
      { mat: 'wing', rect: [6.4, 0, 9.0, 7.0] },
      { mat: 'nacelle', poly: [[4.6, 6.6], [5.2, 6.2], [10.0, 6.2], [10.0, 7.8], [5.2, 7.8], [4.6, 7.4]] },
      ...rotorBlades(6.2, 7.0, 5.8, [-90, 30, 150], 0.7),
      ...rotorBlades(6.2, -7.0, 5.8, [90, -30, -150], 0.7),
      { mat: 'dark', ellipse: [6.2, 7.0, 0.55, 0.55] },
    ],
    folded: [
      ...body,
      // Stowed: the wing swings fore-and-aft over the fuselage.
      { mat: 'wing', rect: [3.0, -1.3, 16.0, 1.3], mirror: false },
      { mat: 'nacelle', rect: [1.6, -0.8, 4.0, 0.8], mirror: false },
      { mat: 'nacelle', rect: [15.0, -0.8, 17.4, 0.8], mirror: false },
      { mat: 'rotor', rect: [2.6, 1.35, 9.0, 1.7] },
      { mat: 'rotor', rect: [10.0, 1.35, 16.0, 1.7] },
    ],
  };
}

function lightning(): Blueprint {
  const core: Shape[] = [
    { mat: 'wing', poly: [[12.3, 1.3], [14.3, 3.7], [15.5, 3.7], [15.6, 1.2]] },
    {
      mat: 'body',
      poly: [[0, 0], [1.0, 0.45], [2.5, 0.9], [4.5, 1.3], [6, 1.55], [12, 1.6], [14.6, 1.45], [15.0, 0.9], [15.0, 0]],
    },
    { mat: 'radome', poly: [[0, 0], [1.0, 0.45], [1.6, 0.6], [1.6, 0]] },
    { mat: 'tail', poly: [[10.5, 1.3], [13.5, 2.2], [14.4, 2.2], [12.6, 1.15]] },
    { mat: 'nozzle', rect: [14.8, -0.55, 15.7, 0.55], mirror: false },
    { mat: 'canopy', ellipse: [3.6, 0, 1.6, 0.45] },
  ];
  return {
    length: 15.7,
    span: 13.1,
    scheme: 'stealth',
    shapes: [
      { mat: 'wing', poly: [[6.0, 1.5], [10.6, 6.55], [11.9, 6.55], [12.5, 1.5]] },
      ...core,
      { mat: 'insig', ellipse: [10.6, -4.6, 0.5, 0.5], mirror: false },
    ],
    folded: [
      { mat: 'wing', poly: [[6.0, 1.5], [8.6, 4.4], [12.1, 4.4], [12.5, 1.5]] },
      { mat: 'fold', rect: [8.6, 4.25, 12.0, 4.75] },
      ...core,
    ],
  };
}

function stingray(): Blueprint {
  // A blended body, long straight high-aspect wings and a V-tail; no
  // canopy, just a sensor fairing where a cockpit would be.
  const body: Shape[] = [
    { mat: 'tail', poly: [[12.6, 0.4], [14.6, 3.0], [15.4, 3.0], [14.6, 0.3]] },
    {
      mat: 'body',
      poly: [[0, 0], [1.2, 0.5], [3.5, 0.9], [7.0, 1.3], [11.5, 1.2], [14.5, 0.7], [15.5, 0.45], [15.5, 0]],
    },
    { mat: 'dark', rect: [5.5, -0.35, 9.5, 0.35], mirror: false },
    { mat: 'canopy', ellipse: [1.6, 0, 0.9, 0.35] },
    { mat: 'nozzle', rect: [14.9, -0.35, 15.6, 0.35], mirror: false },
    // The refuelling store under the left wing, its drogue showing.
    { mat: 'pod', ellipse: [6.6, -6.0, 1.6, 0.35], mirror: false },
  ];
  return {
    length: 15.5,
    span: 22.9,
    scheme: 'gull',
    shapes: [{ mat: 'wing', poly: [[6.4, 1.0], [7.0, 11.4], [8.2, 11.4], [8.7, 1.0]] }, ...body],
    folded: [
      { mat: 'wing', poly: [[6.4, 1.0], [6.7, 5.6], [8.5, 5.6], [8.7, 1.0]] },
      { mat: 'fold', rect: [6.6, 5.4, 8.6, 5.9] },
      ...body.filter((b) => b.mat !== 'pod'),
    ],
    lines: [[[7.9, 1.3], [7.95, 11.0]]],
  };
}

const BLUEPRINTS: Record<string, () => Blueprint> = {
  mq25: stingray,
  fa18e: () => hornet(false, false),
  fa18f: () => hornet(true, false),
  ea18g: () => hornet(true, true),
  e2d: hawkeye,
  mh60r: () => seahawk(true),
  mh60s: () => seahawk(false),
  cmv22b: osprey,
  f35c: lightning,
};

const ROLE_FALLBACK: Record<string, string> = {
  fighter: 'fa18e',
  ew: 'ea18g',
  aew: 'e2d',
  helo: 'mh60s',
  transport: 'cmv22b',
  uav: 'mq25',
};

function blueprintFor(typeId: string): Blueprint {
  const direct = BLUEPRINTS[typeId];
  if (direct) return direct();
  const role = aircraftType(typeId).role;
  return BLUEPRINTS[ROLE_FALLBACK[role] ?? 'fa18e']!();
}

// ---------------------------------------------------------------------------
// Rasteriser
// ---------------------------------------------------------------------------

function inPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function hitShape(shape: Shape, mx: number, my: number): boolean {
  const ys = shape.mirror === false ? [my] : [my, -my];
  for (const y of ys) {
    if ('poly' in shape) {
      if (inPoly(mx, y, shape.poly)) return true;
    } else if ('ellipse' in shape) {
      const [cx, cy, rx, ry] = shape.ellipse;
      const dx = (mx - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) return true;
    } else {
      const [x0, y0, x1, y1] = shape.rect;
      if (mx >= x0 && mx <= x1 && y >= y0 && y <= y1) return true;
    }
  }
  return false;
}

export interface BakedAircraft {
  sprite: HTMLCanvasElement;
  /** Silhouette in black, for the drop shadow. */
  shadow: HTMLCanvasElement;
}

const NO_OUTLINE = new Set<Mat>(['prop']);

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(rgb: [number, number, number], amount: number): [number, number, number] {
  // Positive lightens toward a cool white, negative darkens toward a blue-black,
  // which keeps shadows from going muddy on grey airframes.
  if (amount >= 0) {
    return [
      rgb[0] + (232 - rgb[0]) * amount,
      rgb[1] + (238 - rgb[1]) * amount,
      rgb[2] + (244 - rgb[2]) * amount,
    ];
  }
  const t = -amount;
  return [rgb[0] + (14 - rgb[0]) * t, rgb[1] + (18 - rgb[1]) * t, rgb[2] + (26 - rgb[2]) * t];
}

function bake(bp: Blueprint, shapes: Shape[], lines: [Pt, Pt][], w: number, h: number, tail: string | null): BakedAircraft {
  // Fit by metres; the same scale for folded and spread so a folded jet is
  // visibly the same aircraft, only narrower.
  const scale = Math.min((w - 3) / bp.length, (h - 3) / bp.span);
  const lenPx = bp.length * scale;
  const ox = Math.round((w - lenPx) / 2);
  const cy = h / 2;

  // Material grid; the index is the z-order of the shape that won the pixel.
  const mat: (Mat | null)[] = new Array(w * h).fill(null);
  const z = new Int16Array(w * h).fill(-1);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // Nose right: screen x runs from the tail to the nose.
      const mx = bp.length - (px + 0.5 - ox) / scale;
      const my = (py + 0.5 - cy) / scale;
      for (let s = shapes.length - 1; s >= 0; s--) {
        if (hitShape(shapes[s]!, mx, my)) {
          mat[py * w + px] = shapes[s]!.mat;
          z[py * w + px] = s;
          break;
        }
      }
    }
  }

  const panel = new Uint8Array(w * h);
  for (const [[ax, ay], [bx, by]] of lines) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * scale * 2) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mx = ax + (bx - ax) * t;
      const my = ay + (by - ay) * t;
      const px = Math.floor(ox + (bp.length - mx) * scale);
      const py = Math.floor(cy + my * scale);
      if (px >= 0 && py >= 0 && px < w && py < h) panel[py * w + px] = 1;
    }
  }

  const colors = bp.scheme === 'stealth' ? STEALTH : GULL;
  const sprite = makeCanvas(w, h);
  const shadow = makeCanvas(w, h);
  const sctx = sprite.getContext('2d')!;
  const hctx = shadow.getContext('2d')!;
  const img = sctx.createImageData(w, h);
  const himg = hctx.createImageData(w, h);

  const at = (x: number, y: number): Mat | null =>
    x < 0 || y < 0 || x >= w || y >= h ? null : mat[y * w + x]!;
  const zAt = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? -1 : z[y * w + x]!;
  const solid = (m: Mat | null) => m !== null && !NO_OUTLINE.has(m);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const m = mat[i];
      let rgb: [number, number, number] | null = null;
      let alpha = 255;

      if (m) {
        const base = m === 'tail' && tail ? tail : colors[m];
        rgb = parse(base);
        const up = at(x, y - 1);
        const down = at(x, y + 1);
        const left = at(x - 1, y);
        const right = at(x + 1, y);

        if (m === 'canopy') {
          // A glint on the top-left of the glass sells it as glass.
          if (!up || up !== 'canopy') rgb = shade(rgb, 0.45);
          else if (!down || down !== 'canopy') rgb = shade(rgb, -0.25);
        } else if (m === 'prop' || m === 'rotor') {
          if (!up) rgb = shade(rgb, 0.18);
        } else {
          if (!up) rgb = shade(rgb, 0.3);
          else if (!left) rgb = shade(rgb, 0.14);
          if (!down) rgb = shade(rgb, -0.38);
          else if (!right) rgb = shade(rgb, -0.16);
          // Contact shadow: a part sitting under a higher shape is darker
          // just below it — the light comes from above.
          if (up && zAt(x, y - 1) > z[i]! && up !== 'prop' && up !== 'rotor') rgb = shade(rgb, -0.24);
          if (panel[i]) rgb = shade(rgb, -0.17);
        }
        if (m === 'prop') alpha = 200;
      } else {
        // Outline: any empty pixel touching a solid one.
        if (
          solid(at(x - 1, y)) ||
          solid(at(x + 1, y)) ||
          solid(at(x, y - 1)) ||
          solid(at(x, y + 1))
        ) {
          rgb = parse(OUTLINE);
        }
      }

      if (rgb) {
        img.data[i * 4] = Math.round(rgb[0]);
        img.data[i * 4 + 1] = Math.round(rgb[1]);
        img.data[i * 4 + 2] = Math.round(rgb[2]);
        img.data[i * 4 + 3] = alpha;
        himg.data[i * 4 + 3] = 255;
      }
    }
  }

  sctx.putImageData(img, 0, 0);
  hctx.putImageData(himg, 0, 0);
  return { sprite, shadow };
}

const cache = new Map<string, BakedAircraft>();

/** Baked sprite for an airframe type, sized to its deck footprint. */
export function bakedAircraft(typeId: string, folded: boolean, squadron?: string): BakedAircraft {
  const tail = tailColorFor(squadron);
  const key = `${typeId}|${folded}|${tail ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const type = aircraftType(typeId);
  const bp = blueprintFor(typeId);
  const w = type.size.w * TILE;
  const h = type.size.h * TILE;
  const baked = folded
    ? bake(bp, bp.folded, bp.foldedLines ?? [], w, h, tail)
    : bake(bp, bp.shapes, bp.lines ?? [], w, h, tail);
  cache.set(key, baked);
  return baked;
}

const urlCache = new Map<string, string>();

/**
 * The same sprite as a data URL, enlarged by an integer factor for the
 * panels. Integer scaling with `image-rendering: pixelated` in CSS keeps
 * every art pixel square.
 */
export function aircraftDataUrl(typeId: string, factor = 4): string {
  const key = `${typeId}|${factor}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const { sprite, shadow } = bakedAircraft(typeId, false);
  const c = makeCanvas(sprite.width * factor, sprite.height * factor);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.35;
  ctx.drawImage(shadow, factor * 2, factor * 2, c.width, c.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(sprite, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}
