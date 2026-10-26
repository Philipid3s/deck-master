import type { FlightRecord } from '../core/types';
import { aircraftType, DUTIES_BY_ID } from '../data/aircraft';
import { bakedAircraft } from './pixelArt';
import { t } from '../i18n';

/**
 * The day's flying, replayed on the flight deck.
 *
 * Purely presentation, like the crew walking about: it reads the day's
 * flight records and plays them back. Jets taxi onto the two bow catapults
 * in turn, hold at the blast deflector, and go off the bow in a cloud of
 * steam; helicopters lift straight off their spots; then a few aircraft
 * come back up the angled deck and catch a wire — trailing smoke if they
 * came back with a fault written up.
 *
 * Everything is in deck tile units, the same space the deck view draws in.
 */

/** Bow catapult tracks and shuttle start, as painted in `deckArt.ts`. */
const CAT_Y = [5.6, 9.2];
const CAT_X = 121.5;
const BOW_X = 236;
/** The angled deck's landing centreline, as painted in `deckArt.ts`. */
const LAND_A = { x: 6, y: 12.4 };
const LAND_B = { x: 104, y: 4.8 };
/** Where a jet coming up from the hangar appears: the forward elevator. */
const ELEVATOR = { x: 66, y: 13 };

const MAX_LAUNCHES = 10;
const MAX_RECOVERIES = 3;

interface Launch {
  rec: FlightRecord;
  helo: boolean;
  t0: number;
  cat: number;
  from: { x: number; y: number };
  shot: boolean;
}

interface Recovery {
  rec: FlightRecord;
  t0: number;
  trapped: boolean;
}

interface Puff {
  x: number;
  y: number;
  t0: number;
  life: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
}

export interface ShowSounds {
  shot: () => void;
  trap: () => void;
}

const ease = (u: number) => u * u;
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

export class FlightShow {
  time = 0;
  done = false;
  readonly hidden: Set<string>;
  readonly launches: Launch[] = [];
  readonly recoveries: Recovery[] = [];
  /** How many sorties were flown beyond the ones shown. */
  readonly extra: number;
  private puffs: Puff[] = [];
  private readonly end: number;

  constructor(
    readonly flights: FlightRecord[],
    readonly day: number,
    private sounds: ShowSounds,
  ) {
    this.hidden = new Set(flights.map((f) => f.aircraftId));
    const shown = flights.slice(0, MAX_LAUNCHES);
    this.extra = flights.length - shown.length;

    let jetIndex = 0;
    shown.forEach((rec, i) => {
      const helo = aircraftType(rec.typeId).role === 'helo';
      const type = aircraftType(rec.typeId);
      const from =
        rec.deck === 1
          ? { x: rec.x + type.size.w / 2, y: rec.y + type.size.h / 2 }
          : { ...ELEVATOR };
      this.launches.push({ rec, helo, t0: 0.9 + i * 0.55, cat: helo ? -1 : jetIndex++ % 2, from, shot: false });
    });

    const lastLaunch = this.launches.length ? this.launches[this.launches.length - 1]!.t0 + 2 : 0.9;
    // Bring back the ones with a fault first: that is the story of the day.
    const back = [...shown]
      .filter((r) => aircraftType(r.typeId).role !== 'helo')
      .sort((a, b) => Number(b.damaged) - Number(a.damaged))
      .slice(0, MAX_RECOVERIES);
    back.forEach((rec, k) => this.recoveries.push({ rec, t0: lastLaunch + 0.5 + k * 1.0, trapped: false }));

    const lastRecovery = this.recoveries.length
      ? this.recoveries[this.recoveries.length - 1]!.t0 + 2.4
      : lastLaunch;
    this.end = Math.max(lastLaunch, lastRecovery) + 0.4;
  }

  /** Duty counts for the banner, largest first. */
  summary(): { duty: string; n: number }[] {
    const counts = new Map<string, number>();
    for (const f of this.flights) counts.set(f.duty, (counts.get(f.duty) ?? 0) + 1);
    return [...counts.entries()].map(([duty, n]) => ({ duty, n })).sort((a, b) => b.n - a.n);
  }

