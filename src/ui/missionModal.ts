import { mechanicRows, mechanicSummary } from './operationsView';
import type { GameApi } from './api';
import { missionDef } from '../data/missions';
import { checkRequirements, OUTCOME_LABELS, successProbability } from '../core/missions';
import { prestigeTier } from '../core/economy';
import { STATUS_LABELS, isInPort, missionTotalDays } from '../core/status';
import {
  append,
  bar,
  button,
  clear,
  div,
  formatCredits,
  note,
  noteRaw,
  pill,
  sectionTitle,
  span,
  statRow,
} from './dom';
import { t, tf, tnote } from '../i18n';
import { Modal } from './modal';

// ===========================================================================
// Mission board (spec sections 41-44)
// ===========================================================================

export class MissionModal {
  private modal = new Modal(true);

  constructor(private api: GameApi, private onAccept: (id: string) => void) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  close(): void {
    this.modal.close();
  }

  open(): void {
    this.modal.open('MISSION BOARD');
    this.render();
  }

  render(): void {
    const state = this.api.state();
    clear(this.modal.body);
    clear(this.modal.foot);

    if (state.mission) {
      const def = missionDef(state.mission.defId);
      append(this.modal.body, sectionTitle('ACTIVE MISSION'));
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(def.title)), span('stars', '★'.repeat(def.difficulty)));
      append(card, ct, div('desc', t(def.description)));

      const progressRow = div('attr-row');
      append(
        progressRow,
        span('attr-label', 'Progress'),
        bar(state.mission.progress),
        span('attr-value', `${Math.round(state.mission.progress)}`),
      );
      append(card, progressRow);
      append(
        card,
        statRow('Carrier status', t(STATUS_LABELS[state.status], 'carrierstatus')),
        statRow('Days on station', `${state.mission.daysElapsed} / ${def.days}`),
        statRow(
          'Accumulated risk',
          `+${Math.round(state.mission.riskModifier)}`,
          state.mission.riskModifier > 20 ? 'bad' : state.mission.riskModifier > 0 ? 'warn' : 'good',
        ),
        ...mechanicRows(state),
      );

      append(card, sectionTitle('OBJECTIVES'));
      for (const o of def.objectives) append(card, noteRaw(`· ${t(o)}`));

      if (state.mission.log.length > 0) {
        append(card, sectionTitle('MISSION LOG'));
        const list = div('list');
        for (const entry of state.mission.log.slice(-8).reverse()) {
          const row = div('row');
          append(
            row,
            span('name', tnote(entry.note)),
            span('meta', tf('Day {n}', { n: entry.day })),
          );
          append(list, row);
        }
        append(card, list);
      }
      append(this.modal.body, card);
      append(this.modal.foot, note('A new mission can be accepted once this one resolves.'));
      return;
    }

    append(this.modal.body, sectionTitle('AVAILABLE OPERATIONS'));
    const inPort = isInPort(state);
    if (!inPort) {
      const banner = div('at-sea-banner');
      banner.textContent = t(
        'The ship is at sea. A new mission can only be accepted once it is alongside.',
      );
      append(this.modal.body, banner);
    }
    const tier = prestigeTier(state.prestige);
    append(
      this.modal.body,
      noteRaw(
        tf('Standing: {tier} ({n} prestige) — {unlocks}', {
          tier: t(tier.name),
          n: state.prestige,
          unlocks: t(tier.unlocks),
        }),
      ),
    );

    const cards = div('cards');
    for (const id of state.missionOffers) {
      const def = missionDef(id);
      const checks = checkRequirements(state, def);
      const unmet = checks.filter((c) => !c.met);
      const prob = successProbability(state, def);

      const card = div('card selectable');
      const ct = div('ct');
      append(
        ct,
        span('n', t(def.title)),
        pill(t(def.category.toUpperCase(), 'missioncat')),
        span('stars', '★'.repeat(def.difficulty) + '☆'.repeat(5 - def.difficulty)),
      );
      append(card, ct, div('desc', t(def.description)), mechanicSummary(def));

      // Requirements
      const reqs = div('reqs');
      for (const c of checks) {
        const r = div(`req ${c.met ? 'met' : 'unmet'}`);
        append(
          r,
          span('rl', t(c.label)),
          span('rv', `${Math.round(c.actual)} / ${c.required}`),
        );
        append(reqs, r);
      }
      append(card, reqs);

      if (def.recommended.length > 0) {
        append(
          card,
          noteRaw(
            tf('Recommended: {list}', { list: def.recommended.map((x) => t(x)).join(' · ') }),
          ),
        );
      }

      const rewards = div('rewards');
      const mk = (label: string, value: string) => {
        const d = div();
        d.appendChild(document.createTextNode(`${t(label)} `));
        const b = document.createElement('b');
        b.textContent = value;
        d.appendChild(b);
        return d;
      };
      append(
        rewards,
        mk('On station', tf('{n} days', { n: def.days })),
        mk('Passage', tf('{n} days each way', { n: def.transitDays })),
        mk('Total', tf('{n} days', { n: missionTotalDays(def.id) })),
        mk('Credits', formatCredits(def.rewardCredits)),
        mk('Prestige', `+${def.rewardPrestige}`),
        mk('Est. success', `${Math.round(prob * 100)}%`),
      );
      append(card, rewards);

      if (unmet.length > 0) {
        append(
          card,
          noteRaw(
            unmet.length === 1
              ? t(
                  '1 requirement unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.',
                )
              : tf(
                  '{n} requirements unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.',
                  { n: unmet.length },
                ),
          ),
        );
      }

      const actions = div('btn-row');
      const accept = button('ACCEPT MISSION', unmet.length === 0 ? 'primary' : 'danger', () => {
        this.onAccept(def.id);
        this.modal.close();
      });
      accept.disabled = !inPort;
      append(actions, accept);
      append(card, actions);
      if (!inPort) {
        append(card, note('A mission can only be accepted alongside in port.'));
      }
      append(cards, card);
    }
    append(this.modal.body, cards);

    if (state.missionHistory.length > 0) {
      append(this.modal.body, sectionTitle('MISSION HISTORY'));
      const list = div('list');
      for (const h of state.missionHistory.slice(0, 12)) {
        const row = div('row');
        const good = h.outcome === 'outstanding' || h.outcome === 'success';
        append(
          row,
          span('name', t(h.title)),
          span(
            'meta',
            `${t(OUTCOME_LABELS[h.outcome])} · ${good ? '+' : ''}${h.prestige} ${t('prestige')} · ${tf('Day {n}', { n: h.endedDay })}`,
          ),
        );
        append(list, row);
      }
      append(this.modal.body, list);
    }
  }
}
