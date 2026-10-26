import type { Aircraft, CrewMember, FlightRecord, GameState, RoomDef, SpecialtyId } from '../core/types';
import { FlightShow, type ShowSounds } from './flightShow';
import { DECKS, DECK_H, DECK_W, TILE, getDeck, getRoom, workstations } from '../data/decks';
import { SPECIALTIES } from '../data/specialties';
import { aircraftType } from '../data/aircraft';
import { aircraftReadiness, isMissionCapable } from '../core/aircraft';
import { hashString } from '../core/rng';
import { PAL, rgba } from './palette';
import { crewSprite } from './sprites';
import { bakedAircraft } from './pixelArt';
import { deckLayer, oceanTile, type DeckLayer } from './deckArt';
import { t } from '../i18n';

const PASSAGE_MID = 12.8;

export type HitTarget =
  | { kind: 'room'; id: string }
  | { kind: 'crew'; id: string }
  | { kind: 'aircraft'; id: string }
  | null;

interface Actor {
  crewId: string;
  deck: number;
  x: number;
  y: number;
  path: { x: number; y: number; deck?: number }[];
  frame: number;
  frameTimer: number;
  speed: number;
  targetKey: string;
}

/**
 * The carrier view. Real-time movement here is purely presentational
 * (spec section 79) — it reads the authoritative state produced by the
 * daily resolution and animates crew walking toward wherever that state
 * says they belong.
 */