  update(dt: number): void {
    this.time += dt;
    for (const l of this.launches) {
      if (!l.helo && !l.shot && this.time >= l.t0 + 0.55) {
        l.shot = true;
        if (this.launches.indexOf(l) < 6) this.sounds.shot();
        // Steam from the catapult track.
        for (let i = 0; i < 16; i++) {
          this.puffs.push({
            x: CAT_X + i * 0.9,
            y: CAT_Y[l.cat]! + (Math.random() - 0.5) * 0.8,
            t0: this.time + 0.45 + i * 0.03,
            life: 0.9 + Math.random() * 0.6,
            size: 0.6 + Math.random() * 0.9,
            color: '#e8eef2',
            vx: -0.6 + Math.random() * 0.4,
            vy: (Math.random() - 0.5) * 0.8,
          });
        }
      }
    }
    for (const r of this.recoveries) {
      if (!r.trapped && this.time >= r.t0 + 1.0) {
        r.trapped = true;
        this.sounds.trap();
      }
      // A damaged airframe trails smoke on the way in.
      if (r.rec.damaged && this.time >= r.t0 && this.time <= r.t0 + 1.6 && Math.random() < 0.6) {
        const p = this.recoveryPos(r);
        if (p) {
          this.puffs.push({
            x: p.x - 2,
            y: p.y,
            t0: this.time,
            life: 1.2,
            size: 0.7 + Math.random() * 0.8,
            color: '#5a5f66',
            vx: -1.2,
            vy: (Math.random() - 0.5) * 0.4,
          });
        }
      }
    }
    this.puffs = this.puffs.filter((p) => this.time < p.t0 + p.life);
    if (this.time >= this.end) this.done = true;
  }

  // -----------------------------------------------------------------------
  // Positions
  // -----------------------------------------------------------------------

  private launchPos(l: Launch): { x: number; y: number; alpha: number; lift: number; scale: number } | null {
    const u = this.time - l.t0;
    if (u < 0) return null;
    if (l.helo) {
      // Lift off the spot, hover, then away over the port side.
      if (u > 2.2) return null;
      const lift = clamp01(u / 0.9) * 1.6;
      const away = clamp01((u - 1.2) / 1.0);
      return {
        x: l.from.x + ease(away) * 14,
        y: l.from.y - ease(away) * 20,
        alpha: 1 - clamp01((u - 1.7) / 0.5),
        lift,
        scale: 1 + lift * 0.12,
      };
    }
    const catY = CAT_Y[l.cat]!;
    const stage = { x: CAT_X - 9, y: catY + (l.cat === 0 ? -1.5 : 1.5) };
    if (u < 0.35) {
      // Taxiing in from the spot, directors waving it onto the track.
      const k = easeOut(u / 0.35);
      return { x: stage.x + (CAT_X - stage.x) * k, y: stage.y + (catY - stage.y) * k, alpha: clamp01(u / 0.15), lift: 0, scale: 1 };
    }
    if (u < 1.0) return { x: CAT_X, y: catY, alpha: 1, lift: 0, scale: 1 };
    const k = (u - 1.0) / 0.8;
    if (k > 1) return null;
    const x = CAT_X + (BOW_X - CAT_X) * ease(k);
    // Off the bow it climbs: the shadow falls away behind.
    const lift = Math.max(0, (x - 200) / 12);
    return { x, y: catY, alpha: 1, lift, scale: 1 };
  }

  private recoveryPos(r: Recovery): { x: number; y: number; alpha: number; angle: number } | null {
    const u = this.time - r.t0;
    if (u < 0) return null;
    const dx = LAND_B.x - LAND_A.x;
    const dy = LAND_B.y - LAND_A.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const angle = Math.atan2(dy, dx);
    const touch = len * 0.22;
    let s: number;
    let alpha = 1;
    if (u < 1.1) s = -36 + (touch + 36) * (u / 1.1);
    else if (u < 1.5) s = touch + 5 * easeOut((u - 1.1) / 0.4);
    else if (u < 1.9) s = touch + 5;
    else if (u < 2.4) {
      s = touch + 5;
      alpha = 1 - (u - 1.9) / 0.5;
    } else return null;
    return { x: LAND_A.x + ux * s, y: LAND_A.y + uy * s, alpha, angle };
  }

  // -----------------------------------------------------------------------
  // Drawing
  // -----------------------------------------------------------------------

