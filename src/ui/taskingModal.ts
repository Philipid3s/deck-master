import type { Aircraft, AircraftDuty, GameState } from '../core/types';
import { mechanicHint } from './operationsView';
import type { GameApi } from './api';
import { Modal } from './modal';
import { DUTIES, DUTIES_BY_ID, aircraftType, typeSuitability } from '../data/aircraft';
import { missionDef } from '../data/missions';
import { aircraftReadiness, aircraftStatusText, isMissionCapable, limitingSystem } from '../core/aircraft';
import {
  ALERT_PROBLEM_LABELS,
  alertBoard,
  autoAssign,
  computeTasking,
  keyAssets,
  setDuty,
  trainOnPassage,
} from '../core/tasking';
import { PREP_CAP, PREP_PER_SORTIE } from '../core/simulation';
import {
  crewFactor,
  isCrewed,
  isFitToFly,
  seatCount,
  seatOccupant,
  wingCrewReadiness,
} from '../core/aircrew';
import { rank } from '../data/ranks';

import { shortName } from '../data/names';
import { append, bar, button, clear, div, note, noteRaw, sectionTitle, span, statRow } from './dom';
import { t, tf, tnote } from '../i18n';

/**
 * The daily air tasking order (ATO).
 *
 * This is where the turn's central decision is made: which airframes fly
 * what today. Mission progress is computed from this, so the panel shows the
 * contribution each line makes against what the mission actually needs.
 */
export class TaskingModal {
  private modal = new Modal(true);
  private sortBy: 'tail' | 'type' | 'readiness' | 'duty' = 'duty';

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  get isOpen(): boolean {
    return this.modal.isOpen;
  }

  open(): void {
    this.modal.open('AIR TASKING ORDER');
    this.render();
  }

  close(): void {
    this.modal.close();
  }

  render(): void {
    if (!this.modal.isOpen) return;
    const state = this.api.state();
    clear(this.modal.body);
    clear(this.modal.foot);

    this.renderSummary(state);
    this.renderDutyBoard(state);
    this.renderAircraftTable(state);

    const actions = div('btn-row');
    // On the passage out the choice is rehearse or rest, so it gets its
    // own button next to the automatic order.
    if (state.status === 'outbound' && state.mission) {
      append(
        actions,
        button('WORK-UPS ON PASSAGE', 'primary', () => {
          const n = trainOnPassage(state);
          this.api.toast(tf('{n} airframes tasked to work-up training', { n }));
          this.api.refresh();
          this.render();
        }),
      );
    }
    append(
      actions,
      button('AUTO-ASSIGN', state.status === 'outbound' ? '' : 'primary', () => {
        autoAssign(state);
        this.api.refresh();
        this.render();
      }),
      button('AUTO-CREW', '', () => {
        this.api.autoCrewWing();
        this.render();
      }),
      button('ALL ON ALERT', '', () => {
        for (const a of state.aircraft) {
          setDuty(state, a.id, isMissionCapable(a) ? 'alert' : 'maintenance');
        }
        this.api.refresh();
        this.render();
      }),
      button('STAND DOWN THE WING', '', () => {
        for (const a of state.aircraft) setDuty(state, a.id, 'standdown');
        this.api.refresh();
        this.render();
      }),
    );
    append(this.modal.foot, actions);
  }

  // -----------------------------------------------------------------------

