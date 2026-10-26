import type { GameApi } from './api';
import { adviceFor, seatDef } from '../core/council';
import { officerPortraitElement } from '../render/portrait';
import { officerSitter } from './councilModal';
import { portraitElement } from '../render/portrait';
import { eventDef } from '../data/events';
import { append, clear, div, span } from './dom';
import { t, tf, tnote } from '../i18n';
import { rank } from '../data/ranks';

const EMERGENCY_CATEGORIES = new Set(['emergency', 'medical']);

/**
 * Event cards sit in a row under the carrier view rather than replacing it,
 * so the ship stays visible while the player decides (spec section 51).
 */
export class EventCards {
  /**
   * The body text, with every mention of the subject's name turned into a
   * link to their personnel file.
   */
  private fillBody(host: HTMLElement, text: string, name: string, crewId: string | null): void {
    if (!crewId || !name || !text.includes(name)) {
      host.textContent = text;
      return;
    }
    const parts = text.split(name);
    parts.forEach((part, i) => {
      if (part) host.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        const link = document.createElement('button');
        link.className = 'ec-link';
        link.textContent = name;
        link.title = t('Open their personnel file before you decide');
        link.addEventListener('click', () => this.api.focusCrew(crewId));
        host.appendChild(link);
      }
    });
  }

  readonly root: HTMLDivElement;
  private collapsed = false;

  constructor(private api: GameApi) {
    this.root = div('event-stack');
  }

  /** Unfold the stack, e.g. when an alert points at it. */
  expand(): void {
    this.collapsed = false;
    this.render();
    this.root.classList.remove('flash');
    void this.root.offsetWidth;
    this.root.classList.add('flash');
  }

  /** Unfold the stack and bring one decision forward. */
  focus(index: number): void {
    this.collapsed = false;
    this.render();
    const card = this.root.querySelector<HTMLElement>(`.event-card[data-index="${index}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    card.classList.remove('focused');
    void card.offsetWidth;
    card.classList.add('focused');
  }

  render(): void {
    clear(this.root);
    const state = this.api.state();
    if (state.pendingEvents.length === 0) return;

    // A header that folds the stack away — the carrier must always be
    // inspectable, even on a three-event day (spec section 51).
    const header = document.createElement('button');
    header.className = 'ec-toggle';
    const n = state.pendingEvents.length;
    header.textContent = this.collapsed
      ? `▲  ${n === 1 ? t('1 DECISION PENDING') : tf('{n} DECISIONS PENDING', { n })}`
      : `▼  ${n === 1 ? t('HIDE 1 DECISION') : tf('HIDE {n} DECISIONS', { n })}`;
    header.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.api.refresh();
    });
    this.root.appendChild(header);

    if (this.collapsed) return;

    const row = div('ec-row');
    this.root.appendChild(row);
    state.pendingEvents.forEach((pending, index) => {
      const def = eventDef(pending.defId);
      if (!def) return;

      const isEmergency =
        EMERGENCY_CATEGORIES.has(pending.category) || (def.priority ?? 0) >= 2;

      const card = div(`event-card${isEmergency ? ' emergency' : ''}`);
      card.dataset.index = String(index);

      const head = div('ec-head');
      append(
        head,
        span('ec-cat', t(pending.category.toUpperCase(), 'category')),
        div('ec-title', t(pending.title)),
      );
      // The person the decision is about, one click from their file: their
      // record, fatigue, morale and post are what the choice should rest on.
      const subject = pending.subjectId
        ? state.crew.find((c) => c.id === pending.subjectId)
        : undefined;
      if (subject) {
        const file = document.createElement('button');
        file.className = 'ec-subject';
        file.append(
          portraitElement(subject, 1, 'portrait portrait-row'),
          document.createTextNode(`${rank(subject.rank).code} ${subject.name} — ${t('VIEW FILE')}`),
        );
        file.title = t('Open their personnel file before you decide');
        file.addEventListener('click', () => this.api.focusCrew(subject.id));
        append(head, file);
      }

      const body = div('ec-body');
      this.fillBody(body, tnote(pending.body), pending.subjectName, pending.subjectId);

      // What the council says: each adviser's pick, in their own words.
      const advice = adviceFor(state, index);
      let adviceBlock: HTMLDivElement | null = null;
      if (advice.length > 0) {
        adviceBlock = div('ec-advice');
        for (const a of advice) {
          const o = state.council?.seats[a.seat];
          const pickLabel = def.choices[a.choiceIndex]?.label;
          if (!o || !pickLabel) continue;
          const row = div('adv-row');
          const who = officerPortraitElement(officerSitter(o), 1, 'portrait adv-portrait');
          who.title = `${o.rankCode} ${o.name}`;
          who.addEventListener('click', () => this.api.openCouncil());
          const text = div('adv-text');
          append(
            text,
            div('adv-who', `${seatDef(a.seat).short} — ${o.rankCode} ${o.name}`),
            div('adv-say', `${t('Recommends')} « ${t(pickLabel)} ». ${t(a.reason)}`),
          );
          append(row, who, text);
          append(adviceBlock, row);
        }
      }

      const choices = div('ec-choices');
      def.choices.forEach((choice, choiceIndex) => {
        const b = document.createElement('button');
        b.className = 'choice';
        const label = span('cl', t(choice.label));
        for (const a of advice.filter((x) => x.choiceIndex === choiceIndex)) {
          label.appendChild(span('adv-tag', seatDef(a.seat).short));
        }
        b.appendChild(label);
        if (choice.hint) b.appendChild(span('ch', t(choice.hint)));
        b.addEventListener('click', () => this.api.answerEvent(index, choiceIndex));
        choices.appendChild(b);
      });

      append(card, head, body, adviceBlock, choices);
      append(row, card);
    });
  }
}
