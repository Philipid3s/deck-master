import type { GameState } from '../core/types';
import type { DeckView } from '../render/deckView';
import { append, button, clear, div } from './dom';
import { t, tf } from '../i18n';

/**
 * The first ten minutes, guided.
 *
 * A short run of coach marks over the real game — nothing is simulated or
 * scripted. Each step points at the thing to use and waits until the player
 * has actually used it: inspected an aircraft, gone below, answered the
 * day's decisions, taken an operation, set the tasking, ended the day. The
 * player learns the loop by playing the first day of the deployment.
 *
 * Shown once per browser; skippable at every step.
 */

const STORAGE_KEY = 'deckmaster.tutorial';

export interface TutorialHost {
  state(): GameState;
  view(): DeckView;
  taskingOpen(): boolean;
}

interface Step {
  title: string;
  body: string;
  /** What to point at. Null centres the card with no highlight. */
  target: () => Element | null;
  /** Completed by playing, or by the NEXT button when undefined. */
  done?: () => boolean;
}

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // Without storage the tutorial may show again next time; harmless.
  }
}

export class Tutorial {
  private readonly card: HTMLDivElement;
  private readonly ring: HTMLDivElement;
  private steps: Step[];
  private index = 0;
  private active = false;
  private taskingWasOpened = false;

  constructor(private host: TutorialHost) {
    this.card = div('tut-card hidden');
    this.ring = div('tut-ring hidden');
    document.body.append(this.ring, this.card);

    const q = (sel: string) => () => document.querySelector(sel);
    const navButton = (label: string) => () =>
      [...document.querySelectorAll('.bottombar button')].find(
        (b) => b.textContent?.trim() === t(label),
      ) ?? null;

    this.steps = [
      {
        title: 'WELCOME ABOARD, CAPTAIN',
        body:
          'You command the USS Resolute for a thirty-day deployment. Your orders: complete two operations successfully. One turn is one day, and nothing moves until you end it, so take your time.',
        target: () => null,
      },
      {
        title: 'THE SHIP IS THE INTERFACE',
        body:
          'This is the flight deck. Click an aircraft to inspect it: its systems, its fuel, and who flies it.',
        target: q('#deck-canvas'),
        done: () => this.host.view().selected?.kind === 'aircraft',
      },
      {
        title: 'GO BELOW',
        body:
          'Press 2, or click deck 02 in the overview, to go down to the hangar. Wings fold below decks, and the shops there keep the air wing flying.',
        target: q('#minimap-canvas'),
        done: () => this.host.view().deckIndex === 2,
      },
      {
        title: 'THE DAY’S DECISIONS',
        body:
          'Every day brings decisions, and none is free: each choice trades something you want for something else you want. Answer today’s.',
        target: q('.event-stack'),
        done: () => this.host.state().pendingEvents.length === 0,
      },
      {
        title: 'TAKE AN OPERATION',
        body:
          'Open MISSIONS (M) and accept an operation. Work-ups are the gentlest start. The ship sails at once, and nothing can be brought aboard at sea.',
        target: navButton('MISSIONS'),
        done: () => this.host.state().mission !== null,
      },
      {
        title: 'THE AIR TASKING ORDER',
        body:
          'Open TASKING (A). Each airframe holds one duty, and only the duties the operation rewards make progress. AUTO-ASSIGN lays on a workable order; close the panel when you are happy with it.',
        target: navButton('TASKING'),
        done: () => {
          if (this.host.taskingOpen()) this.taskingWasOpened = true;
          return this.taskingWasOpened && !this.host.taskingOpen();
        },
      },
      {
        title: 'END THE DAY',
        body:
          'Press END DAY. The ship resolves the day and reports back, including why readiness moved. Tired crews make mistakes: the WATCH BILL in the sidebar sets how each department rotates its people through rest.',
        target: q('.topbar .btn.primary'),
        done: () => this.host.state().day >= 2,
      },
      {
        title: 'YOUR ORDERS',
        body:
          'Your orders are always here. Two successful operations win the deployment; morale, readiness and prestige on the last day earn the stars. Good hunting, Captain.',
        target: () => document.querySelector('.panel-body .objective')?.closest('.panel') ?? null,
      },
    ];
  }

  get isActive(): boolean {
    return this.active;
  }

  start(): void {
    this.active = true;
    this.index = 0;
    this.taskingWasOpened = false;
    this.render();
  }

  private finish(): void {
    this.active = false;
    markSeen();
    this.card.classList.add('hidden');
    this.ring.classList.add('hidden');
  }

  private advance(): void {
    this.index++;
    if (this.index >= this.steps.length) this.finish();
    else this.render();
  }

  /** Re-renders the card text, e.g. after a language change. */
  render(): void {
    if (!this.active) return;
    const step = this.steps[this.index]!;
    clear(this.card);
    append(
      this.card,
      div('tut-step', tf('STEP {n} OF {total}', { n: this.index + 1, total: this.steps.length })),
      div('tut-title', t(step.title)),
      div('tut-body', t(step.body)),
    );
    const row = div('tut-actions');
    append(row, button('SKIP TUTORIAL', '', () => this.finish()));
    if (!step.done) {
      append(
        row,
        button(this.index === this.steps.length - 1 ? 'FINISH' : 'NEXT', 'primary', () => this.advance()),
      );
    } else {
      append(row, div('tut-wait', t('Waiting for you…')));
    }
    append(this.card, row);
  }

  /** Called every frame: checks the step, and keeps the card on its target. */
  tick(): void {
    if (!this.active) return;
    const step = this.steps[this.index]!;
    if (step.done?.()) {
      this.advance();
      return;
    }

    // Stand aside while a modal is up: the player is doing what was asked.
    const modalOpen =
      document.querySelector('.overlay:not(.hidden)') !== null || this.host.view().showRunning;
    this.card.classList.toggle('hidden', modalOpen);
    const target = step.target();
    this.ring.classList.toggle('hidden', modalOpen || !target);
    if (modalOpen) return;

    const vw = globalThis.innerWidth;
    const vh = globalThis.innerHeight;
    const cw = this.card.offsetWidth || 340;
    const ch = this.card.offsetHeight || 160;

    if (!target) {
      this.card.style.left = `${(vw - cw) / 2}px`;
      this.card.style.top = `${Math.max(80, vh * 0.28)}px`;
      return;
    }

    const r = target.getBoundingClientRect();
    this.ring.style.left = `${r.left - 4}px`;
    this.ring.style.top = `${r.top - 4}px`;
    this.ring.style.width = `${r.width + 8}px`;
    this.ring.style.height = `${r.height + 8}px`;

    // A large target (the deck) gets the card inside its top; otherwise the
    // card sits beside the target, on whichever side has room.
    let left: number;
    let top: number;
    if (r.width > vw * 0.5 && r.height > vh * 0.4) {
      left = r.left + (r.width - cw) / 2;
      top = r.top + 70;
    } else if (r.left > vw * 0.6) {
      left = r.left - cw - 16;
      top = r.top;
    } else if (r.bottom + ch + 16 < vh) {
      left = r.left;
      top = r.bottom + 14;
    } else {
      left = r.left;
      top = r.top - ch - 14;
    }
    this.card.style.left = `${Math.max(12, Math.min(vw - cw - 12, left))}px`;
    this.card.style.top = `${Math.max(12, Math.min(vh - ch - 12, top))}px`;
  }
}
