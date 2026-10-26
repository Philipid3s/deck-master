import type { GameState, Officer, SeatId } from '../core/types';
import type { GameApi } from './api';
import { Modal } from './modals';
import {
  SEATS,
  appointOfficer,
  canChangeCouncil,
  ensureCouncil,
  isDelegated,
  relieveOfficer,
  runDelegations,
  seatDef,
  setDelegated,
  temperamentLabel,
} from '../core/council';
import { seatFactor } from '../core/councilEffects';
import { statusColor } from '../core/readiness';
import { DEPARTMENTS } from '../data/specialties';
import { officerPortraitElement, type OfficerSitter } from '../render/portrait';
import { append, bar, button, clear, div, note, span } from './dom';
import { t, tf, tnote } from '../i18n';

/** What the portrait renderer needs from an officer. */
export function officerSitter(o: Officer): OfficerSitter {
  const def = seatDef(o.seat);
  return {
    id: o.id,
    name: o.name,
    rankCode: o.rankCode,
    opinion: o.opinion,
    aviator: def.aviator,
    color: DEPARTMENTS[def.dept].color,
  };
}

export function opinionLabel(opinion: number): string {
  if (opinion >= 50) return 'Loyal';
  if (opinion >= 15) return 'Content';
  if (opinion > -20) return 'Reserved';
  if (opinion > -50) return 'Wary';
  return 'Hostile';
}

/** The standing effect of each seat at full strength, for the readout. */
const EFFECT_SCALE: Record<SeatId, { scale: number; invert?: boolean; unit: string }> = {
  xo: { scale: 15, invert: true, unit: '%' },
  airboss: { scale: 10, unit: '%' },
  cag: { scale: 10, invert: true, unit: '%' },
  ops: { scale: 5, unit: '%' },
  nav: { scale: 11, invert: true, unit: '%' },
  warfare: { scale: 100, unit: '%' },
  cheng: { scale: 20, unit: '%' },
  supply: { scale: 10, invert: true, unit: '%' },
  it: { scale: 3, unit: '%' },
  cmc: { scale: 3, unit: '' },
};

function effectValue(state: GameState, seat: SeatId): { text: string; good: boolean } {
  const f = seatFactor(state, seat);
  const e = EFFECT_SCALE[seat];
  const v = Math.round(f * e.scale * (e.invert ? -1 : 1));
  const good = f >= 0;
  return { text: `${v > 0 ? '+' : ''}${v}${e.unit}`, good };
}

/**
 * The council page: one card per seat with the officer's photograph, what
 * they are good at, how they see the captain, what they bring to the ship,
 * and whether they run their domain on their own. Officers can be replaced
 * from the candidates waiting ashore, but only alongside.
 */
export class CouncilModal {
  private modal = new Modal(true);
  private choosing: SeatId | null = null;

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  get isOpen(): boolean {
    return this.modal.isOpen;
  }

  open(): void {
    this.choosing = null;
    this.modal.open('COMMANDING OFFICER’S COUNCIL');
    this.render();
  }