  private renderSummary(state: GameState): void {
    const tasking = computeTasking(state);
    const def = state.mission ? missionDef(state.mission.defId) : null;

    append(this.modal.body, sectionTitle('TODAY’S TASKING'));

    // What the operation's own mechanic asks for today.
    const hint = mechanicHint(state);
    if (hint) {
      const banner = div('passage-banner mech-banner');
      append(banner, div('pb-title', t('TODAY’S OPERATION')), div('pb-body', hint));
      append(this.modal.body, banner);
    }

    // On passage nothing counts toward the objective; say so, and say what
    // the passage is for instead.
    if (def && (state.status === 'outbound' || state.status === 'inbound')) {
      const banner = div('passage-banner');
      if (state.status === 'outbound') {
        const banked = state.mission?.prep ?? 0;
        const key = keyAssets(state);
        const spare =
          key.duty && key.ids.size > 0
            ? div(
                'pb-body',
                tf('Rest the airframes {title} depends on for {duty}: {list}. WORK-UPS ON PASSAGE leaves them out.', {
                  title: t(def.title),
                  duty: t(DUTIES_BY_ID[key.duty].name),
                  list: state.aircraft
                    .filter((a) => key.ids.has(a.id))
                    .map((a) => `#${a.tail}`)
                    .join(', '),
                }),
              )
            : null;
        append(
          banner,
          div('pb-title', t('ON PASSAGE — REHEARSE OR REST')),
          div(
            'pb-body',
            tf(
              'Sorties do not count toward the objective until the ship is on station. Training sorties rehearse the operation: each banks {per} progress for arrival, up to {cap} ({banked} banked so far). Stood-down crews and airframes recover instead.',
              { per: PREP_PER_SORTIE, cap: PREP_CAP, banked: Math.round(banked * 10) / 10 },
            ),
          ),
          spare,
        );
      } else {
        append(
          banner,
          div('pb-title', t('ON PASSAGE HOME')),
          div(
            'pb-body',
            t('The operation is over. Stand the wing down and let the ship recover before it comes alongside.'),
          ),
        );
      }
      append(this.modal.body, banner);
    }

    if (!def) {
      append(
        this.modal.body,
        note(
          'No mission is active, so nothing the wing flies today advances an objective. Aircraft on alert stay ready; aircraft in the shops get fixed.',
        ),
      );
    } else {
      const pct = Math.round(tasking.ratio * 100);
      const row = div('attr-row');
      append(
        row,
        span('attr-label', t('OBJECTIVE COVER')),
        bar(Math.min(100, pct)),
        span('attr-value', `${pct}%`),
      );
      append(this.modal.body, row);
      append(
        this.modal.body,
        statRow('Operation', t(def.title)),
        statRow(
          'Sortie contribution',
          `${tasking.contribution.toFixed(1)} / ${tasking.required}`,
          tasking.ratio >= 1 ? 'good' : tasking.ratio >= 0.6 ? 'warn' : 'bad',
        ),
        statRow(
          'Deck capacity',
          `${tasking.flyable} ${t('tasked')} / ${tasking.sortieCapacity} ${t('can launch')}`,
          tasking.capacityLimited ? 'bad' : 'good',
        ),
        // How the squadrons themselves are holding up. A wing flown flat out
        // for a week reads here long before the objective cover collapses.
        statRow(
          'Aircrew condition',
          `${Math.round(wingCrewReadiness(state))}%`,
          wingCrewReadiness(state) >= 70
            ? 'good'
            : wingCrewReadiness(state) >= 45
              ? 'warn'
              : 'bad',
        ),
      );
      append(
        this.modal.body,
        note(
          'Cover above 100% finishes the mission faster; below it, progress slows in proportion. This is the main thing you control each day.',
        ),
      );
      if (tasking.capacityLimited) {
        append(
          this.modal.body,
          note(
            'The deck, not the hangar, is the limit here. Raising operational tempo turns more sorties — at the cost of fatigue and wear.',
          ),
        );
      }
    }

    for (const warning of tasking.warnings) {
      const n = noteRaw(`· ${tnote(warning)}`);
      n.style.color = 'var(--alert)';
      append(this.modal.body, n);
    }
  }

  private renderDutyBoard(state: GameState): void {
    const tasking = computeTasking(state);
    const def = state.mission ? missionDef(state.mission.defId) : null;

    append(this.modal.body, sectionTitle('DUTY BOARD'));
    const cards = div('cards');
    cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(210px, 1fr))';

