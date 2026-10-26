/**
 * Seeded, stream-based randomness (spec section 80).
 *
 * Every random draw in the simulation is derived from
 *   campaign_seed + current_day + a named stream + a sequence number,
 * so a campaign replays identically given the same seed and the same
 * player decisions. Nothing in the core simulation may call Math.random().
 */

/** FNV-1a over a string — cheap, stable, and platform independent. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough distribution for gameplay. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed: number | string) {
    this.next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed >>> 0);
  }

  /** Deterministic sub-stream: same parent seed + label always yields the same stream. */
  static stream(campaignSeed: number, day: number, label: string): Rng {
    return new Rng(hashString(`${campaignSeed}|${day}|${label}`));
  }

  /** [0,1) */
  float(): number {
    return this.next();
  }

  /** [min,max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min,max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty array');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Weighted pick. Items with weight <= 0 are never selected. */
  pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    let total = 0;
    for (const it of items) {
      const w = weightOf(it);
      if (w > 0) total += w;
    }
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const it of items) {
      const w = weightOf(it);
      if (w <= 0) continue;
      roll -= w;
      if (roll <= 0) return it;
    }
    return items[items.length - 1]!;
  }

  shuffle<T>(items: T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }

  /** Roughly normal via sum of three uniforms, clamped to +/-1 range then scaled. */
  gaussian(mean: number, stdev: number): number {
    const u = (this.next() + this.next() + this.next()) / 3;
    return mean + (u - 0.5) * 3.4641 * stdev;
  }

  /** Normally distributed integer, clamped into [min,max]. */
  statRoll(mean: number, stdev: number, min = 1, max = 100): number {
    return Math.max(min, Math.min(max, Math.round(this.gaussian(mean, stdev))));
  }
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01to100(v: number): number {
  return clamp(v, 0, 100);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
