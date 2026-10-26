/**
 * Palette sampled directly from `specifications/pixel art decks.png`, so the
 * live renderer and the concept art agree.
 */
export const PAL = {
  // Page and chrome
  bg: '#050c17',
  panel: '#0a1524',
  panelAlt: '#0d1b2c',
  frame: '#4b5e77',
  frameDim: '#243447',
  divider: '#1c2a3c',
  text: '#bcc3c8',
  textDim: '#71818f',
  textBright: '#e6edf2',

  // Accents from the legend blocks
  crew: '#3361a5',
  aircraftAccent: '#5b9831',
  system: '#e8ad12',
  support: '#7a4298',
  elevator: '#f1c506',
  stairs: '#c07a2a',
  alert: '#c0392b',
  alertDim: '#902119',

  // Status legend
  idle: '#6b7681',
  working: '#5b9831',
  training: '#3d7cc9',
  repairing: '#e8ad12',

  // Deck plating, per the tones in each deck strip
  hullOutline: '#67788c',
  hullShadow: '#020509',
  deckPlate: ['#4b4b4e', '#3b3d40', '#33383d', '#3a3128', '#43453f', '#303033', '#2c3134', '#2a3336'],
  deckPlateDark: ['#3d3d40', '#2f3134', '#282c31', '#2e271f', '#363832', '#262629', '#232729', '#222a2c'],

  passage: '#232a31',
  passageLine: '#2f3941',
  wall: '#6a7480',
  wallDark: '#39424c',

  // Room floors by function
  roomWork: '#39424b',
  roomHangar: '#3f4348',
  roomFlight: '#4b4b4e',
  roomBerth: '#4a4034',
  roomMess: '#4a4436',
  roomMedical: '#3f4750',
  roomTraining: '#374551',
  roomStore: '#413a30',
  roomCommand: '#2f3c4c',
  roomElevator: '#4a4230',
} as const;

/** Floor colour for a room kind. */
export function roomFloor(kind: string): string {
  switch (kind) {
    case 'hangar':
      return '#3f4348';
    case 'flight':
      return '#4b4b4e';
    case 'berthing':
      return '#463c30';
    case 'mess':
      return '#484232';
    case 'medical':
      return '#3d4650';
    case 'training':
      return '#354350';
    case 'store':
      return '#3f3830';
    case 'command':
      return '#2d3a4a';
    case 'elevator':
      return '#4a4230';
    case 'stairs':
      return '#463a2a';
    default:
      return '#39424b';
  }
}

export const SUPPLY_COLORS: Record<string, string> = {
  food: '#8fae4a',
  medical: '#d9d9d9',
  parts: '#5f9ec9',
  fuel: '#e8ad12',
  general: '#8a9bb0',
  ammo: '#c0453f',
};

export const DEPT_ACCENT: Record<string, string> = {
  CMD: '#c9b06a',
  AIR: '#5f9ec9',
  DECK: '#c9b84a',
  MAINT: '#5fc9a8',
  OPS: '#7f8fd9',
  ENG: '#c97f4a',
  MED: '#d9d9d9',
  SUP: '#8a9bb0',
};

/** Interpolate between two hex colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
