import type { Aircraft, CrewMember, GameState } from '../core/types';
import { portraitElement } from '../render/portrait';
import type { GameApi } from './api';
import { Modal } from './modal';
import { aircraftType } from '../data/aircraft';
import { SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { primarySkill, statusLabel } from '../core/crew';
import {
  CREW_FACTOR_CAP,
  assignedAircraft,
  autoCrewAircraft,
  canFillSeat,
  crewFactor,
  isFitToFly,
  seatCount,
  seatOccupant,
  seatSpecialty,
} from '../core/aircrew';
import { artElement } from '../render/aircraftArt';
import { append, bar, button, clear, div, note, pill, sectionTitle, span, statRow } from './dom';
import { t, tf } from '../i18n';

/**
 * Who flies this airframe.
 *
 * Two views in one modal: the seat chart, and the list of people who could
 * take a given seat. The seat chart is what the player reasons about — a
 * two-seat Super Hornet with a tired backseater is a different proposition
 * from the same airframe with a fresh one.
 */
export class AircrewPickerModal {
  private modal = new Modal(true);
  private aircraftId = '';
  /** null shows the seat chart; a number shows the candidates for that seat. */
  private seat: number | null = null;

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(aircraftId: string): void {
    this.aircraftId = aircraftId;
    this.seat = null;
    const a = this.aircraft();
    if (!a) return;
    const type = aircraftType(a.typeId);
    this.modal.open(`${t('AIRCREW')} — ${type.name} #${a.tail}`);
    this.render();
  }

  private aircraft(): Aircraft | null {
    return this.api.state().aircraft.find((x) => x.id === this.aircraftId) ?? null;
  }

  private render(): void {
    const state = this.api.state();
    const a = this.aircraft();
    if (!a) return;
    clear(this.modal.body);
    clear(this.modal.foot);

    if (this.seat === null) this.renderSeatChart(state, a);
    else this.renderCandidates(state, a, this.seat);
  }

  // -----------------------------------------------------------------------

  private renderSeatChart(state: GameState, a: Aircraft): void {
    const type = aircraftType(a.typeId);
    const seats = seatCount(a);
    // What the crew multiplies the sortie by: the number the tasking order
    // actually uses, rather than an abstract score.
    const factor = crewFactor(state, a);

    append(this.modal.body, sectionTitle('CREW CHART'));
    append(this.modal.body, artElement(a.typeId));
    append(
      this.modal.body,
      note(
        'The commander flies the aircraft and counts for most of what the sortie is worth; mission crew share the rest. An empty or unfit seat is a seat that does not contribute — and with no commander the aircraft does not launch at all.',
      ),
    );

    const row = div('attr-row');
    append(
      row,
      span('attr-label', t('CREW EFFECT')),
      // The bar reads against the cap an exceptional crew reaches.
      bar(Math.round((factor / CREW_FACTOR_CAP) * 100)),
      span('attr-value', factor > 0 ? `×${factor.toFixed(2)}` : t('NO PILOT')),
    );
    append(this.modal.body, row);
    append(
      this.modal.body,
      statRow('Squadron', a.squadron),
      statRow('Seats manned', `${this.fitSeats(state, a)} / ${seats}`),
    );

    const list = div('list');
    for (let seat = 0; seat < seats; seat++) {
      append(list, this.seatRow(state, a, seat));
    }
    append(this.modal.body, list);

    const caps = div('btn-row');
    append(
      caps,
      pill(t(type.role.toUpperCase(), 'role')),
      span('pill', tf('AIRCREW {n}', { n: seats })),
    );
    append(this.modal.body, caps);

    const actions = div('btn-row');
    append(
      actions,
      button('FILL EMPTY SEATS', 'primary', () => {
        autoCrewAircraft(state, a.id);
        this.api.refresh();
        this.render();
      }),
      button('CLEAR ALL SEATS', '', () => {
        for (let seat = 0; seat < seatCount(a); seat++) this.api.clearAircrewSeat(a.id, seat);
        this.render();
      }),
      button('DONE', '', () => this.modal.close()),
    );
    append(this.modal.foot, actions);
  }

  private fitSeats(state: GameState, a: Aircraft): number {
    let n = 0;
    for (let seat = 0; seat < seatCount(a); seat++) {
      const c = seatOccupant(state, a, seat);
      if (c && isFitToFly(c)) n++;
    }
    return n;
  }

  private seatRow(state: GameState, a: Aircraft, seat: number): HTMLDivElement {
    const specialty = seatSpecialty(seat);
    const occupant = seatOccupant(state, a, seat);
    const row = div('row clickable');

    const label = seat === 0 ? t('COMMANDER') : tf('MISSION CREW {n}', { n: seat });
    const name = span(
      'name',
      occupant
        ? `${label} · ${rank(occupant.rank).code} ${occupant.name}`
        : `${label} · ${t('VACANT')}`,
    );
    if (!occupant) name.appendChild(span('badge', t('EMPTY')));
    else if (!isFitToFly(occupant)) {
      name.appendChild(span('badge', t(statusLabel(occupant), 'status')));
    }
    append(row, name);

    append(
      row,
      span(
        'meta',
        occupant
          ? `${t(SPECIALTIES[occupant.primary].short)} ${Math.round(primarySkill(occupant))} · ${t(
              'FATIGUE',
            )} ${Math.round(occupant.fatigue)}%`
          : t(SPECIALTIES[specialty].short),
      ),
    );

    row.addEventListener('click', () => {
      this.seat = seat;
      this.render();
    });
    return row;
  }

  // -----------------------------------------------------------------------

  private renderCandidates(state: GameState, a: Aircraft, seat: number): void {
    const specialty = seatSpecialty(seat);
    const label = seat === 0 ? t('COMMANDER') : tf('MISSION CREW {n}', { n: seat });

    append(this.modal.body, sectionTitle(`${label} — ${t(SPECIALTIES[specialty].name)}`));
    append(
      this.modal.body,
      note(
        seat === 0
          ? 'Only a pilot can command an aircraft. Taking someone off another airframe leaves that seat empty.'
          : 'A mission-crew seat can be filled by any aircrew, a pilot included. Taking someone off another airframe leaves that seat empty.',
      ),
    );

    const eligible = state.crew.filter((c) => canFillSeat(c, seat));
    const score = (c: CrewMember): number => {
      const other = assignedAircraft(state, c.id);
      const free = !other || other.id === a.id ? 1 : 0;
      return (isFitToFly(c) ? 2 : 0) + free;
    };
    eligible.sort(
      (p, q) =>
        score(q) - score(p) ||
        primarySkill(q) - primarySkill(p) ||
        p.fatigue - q.fatigue,
    );

    const list = div('list');
    if (a.crewIds[seat]) {
      const clearRow = div('row clickable');
      append(clearRow, span('name', t('— Leave this seat empty —')));
      clearRow.addEventListener('click', () => {
        this.api.clearAircrewSeat(a.id, seat);
        this.seat = null;
        this.render();
      });
      append(list, clearRow);
    }

    for (const c of eligible) {
      const other = assignedAircraft(state, c.id);
      const row = div('row clickable');
      const name = span('name with-portrait');
      name.append(portraitElement(c, 1, 'portrait portrait-row'), document.createTextNode(`${rank(c.rank).code} ${c.name}`));
      if (c.id === a.crewIds[seat]) name.appendChild(span('badge', t('CURRENT')));
      else if (other) name.appendChild(span('badge gold', `#${other.tail}`));
      if (!isFitToFly(c)) name.appendChild(span('badge', t(statusLabel(c), 'status')));
      append(row, name);

      append(
        row,
        span(
          'meta',
          `${t(SPECIALTIES[c.primary].short)} ${Math.round(primarySkill(c))} · ${t(
            'FATIGUE',
          )} ${Math.round(c.fatigue)}% · ${t('SORTIES')} ${c.sortiesFlown}` +
            (c.consecutiveFlyingDays > 2
              ? ` · ${tf('{n} DAYS FLYING', { n: c.consecutiveFlyingDays })}`
              : ''),
        ),
      );

      row.addEventListener('click', () => {
        this.api.assignAircrew(a.id, seat, c.id);
        this.seat = null;
        this.render();
      });
      append(list, row);
    }
    append(this.modal.body, list);

    append(
      this.modal.foot,
      button('BACK TO CREW CHART', '', () => {
        this.seat = null;
        this.render();
      }),
    );
  }
}