    for (const duty of DUTIES) {
      const line = tasking.lines.find((l) => l.duty === duty.id)!;
      const weight = def?.dutyWeights[duty.id] ?? 0;

      const card = div('card');
      card.style.borderLeft = `3px solid ${duty.color}`;
      const ct = div('ct');
      append(ct, span('n', t(duty.name)), span('stat-value', String(line.assigned)));
      append(card, ct);
      append(card, div('desc', t(duty.description)));

      // Deck alert: what is actually standing it, and what is not and why.
      if (duty.id === 'alert') {
        const board = alertBoard(state);
        append(
          card,
          statRow(
            'Ready to launch',
            `${board.ready.length} / ${board.spots} ${t('spots')}`,
            board.ready.length > 0 ? 'good' : 'warn',
          ),
        );
        if (board.standingBy.length > 0) {
          append(card, statRow('Not ready', String(board.standingBy.length), 'bad'));
        }
        append(
          card,
          note(
            'Ready means up on the flight deck, crewed, fuelled and, for fighters and jammers, armed. Each airframe on alert takes risk off the operation; every two hold a catapult and cost a deck cycle.',
          ),
        );
      }

      // Support duties: what they are doing for the other sorties today.
      if (duty.id === 'tanker') {
        append(card, statRow('Boost to strike, CAP and recon', `+${Math.round(tasking.tankerBoost * 100)}%`, tasking.tankerBoost > 0 ? 'good' : ''));
      } else if (duty.id === 'escort') {
        append(card, statRow('Boost to strike', `+${Math.round(tasking.escortBoost * 100)}%`, tasking.escortBoost > 0 ? 'good' : ''));
      } else if (duty.id === 'planeguard') {
        append(card, statRow('Plane guard up', tasking.planeGuard ? t('YES') : t('NO'), tasking.planeGuard ? 'good' : 'bad'));
      }

      if (duty.flies && def && (def.dutyWeights[duty.id] ?? 0) > 0) {
        append(
          card,
          statRow(
            'Counts toward mission',
            weight > 0 ? `×${weight.toFixed(2)}` : t('not at all'),
            weight > 0 ? 'gold' : 'bad',
          ),
        );
        if (line.contribution > 0) {
          append(card, statRow('Contributing', line.contribution.toFixed(1), 'good'));
        }
      }
      append(cards, card);
    }
    append(this.modal.body, cards);
  }

  private renderAircraftTable(state: GameState): void {
    const def = state.mission ? missionDef(state.mission.defId) : null;

    append(this.modal.body, sectionTitle(`AIR WING — ${state.aircraft.length}`));
    append(
      this.modal.body,
      note('Click a duty to assign it. A greyed duty is one this airframe cannot usefully fly.'),
    );

    const sorted = state.aircraft.slice().sort((a, b) => {
      if (this.sortBy === 'readiness') return aircraftReadiness(b) - aircraftReadiness(a);
      if (this.sortBy === 'type') return a.typeId.localeCompare(b.typeId);
      if (this.sortBy === 'duty') return a.duty.localeCompare(b.duty) || a.tail.localeCompare(b.tail);
      return a.tail.localeCompare(b.tail);
    });

    const table = document.createElement('table');
    table.className = 'roster tasking';

    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    for (const [label, key] of [
      ['TAIL', 'tail'],
      ['TYPE', 'type'],
      ['STATUS', 'readiness'],
      ['DUTY', 'duty'],
    ] as [string, typeof this.sortBy][]) {
      const th = document.createElement('th');
      th.textContent = t(label);
      th.addEventListener('click', () => {
        this.sortBy = key;
        this.render();
      });
      hrow.appendChild(th);
    }
    const thCrew = document.createElement('th');
    thCrew.textContent = t('AIRCREW');
    hrow.appendChild(thCrew);

    const thAssign = document.createElement('th');
    thAssign.textContent = t('ASSIGN DUTY');
    hrow.appendChild(thAssign);
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const a of sorted) {
      tbody.appendChild(this.aircraftRow(state, a, def));
    }
    table.appendChild(tbody);
    append(this.modal.body, table);
  }

  private aircraftRow(
    state: GameState,
    a: Aircraft,
    def: ReturnType<typeof missionDef> | null,
  ): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const type = aircraftType(a.typeId);
    const capable = isMissionCapable(a);

    const tdTail = document.createElement('td');
    tdTail.textContent = `#${a.tail}`;
    tdTail.style.cursor = 'pointer';
    tdTail.addEventListener('click', () => {
      this.modal.close();
      this.api.openContext({ kind: 'aircraft', id: a.id });
    });
    tr.appendChild(tdTail);

    const tdType = document.createElement('td');
    tdType.textContent = type.name;
    tr.appendChild(tdType);

    const tdStatus = document.createElement('td');
    const status = aircraftStatusText(a);
    const limiting = limitingSystem(a);
    tdStatus.appendChild(
      span(
        capable ? 'st-working' : 'st-injured',
        `${Math.round(aircraftReadiness(a))}%  ${t(status, 'aircraft')}` +
          (limiting ? ` (${t(limiting, 'system')})` : ''),
      ),
    );
    tr.appendChild(tdStatus);

    const tdDuty = document.createElement('td');
    const current = DUTIES_BY_ID[a.duty];
    const chip = span('pill', t(current.short, 'duty'));
    chip.style.borderColor = current.color;
    chip.style.color = current.color;
    tdDuty.appendChild(chip);
    // On alert but not ready: say why, right where the duty is shown.
    if (a.duty === 'alert') {
      const standing = alertBoard(state).standingBy.find((s) => s.a.id === a.id);
      if (standing) {
        const why = span('badge', t(ALERT_PROBLEM_LABELS[standing.problem]));
        why.style.color = 'var(--alert)';
        tdDuty.appendChild(why);
      } else {
        const ok = span('badge', t('READY'));
        ok.style.color = 'var(--good)';
        tdDuty.appendChild(ok);
      }
    }
    tr.appendChild(tdDuty);

    // Aircrew: who is flying it, and a way straight to the crew chart.
    tr.appendChild(this.aircrewCell(state, a));

    // Duty picker: one small button per duty, greyed where useless.
    const tdAssign = document.createElement('td');
    const group = div('duty-picker');
    for (const duty of DUTIES) {
      const b = document.createElement('button');
      b.className = 'duty-btn';
      b.textContent = t(duty.short, 'duty');
      b.title = t(duty.name);

      const usable = this.dutyUsable(a, duty.id, capable);
      const contributes = def && duty.flies ? (def.dutyWeights[duty.id] ?? 0) > 0 : false;

      if (a.duty === duty.id) {
        b.classList.add('active');
        b.style.background = duty.color;
      } else if (!usable) {
        b.classList.add('unusable');
      } else if (contributes && typeSuitability(a.typeId, duty.id) > 0) {
        b.classList.add('useful');
      }

      b.disabled = !usable;
      b.addEventListener('click', () => {
        setDuty(state, a.id, duty.id);
        this.api.refresh();
        this.render();
      });
      group.appendChild(b);
    }
    tdAssign.appendChild(group);
    tr.appendChild(tdAssign);

    return tr;
  }

  /**
   * The crew cell: the commander's name, how many seats are actually manned,
   * and the quality that scales the sortie. Clicking opens the crew chart.
   */
  private aircrewCell(state: GameState, a: Aircraft): HTMLTableCellElement {
    const td = document.createElement('td');
    const seats = seatCount(a);
    const commander = seatOccupant(state, a, 0);

    let fit = 0;
    for (let seat = 0; seat < seats; seat++) {
      const c = seatOccupant(state, a, seat);
      if (c && isFitToFly(c)) fit++;
    }

    const wrap = div('crew-cell');
    if (!isCrewed(state, a) || !commander) {
      const chip = span('pill', t('NO PILOT'));
      chip.style.borderColor = 'var(--alert)';
      chip.style.color = 'var(--alert)';
      append(wrap, chip);
    } else {
      // The multiplier is what the crew actually does to the sortie, so that
      // is the number shown rather than an abstract quality score.
      const factor = crewFactor(state, a);
      append(
        wrap,
        span('name', `${rank(commander.rank).code} ${shortName(commander.name)}`),
        span(
          'meta',
          `${fit}/${seats} ${t('seats')} · ×${factor.toFixed(2)}` +
            (commander.consecutiveFlyingDays > 4
              ? ` · ${tf('{n}d flying', { n: commander.consecutiveFlyingDays })}`
              : ''),
        ),
      );
      if (fit < seats) {
        const chip = span('badge', t('SHORT'));
        chip.style.color = 'var(--warn)';
        append(wrap, chip);
      }
    }

    td.appendChild(wrap);
    td.style.cursor = 'pointer';
    td.title = t('Click to set who flies this airframe');
    td.addEventListener('click', () => this.api.openAircrewPicker(a.id));
    return td;
  }

  /** A duty is unusable if the airframe physically cannot perform it. */
  private dutyUsable(a: Aircraft, duty: AircraftDuty, capable: boolean): boolean {
    const def = DUTIES_BY_ID[duty];
    if (!def.flies) return true;
    if (!capable) return false;
    return typeSuitability(a.typeId, duty) > 0;
  }
}

/** Compact tasking readout for the sidebar. */
export function taskingSummaryLine(state: GameState): {
  text: string;
  cls: string;
} {
  const tasking = computeTasking(state);
  if (!state.mission) {
    return { text: tf('{n} on alert', { n: tasking.alertCount }), cls: '' };
  }
  const pct = Math.round(tasking.ratio * 100);
  return {
    text: `${pct}%`,
    cls: tasking.ratio >= 1 ? 'good' : tasking.ratio >= 0.6 ? 'warn' : 'bad',
  };
}