  /** Draw in deck tile space. `px` is screen pixels per tile, for labels. */
  draw(ctx: CanvasRenderingContext2D, px: number): void {
    const labels: { x: number; y: number; text: string }[] = [];

    for (const p of this.puffs) {
      const a = (this.time - p.t0) / p.life;
      if (a < 0) continue;
      ctx.globalAlpha = (1 - a) * 0.55;
      ctx.fillStyle = p.color;
      const size = p.size * (1 + a * 1.4);
      ctx.fillRect(p.x + p.vx * a - size / 2, p.y + p.vy * a - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    for (const l of this.launches) {
      const pos = this.launchPos(l);
      if (!pos) continue;
      const type = aircraftType(l.rec.typeId);
      const baked = bakedAircraft(l.rec.typeId, false, l.rec.squadron);
      const w = type.size.w * pos.scale;
      const h = type.size.h * pos.scale;
      ctx.globalAlpha = pos.alpha * 0.4;
      ctx.drawImage(baked.shadow, pos.x - w / 2 + 0.3 + pos.lift, pos.y - h / 2 + 0.45 + pos.lift * 0.8, w, h);
      ctx.globalAlpha = pos.alpha;
      // Burner glow while it waits on the catapult and during the stroke.
      if (!l.helo && this.time - l.t0 > 0.4) {
        const flicker = 0.6 + Math.sin(this.time * 40 + l.t0) * 0.25;
        ctx.fillStyle = `rgba(255,170,60,${flicker})`;
        ctx.fillRect(pos.x - w / 2 - 0.9, pos.y - 0.5, 0.9, 1);
        ctx.fillStyle = `rgba(255,240,180,${flicker})`;
        ctx.fillRect(pos.x - w / 2 - 0.5, pos.y - 0.25, 0.5, 0.5);
      }
      ctx.drawImage(baked.sprite, pos.x - w / 2, pos.y - h / 2, w, h);
      // A helicopter's rotor disc, turning.
      if (l.helo) {
        ctx.strokeStyle = 'rgba(200,210,220,0.35)';
        ctx.lineWidth = 0.12;
        const r = w * 0.45;
        const a0 = this.time * 22;
        for (let k = 0; k < 2; k++) {
          const a = a0 + (k * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - Math.cos(a) * r, pos.y - Math.sin(a) * r);
          ctx.lineTo(pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (pos.alpha > 0.5 && pos.x < 206) {
        labels.push({ x: pos.x, y: pos.y - h / 2 - 0.4, text: this.label(l.rec) });
      }
    }

    for (const r of this.recoveries) {
      const pos = this.recoveryPos(r);
      if (!pos) continue;
      const type = aircraftType(r.rec.typeId);
      const baked = bakedAircraft(r.rec.typeId, false, r.rec.squadron);
      const w = type.size.w;
      const h = type.size.h;
      const airborne = this.time - r.t0 < 1.1;
      const lift = airborne ? (1 - (this.time - r.t0) / 1.1) * 2.5 : 0;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.angle);
      ctx.globalAlpha = pos.alpha * 0.4;
      ctx.drawImage(baked.shadow, -w / 2 + 0.3 + lift, -h / 2 + 0.45 + lift * 0.8, w, h);
      ctx.globalAlpha = pos.alpha;
      ctx.drawImage(baked.sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
      if (pos.alpha > 0.5) {
        labels.push({
          x: pos.x,
          y: pos.y - h / 2 - 0.4,
          text: r.rec.damaged ? `${this.label(r.rec)} · ${t('FAULT')}` : this.label(r.rec),
        });
      }
    }

    // Labels in screen space so they stay legible at any zoom.
    if (px < 3) return;
    ctx.save();
    ctx.scale(1 / px, 1 / px);
    ctx.font = `700 ${Math.max(9, Math.min(12, px * 1.3))}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const l of labels) {
      const m = ctx.measureText(l.text);
      const x = l.x * px;
      const y = l.y * px;
      ctx.fillStyle = 'rgba(5,12,23,0.78)';
      ctx.fillRect(x - m.width / 2 - 4, y - 14, m.width + 8, 15);
      ctx.fillStyle = l.text.includes(t('FAULT')) ? '#ff9a8a' : '#f1c506';
      ctx.fillText(l.text, x, y);
    }
    ctx.restore();
  }

  private label(rec: FlightRecord): string {
    return `#${rec.tail} · ${t(DUTIES_BY_ID[rec.duty].short, 'duty')}`;
  }
}
