import type { GameState } from '../core/types';
import { computeAlerts, type AlertAction } from '../core/alerts';
import { eventDef } from '../data/events';
import { append, clear, div, span } from './dom';
import { t, tf, tnote } from '../i18n';

/**
 * The alerts menu at the top of the carrier view: one button with a count,
 * coloured by the worst thing waiting, that drops down the full list. Every
 * pending decision is listed on its own; every line is clickable and takes
 * the captain straight to where it is decided or fixed.
 */
export class AlertDropdown {
  readonly root: HTMLDivElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly list: HTMLDivElement;
  private open = false;

  constructor(
    private state: () => GameState,
    private onAction: (a: AlertAction) => void,
  ) {
    this.root = div('alert-menu');
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'alert-toggle';
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setOpen(!this.open);
    });
    this.list = div('alert-list hidden');
    this.list.addEventListener('click', (e) => e.stopPropagation());
    append(this.root, this.toggleBtn, this.list);
    document.addEventListener('click', () => this.setOpen(false));
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.list.classList.toggle('hidden', !open);
    this.render();
  }

  render(): void {
    const s = this.state();
    const alerts = computeAlerts(s).filter((a) => a.id !== 'decisions');
    const decisions = s.pendingEvents;
    const total = alerts.length + decisions.length;
    const urgent =
      alerts.some((a) => a.level === 'urgent') ||
      decisions.some((p) => p.category === 'emergency' || p.category === 'medical' || (eventDef(p.defId)?.priority ?? 0) >= 2);
    const worst = urgent ? 'urgent' : total > 0 ? 'warn' : 'info';

    clear(this.toggleBtn);
    this.toggleBtn.className = `alert-toggle lvl-${worst}`;
    append(
      this.toggleBtn,
      span('at-icon', urgent ? '!' : total > 0 ? '⚑' : '✓'),
      span('at-label', total > 0 ? tf('{n} TO ATTEND TO', { n: total }) : t('ALL QUIET')),
      span('at-caret', this.open ? '▴' : '▾'),
    );
    this.toggleBtn.title = t('Decisions and alerts — click to see the list');

    if (!this.open) return;
    clear(this.list);

    append(this.list, div('al-section', tf('DECISIONS ({n})', { n: decisions.length })));
    if (decisions.length === 0) append(this.list, div('al-empty', t('No decision waiting.')));
    decisions.forEach((p, index) => {
      const emergency = p.category === 'emergency' || p.category === 'medical' || (eventDef(p.defId)?.priority ?? 0) >= 2;
      const row = this.row(
        emergency ? 'urgent' : 'warn',
        '!',
        t(p.title),
        `${t(p.category.toUpperCase(), 'category')}${p.subjectName ? ` · ${p.subjectName}` : ''}`,
      );
      row.addEventListener('click', () => {
        this.setOpen(false);
        this.onAction({ kind: 'event', index });
      });
      append(this.list, row);
    });

    append(this.list, div('al-section', tf('ALERTS ({n})', { n: alerts.length })));
    if (alerts.length === 0) append(this.list, div('al-empty', t('Nothing else needs you. The ship is running.')));
    for (const a of alerts) {
      const row = this.row(a.level, a.icon, t(a.title), tnote(a.detail), a.count);
      row.addEventListener('click', () => {
        this.setOpen(false);
        this.onAction(a.action);
      });
      append(this.list, row);
    }
  }

  private row(level: string, icon: string, title: string, detail: string, count?: number): HTMLButtonElement {
    const row = document.createElement('button');
    row.className = `al-row lvl-${level}`;
    const text = div('al-text');
    append(text, div('al-title', title), div('al-detail', detail));
    append(row, span('al-icon', icon), text);
    if (count && count > 1) append(row, span('al-count', String(count)));
    append(row, span('al-go', '›'));
    return row;
  }
}

/**
 * The journal: the ship's log of notifications and decisions, day by day,
 * newest first. Opened from the top bar, where a badge counts what has
 * arrived since it was last read.
 */
export class JournalPanel {
  readonly button: HTMLButtonElement;
  readonly root: HTMLDivElement;
  private badge: HTMLSpanElement;
  private seenDay = 0;
  private open = false;

  constructor(private state: () => GameState) {
    this.button = document.createElement('button');
    this.button.className = 'btn journal-btn';
    this.badge = span('journal-badge', '');
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.root = div('journal-panel hidden');
    this.root.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      if (this.open) this.toggle(false);
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.classList.toggle('hidden', !this.open);
    if (this.open) {
      this.seenDay = this.state().day;
      this.render();
    }
    this.renderButton();
  }

  /** The top-bar button and its unread badge. */
  renderButton(): void {
    const s = this.state();
    const unread = (s.journal ?? []).filter((e) => e.day >= this.seenDay && e.day < s.day).length;
    clear(this.button);
    append(this.button, document.createTextNode(t('JOURNAL')));
    if (unread > 0 && !this.open) {
      this.badge.textContent = String(unread);
      append(this.button, this.badge);
    }
    this.button.title = t('The ship’s log: every notification and decision, day by day');
  }

  render(): void {
    this.renderButton();
    if (!this.open) return;
    const s = this.state();
    clear(this.root);

    append(this.root, div('jp-title', t('SHIP’S LOG')));
    const log = div('jp-log');
    const journal = s.journal ?? [];
    if (journal.length === 0) append(log, div('jp-empty', t('The log fills as the days pass.')));
    let lastDay = -1;
    for (const entry of journal.slice(0, 120)) {
      if (entry.day !== lastDay) {
        append(log, div('jp-day', tf('Day {n}', { n: entry.day })));
        lastDay = entry.day;
      }
      const bad = /injur|critical|below|error|set back|damaged|Unresolved|FAILURE|relieved/i.test(entry.note.key);
      const good = /SUCCESS|completed|accepted|Alongside|banked|restocked/i.test(entry.note.key);
      append(log, div(`jp-entry${bad ? ' bad' : good ? ' good' : ''}`, tnote(entry.note)));
    }
    append(this.root, log);
  }
}