  render(): void {
    if (!this.modal.isOpen) return;
    const state = this.api.state();
    const council = ensureCouncil(state);
    clear(this.modal.body);
    clear(this.modal.foot);

    append(
      this.modal.body,
      note(
        'You are the commanding officer. Your department heads advise on the decisions in their domain, and any of them can be left to run it — though left alone, an officer misjudges some days, the fewer the better they are. Their opinion of you rises when you take their advice and the ship does well.',
      ),
    );

    if (this.choosing) {
      this.renderCandidates(state, this.choosing);
      return;
    }

    const grid = div('council-grid');
    for (const def of SEATS) {
      const o = council.seats[def.id];
      const card = div(`seat-card${o ? '' : ' vacant'}${isDelegated(state, def.id) ? ' delegated' : ''}`);

      const photo = div('seat-photo');
      if (o) append(photo, officerPortraitElement(officerSitter(o), 2));
      else append(photo, div('seat-vacant', t('VACANT')));
      append(card, photo);

      const info = div('seat-info');
      append(info, div('seat-title', t(def.title)), div('seat-domain', t(def.domain)));
      if (o) {
        append(info, div('seat-name', `${o.rankCode} ${o.name}`));
        const comp = div('attr-row');
        append(
          comp,
          span('attr-label', t('Competence')),
          bar(o.competence, statusColor(o.competence)),
          span('attr-value', String(Math.round(o.competence))),
        );
        const op = div('attr-row');
        append(
          op,
          span('attr-label', t('Opinion of you')),
          bar((o.opinion + 100) / 2, statusColor((o.opinion + 100) / 2)),
          span('attr-value', `${o.opinion > 0 ? '+' : ''}${Math.round(o.opinion)}`),
        );
        append(info, comp, op);
        append(
          info,
          div(
            'seat-traits',
            `${t(temperamentLabel(o.temperament))} · ${t(opinionLabel(o.opinion))} · ${tf('{n} days in post', { n: o.daysInPost })}`,
          ),
        );
      }
      const eff = effectValue(state, def.id);
      append(
        info,
        div(`seat-effect ${eff.good ? 'good' : 'bad'}`, `${t(def.effect)}: ${eff.text}`),
      );
      if (!o) append(info, note('A department without its head drifts. Appoint someone alongside.'));
      append(card, info);

      const actions = div('seat-actions');
      if (o) {
        const on = isDelegated(state, def.id);
        const auto = button(on ? 'RUNNING IT' : 'LET THEM RUN IT', on ? 'primary' : '', () => {
          setDelegated(state, def.id, !on);
          if (!on) {
            const notes = runDelegations(state);
            this.api.toast(
              notes.length > 0
                ? tnote(notes[0]!)
                : tf('{seat} now runs the domain', { seat: def.short }),
            );
          }
          this.api.refresh();
          this.render();
        });
        auto.title = t(def.delegation);
        append(actions, auto);
      }
      const change = button(o ? 'REPLACE' : 'APPOINT', '', () => {
        this.choosing = def.id;
        this.render();
      });
      append(actions, change);
      if (o) {
        append(
          actions,
          button('RELIEVE', 'danger', () => {
            relieveOfficer(state, def.id);
            this.api.toast(tf('{name} relieved of duty', { name: o.name }));
            this.api.refresh();
            this.render();
          }),
        );
      }
      append(card, actions);
      append(card, div('seat-delegation', t(def.delegation)));
      append(grid, card);
    }
    append(this.modal.body, grid);
  }

  private renderCandidates(state: GameState, seat: SeatId): void {
    const council = ensureCouncil(state);
    const def = seatDef(seat);
    const current = council.seats[seat];
    append(this.modal.body, div('section-title', `${t(def.title)} — ${t('CANDIDATES')}`));
    if (!canChangeCouncil(state)) {
      append(this.modal.body, note('Officers can only join or leave the ship alongside. The candidates will be waiting in port.'));
    }
    const list = div('candidate-list');
    const pool = council.candidates.filter((c) => c.seat === seat);
    if (pool.length === 0) append(list, note('No candidates ashore for this seat. More report each time the ship comes alongside.'));
    for (const c of pool) {
      const row = div('candidate');
      append(row, officerPortraitElement(officerSitter(c), 1));
      const info = div('seat-info');
      const better = current ? c.competence - current.competence : c.competence;
      append(
        info,
        div('seat-name', `${c.rankCode} ${c.name}`),
        div(
          'seat-traits',
          `${t('Competence')} ${Math.round(c.competence)}${current ? ` (${better > 0 ? '+' : ''}${Math.round(better)})` : ''} · ${t(temperamentLabel(c.temperament))} · ${t('Opinion of you')} ${c.opinion > 0 ? '+' : ''}${Math.round(c.opinion)}`,
        ),
      );
      append(row, info);
      const appoint = button('APPOINT', 'primary', () => {
        if (appointOfficer(state, c.id)) {
          this.api.toast(tf('{name} takes the seat of {seat}', { name: c.name, seat: t(def.title) }));
          this.choosing = null;
          this.api.refresh();
          this.render();
        }
      });
      appoint.disabled = !canChangeCouncil(state);
      append(row, appoint);
      append(list, row);
    }
    append(this.modal.body, list);
    append(
      this.modal.foot,
      button('BACK TO THE COUNCIL', '', () => {
        this.choosing = null;
        this.render();
      }),
    );
  }
}
