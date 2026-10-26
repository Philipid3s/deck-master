import type { GameState } from '../core/types';
import { DECKS } from '../data/decks';
import { PAL, DEPT_ACCENT, rgba } from './palette';

/**
 * The CARRIER OVERVIEW panel from the concept art: every deck as a small
 * silhouette, the current one picked out in amber, alerts in red. It is
 * always visible and doubles as the deck navigator (spec section 14).
 */
export class MiniMap {
  private ctx: CanvasRenderingContext2D;
  private rowRects: { deck: number; x: number; y: number; w: number; h: number }[] = [];
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;
  private pulse = 0;
  private hoverDeck: number | null = null;

  onSelect: ((deck: number) => void) | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private state: GameState,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const x = e.clientX - rect.left;
      const row = this.rowRects.find(
        (r) => y >= r.y && y <= r.y + r.h && x >= r.x - 22 && x <= r.x + r.w,
      );
      this.hoverDeck = row?.deck ?? null;
      canvas.style.cursor = row ? 'pointer' : 'default';
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const row = this.rowRects.find((r) => y >= r.y - 2 && y <= r.y + r.h + 2);
      if (row) this.onSelect?.(row.deck);
    });

    canvas.addEventListener('mouseleave', () => {
      this.hoverDeck = null;
    });
  }

  setState(state: GameState): void {
    this.state = state;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.cssW = Math.max(180, rect.width);
    this.cssH = Math.max(140, rect.height);
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Worst room condition on a deck decides its status colour. */
  private deckStatus(deckIndex: number): 'normal' | 'warning' | 'alert' {
    const deck = DECKS.find((d) => d.index === deckIndex)!;
    let worst = 100;
    for (const room of deck.rooms) {
      const rs = this.state.rooms[room.id];
      if (rs && rs.condition < worst) worst = rs.condition;
    }
    const injured = this.state.crew.filter(
      (c) => c.health !== 'healthy' && c.loc.deck === deckIndex,
    ).length;
    if (worst < 40 || injured >= 3) return 'alert';
    if (worst < 62 || injured >= 1) return 'warning';
    return 'normal';
  }

  frame(currentDeck: number, dt: number): void {
    this.pulse += dt;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.imageSmoothingEnabled = false;

    const labelW = 26;
    const padTop = 10;
    const rowGap = 4;
    const rows = DECKS.length;
    const availH = this.cssH - padTop - 8;
    const rowH = Math.max(8, Math.floor((availH - rowGap * (rows - 1)) / rows));
    const shipW = this.cssW - labelW - 10;

    this.rowRects = [];

    for (let i = 0; i < rows; i++) {
      const deck = DECKS[i]!;
      const y = padTop + i * (rowH + rowGap);
      const isCurrent = deck.index === currentDeck;
      const isHover = this.hoverDeck === deck.index;
      const status = this.deckStatus(deck.index);

      this.rowRects.push({ deck: deck.index, x: labelW, y, w: shipW, h: rowH });

      // Deck number
      ctx.font = `600 ${Math.min(11, rowH - 1)}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isCurrent ? PAL.elevator : isHover ? PAL.textBright : PAL.textDim;
      ctx.fillText(String(deck.index).padStart(2, '0'), 4, y + rowH / 2);

      // Hull silhouette, squeezed into the row.
      const maxX = Math.max(...deck.hull.map((r) => r.x1));
      const scaleX = shipW / (maxX + 2);
      const scaleY = rowH / deck.h;

      ctx.save();
      ctx.translate(labelW, y);

      // Hull body
      const hullColor = isCurrent
        ? rgba(PAL.elevator, 0.22)
        : status === 'alert'
          ? rgba(PAL.alert, 0.2)
          : rgba(PAL.frame, 0.16);
      ctx.fillStyle = hullColor;
      for (const row of deck.hull) {
        ctx.fillRect(row.x0 * scaleX, row.y * scaleY, (row.x1 - row.x0 + 1) * scaleX, scaleY + 0.5);
      }

      // Room blocks, coloured by department like the legend.
      for (const room of deck.rooms) {
        if (room.kind === 'elevator' || room.kind === 'stairs') continue;
        const rs = this.state.rooms[room.id];
        const accent = DEPT_ACCENT[room.department] ?? PAL.frame;
        const bad = rs && rs.condition < 50;
        ctx.fillStyle = bad
          ? rgba(PAL.alert, 0.75)
          : rgba(accent, isCurrent ? 0.8 : 0.45);
        ctx.fillRect(
          room.rect.x * scaleX,
          room.rect.y * scaleY,
          Math.max(1, room.rect.w * scaleX - 0.5),
          Math.max(1, room.rect.h * scaleY - 0.5),
        );
      }

      // Vertical trunks in their legend colours.
      for (const room of deck.rooms) {
        if (room.kind !== 'elevator' && room.kind !== 'stairs') continue;
        ctx.fillStyle = room.kind === 'elevator' ? PAL.elevator : PAL.stairs;
        ctx.fillRect(
          room.rect.x * scaleX,
          room.rect.y * scaleY,
          Math.max(1, room.rect.w * scaleX - 0.5),
          Math.max(1, room.rect.h * scaleY),
        );
      }

      // Outline: amber for current, red pulse for an alert deck.
      if (isCurrent) {
        ctx.strokeStyle = PAL.elevator;
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, shipW - 1, rowH - 1);
      } else if (status === 'alert') {
        const a = 0.4 + Math.sin(this.pulse * 4) * 0.3;
        ctx.strokeStyle = rgba(PAL.alert, a);
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, shipW - 1, rowH - 1);
      } else if (isHover) {
        ctx.strokeStyle = rgba(PAL.textBright, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, shipW - 1, rowH - 1);
      }

      ctx.restore();

      // Status dot on the right edge.
      const dot = status === 'alert' ? PAL.alert : status === 'warning' ? PAL.repairing : PAL.working;
      ctx.fillStyle = dot;
      ctx.fillRect(this.cssW - 6, y + rowH / 2 - 1.5, 3, 3);
    }

    ctx.restore();
  }
}