export class DeckView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  deckIndex = 1;
  zoom = 1;
  panX = 0;
  panY = 0;

  hover: HitTarget = null;
  selected: HitTarget = null;
  /** Crew highlighted from the roster; pulses until dismissed. */
  spotlightCrewId: string | null = null;

  private actors = new Map<string, Actor>();
  private lastTime = 0;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;
  private pulse = 0;

  onSelect: ((target: HitTarget) => void) | null = null;
  /** Told when the flight-operations sequence starts and stops. */
  onShowChange: ((running: boolean) => void) | null = null;

  private show: FlightShow | null = null;

  /**
   * Airframes moving between the hangar and the flight deck, animated on the
   * forward elevator: up and taxi to the spot, or taxi to the elevator and
   * down. Detected by watching each airframe's deck, so it plays however
   * the move was made — by the player, the automatic order or the CAG.
   */
  private lastDeck = new Map<string, number>();
  /** Last flight deck position of each airframe, for the way down. */
  private lastSpot = new Map<string, { x: number; y: number }>();
  private lifts: { id: string; up: boolean; t0: number | null; from: { x: number; y: number } | null }[] = [];
  private showDone: (() => void) | null = null;
  private savedCamera: { deck: number; zoom: number; panX: number; panY: number } | null = null;
  onDeckChange: ((deck: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.resize();
    this.fitDeck();
    this.attach();
  }

  setState(state: GameState): void {
    this.state = state;
    this.actors.clear();
    this.lastDeck.clear();
    this.lastSpot.clear();
    this.lifts = [];
  }

  // -------------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------------

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.cssW = Math.max(320, rect.width);
    this.cssH = Math.max(240, rect.height);
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Screen space the decision cards occupy along the bottom of the stage.
   * The deck is framed in what is left, so a card never sits on the ship.
   */
  insetBottom = 0;

  /** Frame the whole deck, the way the concept art presents it. */
  fitDeck(): void {
    const margin = 24;
    const usableH = Math.max(120, this.cssH - this.insetBottom);
    const zx = (this.cssW - margin * 2) / (DECK_W * TILE);
    const zy = (usableH - margin * 2) / (DECK_H * TILE);
    const fit = Math.min(zx, zy * 0.92);
    // Above 1:1, snap to a whole multiple so every art pixel stays square.
    this.zoom = fit >= 1 ? Math.floor(fit) : fit;
    this.panX = (this.cssW - DECK_W * TILE * this.zoom) / 2;
    this.panY = (usableH - DECK_H * TILE * this.zoom) / 2;
  }

  setDeck(index: number): void {
    const clamped = Math.max(1, Math.min(DECKS.length, index));
    if (clamped === this.deckIndex) return;
    this.deckIndex = clamped;
    this.onDeckChange?.(clamped);
  }

  /** Centre the camera on a tile and zoom in enough to read it. */
  focusTile(deck: number, x: number, y: number, zoom = 2.4): void {
    this.setDeck(deck);
    this.zoom = zoom;
    this.panX = this.cssW / 2 - x * TILE * zoom;
    this.panY = Math.max(120, this.cssH - this.insetBottom) / 2 - y * TILE * zoom;
    this.clampPan();
  }

  focusRoom(roomId: string): void {
    const room = getRoom(roomId);
    this.focusTile(
      room.deck,
      room.rect.x + room.rect.w / 2,
      room.rect.y + room.rect.h / 2,
      Math.min(3, Math.max(1.4, 26 / room.rect.w)),
    );
  }

  private clampPan(): void {
    const w = DECK_W * TILE * this.zoom;
    const h = DECK_H * TILE * this.zoom;
    const slackX = Math.max(60, this.cssW * 0.3);
    const slackY = Math.max(40, this.cssH * 0.3);
    this.panX = Math.min(slackX, Math.max(this.cssW - w - slackX, this.panX));
    this.panY = Math.min(slackY, Math.max(this.cssH - h - slackY, this.panY));
    if (w < this.cssW) this.panX = (this.cssW - w) / 2;
    const usableH = Math.max(120, this.cssH - this.insetBottom);
    if (h < usableH) this.panY = (usableH - h) / 2;
  }

  private toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.panX) / (TILE * this.zoom),
      y: (sy - this.panY) / (TILE * this.zoom),
    };
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private attach(): void {
    let dragging = false;
    let dragged = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      dragging = true;
      dragged = false;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    globalThis.addEventListener('mouseup', () => {
      dragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
        this.panX += dx;
        this.panY += dy;
        lastX = e.clientX;
        lastY = e.clientY;
        this.clampPan();
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      this.hover = this.hitTest(sx, sy);
      this.canvas.style.cursor = this.hover ? 'pointer' : 'grab';
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.show) {
        this.skipShow();
        return;
      }
      if (dragged) return;
      const rect = this.canvas.getBoundingClientRect();
      const target = this.hitTest(e.clientX - rect.left, e.clientY - rect.top);
      this.selected = target;
      this.onSelect?.(target);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hover = null;
    });

    // Wheel zooms toward the cursor; shift+wheel changes deck.
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (e.shiftKey) {
          this.setDeck(this.deckIndex + (e.deltaY > 0 ? 1 : -1));
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const before = this.toWorld(sx, sy);
        this.zoom = nextZoom(this.zoom, e.deltaY > 0 ? -1 : 1);
        const after = this.toWorld(sx, sy);
        this.panX += (after.x - before.x) * TILE * this.zoom;
        this.panY += (after.y - before.y) * TILE * this.zoom;
        this.clampPan();
      },
      { passive: false },
    );
  }

  hitTest(sx: number, sy: number): HitTarget {
    const w = this.toWorld(sx, sy);
    const deck = getDeck(this.deckIndex);

    // Crew take priority — they are the smallest targets.
    let best: { id: string; d: number } | null = null;
    for (const [crewId, actor] of this.actors) {
      if (actor.deck !== this.deckIndex) continue;
      const d = Math.hypot(actor.x - w.x, actor.y + 0.4 - w.y);
      if (d < 1.1 && (!best || d < best.d)) best = { id: crewId, d };
    }
    if (best) return { kind: 'crew', id: best.id };

    // Then aircraft.
    for (const a of this.state.aircraft) {
      if (a.deck !== this.deckIndex) continue;
      const type = aircraftType(a.typeId);
      if (
        w.x >= a.x &&
        w.x <= a.x + type.size.w &&
        w.y >= a.y &&
        w.y <= a.y + type.size.h
      ) {
        return { kind: 'aircraft', id: a.id };
      }
    }

    // Then rooms.
    for (const room of deck.rooms) {
      const r = room.rect;
      if (w.x >= r.x && w.x < r.x + r.w && w.y >= r.y && w.y < r.y + r.h) {
        return { kind: 'room', id: room.id };
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Actors — visual crew movement
  // -------------------------------------------------------------------------

  /** Where this crew member physically belongs right now. */
  private targetRoomId(crew: CrewMember): string {
    if (crew.health === 'injured' || crew.health === 'sick' || crew.health === 'hospitalized') {
      return 'd3-medical';
    }
    if (crew.status === 'leave') return crew.berthRoomId;
    if (crew.status === 'training') return 'd3-training';
    if (crew.status === 'resting') return crew.berthRoomId;
    return crew.assignmentRoomId;
  }

  /** A stable spot inside a room, so a person always returns to their station. */
  private stationFor(crew: CrewMember, room: RoomDef): { x: number; y: number } {
    const stations = workstations(room);
    if (stations.length === 0) {
      return { x: room.rect.x + room.rect.w / 2, y: room.rect.y + room.rect.h / 2 };
    }
    const idx = hashString(crew.id + room.id) % stations.length;
    const s = stations[idx]!;
    return { x: s.x + 0.5, y: s.y + 0.5 };
  }

  /**
   * Route from a point to a room via the central passageway, which is how
   * the ship is actually laid out. Three legs: out to the passage, along it,
   * then into the destination.
   */
  private buildPath(
    from: { x: number; y: number },
    room: RoomDef,
    station: { x: number; y: number },
  ): { x: number; y: number }[] {
    const inRoom =
      from.x >= room.rect.x &&
      from.x <= room.rect.x + room.rect.w &&
      from.y >= room.rect.y &&
      from.y <= room.rect.y + room.rect.h;
    if (inRoom) return [station];

    const doorX = Math.max(
      room.rect.x + 1.5,
      Math.min(room.rect.x + room.rect.w - 1.5, station.x),
    );
    return [
      { x: from.x, y: PASSAGE_MID },
      { x: doorX, y: PASSAGE_MID },
      { x: doorX, y: station.y },
      station,
    ];
  }

  /** Nearest vertical trunk on this deck, for changing decks. */
  private nearestTrunkX(deckIndex: number, x: number): number {
    const deck = getDeck(deckIndex);
    const trunks = deck.rooms.filter((r) => r.kind === 'elevator' || r.kind === 'stairs');
    let bestX = x;
    let bestD = Infinity;
    for (const t of trunks) {
      const tx = t.rect.x + t.rect.w / 2;
      const d = Math.abs(tx - x);
      if (d < bestD) {
        bestD = d;
        bestX = tx;
      }
    }
    return bestX;
  }

  private updateActors(dt: number): void {
    for (const crew of this.state.crew) {
      let actor = this.actors.get(crew.id);
      const roomId = this.targetRoomId(crew);
      const room = getRoom(roomId);
      const station = this.stationFor(crew, room);
      const targetKey = `${roomId}|${crew.status}|${crew.health}`;

      if (!actor) {
        actor = {
          crewId: crew.id,
          deck: crew.loc.deck,
          x: crew.loc.x + 0.5,
          y: crew.loc.y + 0.5,
          path: [],
          frame: 0,
          frameTimer: 0,
          // Speed varies a little per person so crowds do not march in lockstep.
          speed: 2.0 + (hashString(crew.id) % 100) / 90,
          targetKey: '',
        };
        this.actors.set(crew.id, actor);
      }

      if (actor.targetKey !== targetKey) {
        actor.targetKey = targetKey;
        if (actor.deck !== room.deck) {
          // Walk to a trunk, change deck there, then continue on the new deck.
          const trunkX = this.nearestTrunkX(actor.deck, actor.x);
          actor.path = [
            { x: actor.x, y: PASSAGE_MID },
            { x: trunkX, y: PASSAGE_MID },
            { x: trunkX, y: PASSAGE_MID, deck: room.deck },
            ...this.buildPath({ x: trunkX, y: PASSAGE_MID }, room, station),
          ];
        } else {
          actor.path = this.buildPath(actor, room, station);
        }
      }

      // Advance along the path.
      if (actor.path.length > 0) {
        const next = actor.path[0]!;
        if (next.deck !== undefined && next.deck !== actor.deck) {
          actor.deck = next.deck;
          actor.path.shift();
          continue;
        }
        const dx = next.x - actor.x;
        const dy = next.y - actor.y;
        const dist = Math.hypot(dx, dy);
        const step = actor.speed * dt;
        if (dist <= step || dist < 0.01) {
          actor.x = next.x;
          actor.y = next.y;
          actor.path.shift();
        } else {
          actor.x += (dx / dist) * step;
          actor.y += (dy / dist) * step;
          actor.frameTimer += dt;
          if (actor.frameTimer > 0.18) {
            actor.frameTimer = 0;
            actor.frame = (actor.frame + 1) % 2;
          }
        }
        // Keep the authoritative record in step with where they ended up.
        crew.loc.deck = actor.deck;
        crew.loc.x = Math.round(actor.x - 0.5);
        crew.loc.y = Math.round(actor.y - 0.5);
      } else {
        // Idle shuffle so working spaces never look frozen.
        const wobble = Math.sin(this.pulse * 1.4 + hashString(crew.id) % 10) * 0.03;
        actor.y = station.y + wobble;
        actor.frame = 0;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  frame(time: number): void {
    const dt = this.lastTime === 0 ? 0.016 : Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.pulse += dt;
    this.updateActors(dt);
    if (this.show) {
      this.show.update(dt);
      if (this.show.done) this.endShow();
    }
    this.watchLifts();
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    ctx.translate(this.panX, this.panY);
    ctx.scale(TILE * this.zoom, TILE * this.zoom);

    const flight = this.deckIndex === 1;
    if (flight) {
      // The flight deck is the outside of the ship: it sits on the sea.
      this.drawSea(ctx);
    } else if (this.zoom < 1.3) {
      // Interior decks are a cutaway. The decks immediately above and below
      // are ghosted, so the vertical stack stays part of how the ship reads.
      this.drawGhostDeck(ctx, this.deckIndex - 1, -(DECK_H + 5));
      this.drawGhostDeck(ctx, this.deckIndex + 1, DECK_H + 5);
    }

    const deck = getDeck(this.deckIndex);
    const layer = deckLayer(deck);

    // Under the hull: a soft drop shadow so the deck lifts off the page.
    ctx.fillStyle = flight ? 'rgba(0,8,16,0.55)' : PAL.hullShadow;
    for (const row of deck.hull) {
      ctx.fillRect(row.x0 + 0.3, row.y + 0.45, row.x1 - row.x0 + 1, 1);
    }

    // Scaling pixel art down drops pixels and sparkles; smooth only then.
    ctx.imageSmoothingEnabled = this.zoom < 1;
    ctx.drawImage(layer.canvas, 0, 0, DECK_W, DECK_H);
    ctx.imageSmoothingEnabled = false;

    for (const room of deck.rooms) this.drawRoomState(ctx, room);
    this.drawLights(ctx, layer);

    this.drawAircraft(ctx);
    this.drawActors(ctx);
    this.drawRadars(ctx, layer);
    if (this.deckIndex === 1) this.drawLifts(ctx);
    if (this.show && this.deckIndex === 1) {
      this.show.draw(ctx, TILE * this.zoom);
    } else {
      for (const room of deck.rooms) this.drawRoomLabel(ctx, room);
      this.drawHighlights(ctx, deck.rooms);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // The elevator
  // -------------------------------------------------------------------------

  private watchLifts(): void {
    for (const a of this.state.aircraft) {
      const before = this.lastDeck.get(a.id);
      if (before !== undefined && before !== a.deck && (before === 1 || a.deck === 1)) {
        this.lifts = this.lifts.filter((l) => l.id !== a.id);
        // The clock starts when the flight deck is on screen to see it.
        this.lifts.push({ id: a.id, up: a.deck === 1, t0: null, from: this.lastSpot.get(a.id) ?? null });
      }
      this.lastDeck.set(a.id, a.deck);
      if (a.deck === 1) {
        const type = aircraftType(a.typeId);
        this.lastSpot.set(a.id, { x: a.x + type.size.w / 2, y: a.y + type.size.h / 2 });
      }
    }
  }

  private drawLifts(ctx: CanvasRenderingContext2D): void {
    if (this.lifts.length === 0) return;
    const elev = { x: 66, y: 13 };
    const RISE = 1.1;
    const TAXI = 1.0;
    // One at a time on the one elevator, in the order they were sent.
    const current = this.lifts[0]!;
    if (current.t0 === null) current.t0 = this.pulse;
    const u = this.pulse - current.t0;
    const a = this.state.aircraft.find((x) => x.id === current.id);
    if (!a || u > RISE + TAXI + 0.1) {
      this.lifts.shift();
      return;
    }
    const type = aircraftType(a.typeId);
    const w = type.size.w;
    const h = type.size.h;
    // Where it is going (up) or coming from (down): its flight deck spot.
    const spot = current.up
      ? { x: a.x + w / 2, y: a.y + h / 2 }
      : (current.from ?? { x: elev.x - 12, y: 20 });
    const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

    // Phase order: up = rise then taxi; down = taxi then sink.
    let x = elev.x;
    let y = elev.y;
    let rise = 1;
    if (current.up) {
      if (u < RISE) rise = u / RISE;
      else {
        const k = ease(Math.min(1, (u - RISE) / TAXI));
        x = elev.x + (spot.x - elev.x) * k;
        y = elev.y + (spot.y - elev.y) * k;
      }
    } else if (u < TAXI) {
      const k = ease(u / TAXI);
      x = spot.x + (elev.x - spot.x) * k;
      y = spot.y + (elev.y - spot.y) * k;
    } else {
      rise = 1 - Math.min(1, (u - TAXI) / RISE);
    }

    // The well opens while the platform is down, and the hazard lights run.
    const onLift = rise < 1 || (current.up ? u < RISE : u > TAXI);
    if (onLift) {
      ctx.fillStyle = `rgba(0,0,0,${0.65 * (1 - rise)})`;
      ctx.fillRect(62.25, 10.25, 7.5, 5.5);
      const blink = Math.floor(this.pulse * 6) % 2 === 0;
      ctx.fillStyle = blink ? '#f1c506' : '#6a5410';
      for (const [lx, ly] of [[62.3, 10.3], [69.4, 10.3], [62.3, 15.4], [69.4, 15.4]] as const) {
        ctx.fillRect(lx, ly, 0.35, 0.35);
      }
    }

    // Folded below, spreading the wings as it comes up into the light.
    const baked = bakedAircraft(a.typeId, rise < 0.6, a.squadron);
    const scale = 0.72 + 0.28 * rise;
    const dw = w * scale;
    const dh = h * scale;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * rise;
    ctx.drawImage(baked.shadow, x - dw / 2 + 0.3 * rise, y - dh / 2 + 0.45 * rise, dw, dh);
    ctx.globalAlpha = 1;
    ctx.filter = rise < 1 ? `brightness(${0.45 + 0.55 * rise})` : 'none';
    ctx.drawImage(baked.sprite, x - dw / 2, y - dh / 2, dw, dh);
    ctx.filter = 'none';
    ctx.restore();

    // Label: what it is and why it is coming up.
    const px = TILE * this.zoom;
    if (px >= 3) {
      const text = `#${a.tail} · ${current.up ? t(a.duty === 'alert' ? 'TO DECK ALERT' : 'UP FROM THE HANGAR') : t('DOWN TO THE HANGAR')}`;
      ctx.save();
      ctx.scale(1 / px, 1 / px);
      ctx.font = `700 ${Math.max(9, Math.min(12, px * 1.3))}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const m = ctx.measureText(text);
      const lx = x * px;
      const ly = (y - dh / 2 - 0.4) * px;
      ctx.fillStyle = 'rgba(5,12,23,0.78)';
      ctx.fillRect(lx - m.width / 2 - 4, ly - 14, m.width + 8, 15);
      ctx.fillStyle = '#f1c506';
      ctx.fillText(text, lx, ly);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Flight operations sequence
  // -------------------------------------------------------------------------

  get showRunning(): boolean {
    return this.show !== null;
  }

  /**
   * Replay the day's flying on the flight deck, then call `onDone`. The
   * camera moves to the flight deck for the sequence and returns after.
   */
  playFlightShow(flights: FlightRecord[], day: number, sounds: ShowSounds, onDone: () => void): void {
    if (flights.length === 0) {
      onDone();
      return;
    }
    this.savedCamera = { deck: this.deckIndex, zoom: this.zoom, panX: this.panX, panY: this.panY };
    this.selected = null;
    this.hover = null;
    this.setDeck(1);
    const inset = this.insetBottom;
    this.insetBottom = 0;
    this.fitDeck();
    this.insetBottom = inset;
    this.show = new FlightShow(flights, day, sounds);
    this.showDone = onDone;
    this.onShowChange?.(true);
  }

  currentShow(): FlightShow | null {
    return this.show;
  }

  skipShow(): void {
    if (this.show) this.endShow();
  }

  private endShow(): void {
    this.show = null;
    const cam = this.savedCamera;
    if (cam) {
      this.setDeck(cam.deck);
      this.zoom = cam.zoom;
      this.panX = cam.panX;
      this.panY = cam.panY;
    }
    this.savedCamera = null;
    this.onShowChange?.(false);
    const done = this.showDone;
    this.showDone = null;
    done?.();
  }

  /** Visible world rectangle, in tiles. */
  private viewRect(): { x0: number; y0: number; x1: number; y1: number } {
    const a = this.toWorld(0, 0);
    const b = this.toWorld(this.cssW, this.cssH);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
  }

  /**
   * Open water around the flight deck. At sea the swell scrolls aft and the
   * ship leaves a wake; alongside, the water is still and there is a pier.
   */
  private drawSea(ctx: CanvasRenderingContext2D): void {
    const v = this.viewRect();
    const tile = oceanTile();
    const tw = tile.width / TILE;
    const th = tile.height / TILE;
    const underway = this.state.status !== 'port';
    const drift = (this.pulse * (underway ? 5 : 0.6)) % tw;
    const startX = Math.floor((v.x0 + drift) / tw) * tw - drift;
    const startY = Math.floor(v.y0 / th) * th;
    for (let y = startY; y < v.y1; y += th) {
      for (let x = startX; x < v.x1; x += tw) {
        ctx.drawImage(tile, x, y, tw, th);
      }
    }

    const mid = DECK_H / 2;
    if (underway) {
      // Wake: churned water astern, spreading and thinning with distance.
      const frame = Math.floor(this.pulse * 6);
      for (let x = 1.5; x > Math.max(v.x0, -90); x -= 0.5) {
        const dist = 1.5 - x;
        const spread = 2.5 + dist * 0.09;
        for (let y = -spread; y <= spread; y += 0.5) {
          const edge = Math.abs(y) / spread;
          const h = hashString(`${Math.round(x * 2)}|${Math.round(y * 2)}|${frame}`) % 100;
          const chance = (1 - dist / 95) * (edge > 0.8 ? 70 : 38 - edge * 20);
          if (h < chance) {
            ctx.fillStyle = h < chance * 0.4 ? '#c7dbe6' : '#6f9db8';
            ctx.fillRect(x, mid + y, 0.5, 0.5);
          }
        }
      }
      // Bow wave peeling off both sides.
      for (let i = 0; i < 26; i++) {
        const h = hashString(`bow${i}|${frame}`) % 100;
        const x = DECK_W - 4 - i * 0.9;
        const off = 2 + i * 0.42;
        if (h < 70 - i * 2) {
          ctx.fillStyle = '#c7dbe6';
          ctx.fillRect(x, mid - off - 0.5 - (h % 3) * 0.25, 0.5, 0.5);
          ctx.fillRect(x, mid + off + (h % 3) * 0.25, 0.5, 0.5);
        }
      }
    } else {
      this.drawPier(ctx);
    }
  }

  private drawPier(ctx: CanvasRenderingContext2D): void {
    const top = DECK_H + 1.5;
    const v = this.viewRect();
    const x0 = Math.min(-40, v.x0);
    const x1 = Math.max(DECK_W + 40, v.x1);
    ctx.fillStyle = '#56595c';
    ctx.fillRect(x0, top, x1 - x0, 14);
    ctx.fillStyle = '#7d8083';
    ctx.fillRect(x0, top, x1 - x0, 0.5);
    ctx.fillStyle = '#3b3e41';
    ctx.fillRect(x0, top + 0.5, x1 - x0, 0.25);
    ctx.fillStyle = '#4d5053';
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) ctx.fillRect(x, top + 0.75, 0.125, 13);
    // Painted safety line along the quay edge.
    ctx.fillStyle = '#b89a2a';
    ctx.fillRect(x0, top + 1.5, x1 - x0, 0.25);
    // Bollards and mooring lines.
    for (let x = 14; x < DECK_W - 14; x += 26) {
      ctx.strokeStyle = '#1b1d1f';
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(x + 4, DECK_H - 1.2);
      ctx.lineTo(x, top + 1);
      ctx.stroke();
      ctx.fillStyle = '#25282b';
      ctx.fillRect(x - 0.625, top + 0.625, 1.25, 1.25);
      ctx.fillStyle = '#4a4e52';
      ctx.fillRect(x - 0.625, top + 0.625, 1.25, 0.375);
    }
    // Brows (gangways) to the quay.
    ctx.fillStyle = '#8a8f94';
    for (const x of [60, 140]) ctx.fillRect(x, DECK_H - 0.5, 2.5, 2.5);
  }

  /** A dimmed silhouette of a neighbouring deck, offset vertically. */
  private drawGhostDeck(ctx: CanvasRenderingContext2D, index: number, offsetY: number): void {
    if (index < 1 || index > DECKS.length) return;
    const deck = getDeck(index);

    ctx.save();
    ctx.translate(0, offsetY);
    ctx.globalAlpha = 0.22;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(deckLayer(deck).canvas, 0, 0, DECK_W, DECK_H);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;

    // Deck label past the bow, clear of the caption in the top-left.
    const px = TILE * this.zoom;
    if (px > 3) {
      const mid = deck.hull[Math.floor(deck.hull.length / 2)]!;
      ctx.save();
      ctx.scale(1 / px, 1 / px);
      ctx.globalAlpha = 0.6;
      ctx.font = `700 ${Math.max(8, Math.min(12, px * 1.5))}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = PAL.textDim;
      ctx.fillText(
        `DECK ${String(index).padStart(2, '0')}  ${t(deck.short)}`,
        (mid.x1 + 3) * px,
        (DECK_H / 2) * px,
      );
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * State drawn over the static art: a busy space warms up, a space in poor
   * condition goes red. The art underneath never changes.
   */
  private drawRoomState(ctx: CanvasRenderingContext2D, room: RoomDef): void {
    if (room.kind === 'elevator' || room.kind === 'stairs' || room.kind === 'flight') return;
    if (this.deckIndex === 1) return;
    const rs = this.state.rooms[room.id];
    if (!rs) return;
    const r = room.rect;
    if (rs.condition < 55) {
      const a = ((55 - rs.condition) / 55) * 0.4;
      ctx.fillStyle = rgba(PAL.alert, a);
      ctx.fillRect(r.x + 0.25, r.y + 0.25, r.w - 0.5, r.h - 0.5);
    } else if (rs.activity > 25) {
      ctx.fillStyle = rgba('#f1c506', Math.min(0.08, rs.activity / 1200));
      ctx.fillRect(r.x + 0.25, r.y + 0.25, r.w - 0.5, r.h - 0.5);
    }
  }

  /** Console lamps, LEDs and deck lights, each on its own slow blink. */
  private drawLights(ctx: CanvasRenderingContext2D, layer: DeckLayer): void {
    const k = 1 / TILE;
    for (const l of layer.lights) {
      const on = Math.sin(this.pulse * 2.4 * l.rate + l.phase);
      if (on < 0.2) continue;
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x * k, l.y * k, k, k);
      if (on > 0.85 && this.zoom >= 1.5) {
        ctx.fillStyle = rgba(l.color, 0.25);
        ctx.fillRect((l.x - 1) * k, (l.y - 1) * k, 3 * k, 3 * k);
      }
    }
  }

  /** Rotating search radars on the island and the sensor mast. */
  private drawRadars(ctx: CanvasRenderingContext2D, layer: DeckLayer): void {
    const k = 1 / TILE;
    layer.radars.forEach((r, i) => {
      const a = this.pulse * (1.1 + i * 0.4) + i;
      const cx = r.x * k;
      const cy = r.y * k;
      const dx = Math.cos(a) * r.r * k;
      const dy = Math.sin(a) * r.r * k * 0.55;
      ctx.strokeStyle = '#151a20';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
      ctx.strokeStyle = '#b4bcc4';
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
      ctx.fillStyle = '#2b3138';
      ctx.fillRect(cx - 1.5 * k, cy - 1.5 * k, 3 * k, 3 * k);
    });
  }

  private drawRoomLabel(ctx: CanvasRenderingContext2D, room: RoomDef): void {
    if (room.kind === 'elevator' || room.kind === 'stairs') return;
    // On the flight deck the paint does the talking; names appear on demand.
    if (this.deckIndex === 1) {
      const focused =
        (this.hover?.kind === 'room' && this.hover.id === room.id) ||
        (this.selected?.kind === 'room' && this.selected.id === room.id);
      if (!focused) return;
    }
    const px = TILE * this.zoom;
    if (px < 5) return;
    const fontPx = Math.max(7, Math.min(11, px * 1.05));
    ctx.save();
    ctx.scale(1 / px, 1 / px);
    ctx.font = `600 ${fontPx}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    const label = t(room.short);
    const metrics = ctx.measureText(label);
    const lx = Math.round((room.rect.x + 0.6) * px);
    const ly = Math.round((room.rect.y + 0.7) * px);
    if (metrics.width < (room.rect.w - 1) * px) {
      ctx.fillStyle = rgba(PAL.bg, 0.72);
      ctx.fillRect(lx - 3, ly - 2, metrics.width + 6, fontPx + 4);
      ctx.fillStyle = PAL.textBright;
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }

  private drawAircraft(ctx: CanvasRenderingContext2D): void {
    for (const a of this.state.aircraft) {
      if (a.deck !== this.deckIndex) continue;
      if (this.show?.hidden.has(a.id)) continue;
      if (this.deckIndex === 1 && this.lifts.some((l) => l.id === a.id && l.up)) continue;
      const type = aircraftType(a.typeId);
      // Wings folded below decks, spread on the flight deck.
      const folded = a.deck === 2;
      const baked = bakedAircraft(a.typeId, folded, a.squadron);
      const w = type.size.w;
      const h = type.size.h;

      ctx.save();
      ctx.imageSmoothingEnabled = this.zoom < 1;
      ctx.globalAlpha = 0.4;
      ctx.drawImage(baked.shadow, a.x + 0.3, a.y + 0.45, w, h);
      ctx.globalAlpha = 1;
      ctx.drawImage(baked.sprite, a.x, a.y, w, h);
      ctx.imageSmoothingEnabled = false;

      // Status chip: green ready, amber in maintenance, red damaged.
      const ready = isMissionCapable(a);
      const chip = a.state === 'damaged'
        ? PAL.alert
        : a.state === 'maintenance'
          ? PAL.repairing
          : ready
            ? PAL.working
            : PAL.idle;
      ctx.fillStyle = '#11161c';
      ctx.fillRect(a.x + w - 1.0, a.y + 0.125, 0.75, 0.75);
      ctx.fillStyle = chip;
      ctx.fillRect(a.x + w - 0.875, a.y + 0.25, 0.5, 0.5);

      // An aircraft in the shops gets a pulsing frame. A frame rather than a
      // wash over the airframe: the wash hid the sprite it was marking.
      if (a.state === 'maintenance' || a.state === 'damaged') {
        const alpha = 0.4 + Math.sin(this.pulse * 4) * 0.3;
        ctx.strokeStyle = rgba(a.state === 'damaged' ? PAL.alert : PAL.repairing, alpha);
        ctx.lineWidth = 0.125;
        ctx.setLineDash([0.5, 0.375]);
        ctx.strokeRect(a.x + 0.1, a.y + 0.1, w - 0.2, h - 0.2);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  private drawActors(ctx: CanvasRenderingContext2D): void {
    const px = Math.max(2, TILE * this.zoom);
    const onFlightDeck = this.deckIndex === 1;
    for (const crew of this.state.crew) {
      const actor = this.actors.get(crew.id);
      if (!actor || actor.deck !== this.deckIndex) continue;

      // On the flight deck everyone wears their trade's jersey and cranial,
      // as on the real ship; below decks the vest shows what they are doing.
      const spec = SPECIALTIES[crew.primary];
      const jersey = onFlightDeck ? deckJersey(crew.primary) : null;
      const frames = crewSprite(jersey ?? spec.color, jersey ?? statusVest(crew));
      const sprite = frames[actor.frame] ?? frames[0]!;

      const w = sprite.width / TILE;
      const h = sprite.height / TILE;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(actor.x - w / 2 + 1 / TILE, actor.y - 1 / TILE, w, 2 / TILE);
      ctx.drawImage(sprite, actor.x - w / 2, actor.y - h, w, h);

      // Spotlighted crew get a ring so the roster jump lands visibly.
      if (this.spotlightCrewId === crew.id) {
        const r = 1.1 + Math.sin(this.pulse * 5) * 0.22;
        ctx.strokeStyle = PAL.elevator;
        ctx.lineWidth = 0.18;
        ctx.beginPath();
        ctx.arc(actor.x, actor.y - h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Injured crew carry a red mark.
      if (crew.health !== 'healthy' && px > 4) {
        ctx.fillStyle = PAL.alert;
        ctx.fillRect(actor.x + 0.3, actor.y - h - 0.35, 0.4, 0.4);
      }
      ctx.restore();
    }
  }

  private drawHighlights(ctx: CanvasRenderingContext2D, rooms: RoomDef[]): void {
    const outline = (id: string, color: string, width: number) => {
      const room = rooms.find((r) => r.id === id);
      if (!room) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.strokeRect(room.rect.x, room.rect.y, room.rect.w, room.rect.h);
    };

    if (this.hover?.kind === 'room') outline(this.hover.id, rgba(PAL.textBright, 0.75), 0.22);
    if (this.selected?.kind === 'room') outline(this.selected.id, PAL.elevator, 0.28);

    // Alert markers on rooms in poor condition.
    for (const room of rooms) {
      const rs = this.state.rooms[room.id];
      if (!rs || rs.condition >= 45) continue;
      const alpha = 0.45 + Math.sin(this.pulse * 3.5) * 0.3;
      ctx.strokeStyle = rgba(PAL.alert, alpha);
      ctx.lineWidth = 0.22;
      ctx.strokeRect(room.rect.x, room.rect.y, room.rect.w, room.rect.h);
    }

    // Selected aircraft.
    if (this.selected?.kind === 'aircraft') {
      const a = this.state.aircraft.find((x) => x.id === this.selected!.id);
      if (a && a.deck === this.deckIndex) {
        const type = aircraftType(a.typeId);
        ctx.strokeStyle = PAL.elevator;
        ctx.lineWidth = 0.22;
        ctx.strokeRect(a.x, a.y, type.size.w, type.size.h);
      }
    }
  }

  /** Screen position of a crew member, for anchoring tooltips. */
  actorScreenPos(crewId: string): { x: number; y: number } | null {
    const actor = this.actors.get(crewId);
    if (!actor || actor.deck !== this.deckIndex) return null;
    return {
      x: this.panX + actor.x * TILE * this.zoom,
      y: this.panY + actor.y * TILE * this.zoom,
    };
  }
}

/**
 * Zoom steps. Whole numbers keep the pixel art crisp; the fractional steps
 * below 1 are for taking in the whole ship, where smoothing takes over.
 */
const ZOOM_STEPS = [0.45, 0.6, 0.75, 1, 1.5, 2, 3, 4, 5];

function nextZoom(current: number, dir: 1 | -1): number {
  if (dir > 0) return ZOOM_STEPS.find((z) => z > current + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]!;
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01) ?? ZOOM_STEPS[0]!;
}

/**
 * Flight deck jerseys, by trade: the colour code every carrier uses so a
 * director can tell at a glance who does what in the noise.
 */
function deckJersey(specialty: SpecialtyId): string {
  switch (specialty) {
    case 'handling':
      return '#e2c23a'; // yellow: aircraft directors
    case 'tractor':
      return '#3d6fd1'; // blue: handlers, tractor drivers
    case 'weapons':
    case 'damagecontrol':
      return '#c0392b'; // red: ordnance, crash and salvage
    case 'supply':
      return '#7b4fa8'; // purple: aviation fuel
    case 'aircrew':
      return '#7a5230'; // brown: plane captains
    case 'pilot':
      return '#6b6a3e'; // flight suits
    case 'medic':
    case 'aircontrol':
    case 'comms':
    case 'radar':
      return '#e8e8e8'; // white: safety, medical, LSOs
    default:
      return '#4f9a3c'; // green: catapult, arresting gear, maintenance
  }
}

/** Vest colour encodes what the person is doing, per the status legend. */
function statusVest(crew: CrewMember): string {
  if (crew.health !== 'healthy') return PAL.alert;
  switch (crew.status) {
    case 'training':
      return PAL.training;
    case 'resting':
    case 'leave':
      return PAL.idle;
    case 'emergency':
      return PAL.alert;
    case 'mentoring':
      return PAL.support;
    default:
      return PAL.working;
  }
}

export function aircraftTint(a: Aircraft): string {
  const r = aircraftReadiness(a);
  if (a.state === 'damaged') return PAL.alert;
  if (r >= 80) return PAL.working;
  if (r >= 55) return PAL.repairing;
  return PAL.alert;
}
