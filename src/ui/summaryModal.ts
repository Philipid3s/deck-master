import type { DailyReport, GameState } from '../core/types';
import { OUTCOME_LABELS } from '../core/missions';
import { prestigeTier } from '../core/economy';
import { COMPONENT_ADVICE, COMPONENT_LABELS, readinessLabel, weakestLink } from '../core/readiness';
import { STATUS_LABELS } from '../core/status';
import {
  append,
  button,
  clear,
  deltaClass,
  div,
  formatCredits,
  note,
  noteRaw,
  formatDelta,
  sectionTitle,
  span,
  statRow,
} from './dom';
import { t, tf, tnote } from '../i18n';
import { Modal } from './modal';

// ===========================================================================
// Daily summary (spec section 88)
// ===========================================================================

export class SummaryModal {
  private modal = new Modal();

  constructor(private onContinue: () => void) {}

  /** Hide without continuing, e.g. while the day's flying is replayed. */
  suspend(): void {
    this.modal.root.classList.add('hidden');
  }

  resume(): void {
    this.modal.root.classList.remove('hidden');
  }

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(report: DailyReport, state: GameState, extras: HTMLElement[] = []): void {
    this.modal.open(tf('DAY {n} COMPLETE', { n: report.day }), () => this.onContinue());
    clear(this.modal.body);
    clear(this.modal.foot);

    // A phase change is the most consequential thing that can happen in a
    // day, so it leads the summary.
    if (report.statusAfter !== report.statusBefore) {
      const banner = div(
        `outcome-banner ${report.statusAfter === 'port' ? 'good' : ''}`.trim(),
        `${t(STATUS_LABELS[report.statusBefore], 'carrierstatus')}  →  ${t(
          STATUS_LABELS[report.statusAfter],
          'carrierstatus',
        )}`,
      );
      append(this.modal.body, banner);
    }

    if (report.missionOutcome) {
      const good = report.missionOutcome === 'outstanding' || report.missionOutcome === 'success';
      const banner = div(
        `outcome-banner ${good ? 'good' : 'bad'}`,
        t(OUTCOME_LABELS[report.missionOutcome]),
      );
      append(this.modal.body, banner);
    }

    const grid = div('summary-grid');

    // Mission
    const mission = div('summary-block');
    append(mission, div('sb-title', t('MISSION')));
    if (report.missionTitle) {
      append(
        mission,
        statRow('Operation', t(report.missionTitle)),
        statRow(
          'Progress',
          `${formatDelta(report.missionProgressDelta, 1)}%`,
          deltaClass(report.missionProgressDelta),
        ),
        statRow('Total', `${Math.round(report.missionProgress)}%`),
      );
    } else {
      append(mission, note('No active mission.'));
    }
    append(grid, mission);

    // Aircraft
    const air = div('summary-block');
    append(air, div('sb-title', t('AIRCRAFT')));
    append(
      air,
      statRow('Launched', String(report.sortiesLaunched)),
      statRow('Recovered', String(report.sortiesRecovered)),
      statRow('Maintenance completed', String(report.maintenanceCompleted)),
      statRow(
        'New work orders',
        String(report.workOrdersOpened),
        report.workOrdersOpened > 2 ? 'warn' : '',
      ),
    );
    if (report.tasking.required > 0) {
      append(
        air,
        statRow(
          'Objective cover',
          `${Math.round(report.tasking.ratio * 100)}%`,
          report.tasking.ratio >= 1 ? 'good' : report.tasking.ratio >= 0.6 ? 'warn' : 'bad',
        ),
      );
    }
    if (report.tasking.grounded > 0) {
      append(air, statRow('Grounded', String(report.tasking.grounded)));
    }
    append(grid, air);

    // Crew
    const crew = div('summary-block');
    append(crew, div('sb-title', t('CREW')));
    append(
      crew,
      statRow('In training', String(report.trainedToday)),
      statRow('Courses completed', String(report.trainingCompleted.length)),
      statRow('Newly promotable', String(report.promotions.length)),
      statRow('Morale', formatDelta(report.moraleDelta, 1), deltaClass(report.moraleDelta)),
      statRow('Fatigue', formatDelta(report.fatigueDelta, 1), deltaClass(-report.fatigueDelta)),
    );
    append(grid, crew);

    // Carrier
    const carrier = div('summary-block');
    append(carrier, div('sb-title', t('CARRIER')));
    append(
      carrier,
      statRow(
        'Readiness',
        `${Math.round(report.readinessBefore)}% → ${Math.round(report.readinessAfter)}%`,
        deltaClass(report.readinessAfter - report.readinessBefore),
      ),
      statRow('Assessment', t(readinessLabel(report.readinessAfter), 'readiness')),
    );
    append(grid, carrier);

    // Resources
    const res = div('summary-block');
    append(res, div('sb-title', t('RESOURCES')));
    append(
      res,
      statRow(
        'Credits',
        `${report.creditsDelta >= 0 ? '+' : ''}${formatCredits(report.creditsDelta)}`,
        deltaClass(report.creditsDelta),
      ),
      statRow('Balance', formatCredits(state.credits), state.credits < 0 ? 'bad' : ''),
      statRow('Prestige', formatDelta(report.prestigeDelta), deltaClass(report.prestigeDelta)),
      statRow('Standing', t(prestigeTier(state.prestige).name), 'gold'),
    );
    append(grid, res);

    append(this.modal.body, grid);

    // Why readiness moved: the two or three things that did it, each with
    // its concrete cause, then the weakest link and what to do about it.
    // Readiness is the number everything hangs on; it should never move
    // without the player being told why.
    const drivers = report.readinessDrivers ?? [];
    const weakest = weakestLink(state);
    const why = div('summary-why');
    append(why, div('sb-title', t('WHY READINESS MOVED')));
    if (drivers.length === 0) {
      append(why, note('Readiness held steady today.'));
    }
    for (const d of drivers) {
      const row = div(`why-row ${d.impact < 0 ? 'bad' : 'good'}`);
      append(
        row,
        span('why-impact', formatDelta(d.impact, 1)),
        span('why-comp', t(COMPONENT_LABELS[d.component])),
        span('why-cause', tnote(d.cause)),
      );
      append(why, row);
    }
    const weak = div('why-weakest');
    append(
      weak,
      span('why-comp', `${t('Weakest link')}: ${t(COMPONENT_LABELS[weakest.component])} ${Math.round(weakest.value)}%`),
      span('why-cause', t(COMPONENT_ADVICE[weakest.component])),
    );
    append(why, weak);
    append(this.modal.body, why);

    // Casualties get their own emphasis.
    if (report.casualties.length > 0) {
      append(this.modal.body, sectionTitle('CASUALTIES'));
      append(
        this.modal.body,
        note(report.casualties.join(', ')),
      );
    }

    if (report.trainingCompleted.length > 0) {
      append(this.modal.body, sectionTitle('TRAINING COMPLETED'));
      for (const entry of report.trainingCompleted) {
        append(this.modal.body, noteRaw(`· ${entry.crew} — ${t(entry.course)}`));
      }
    }

    if (report.promotions.length > 0) {
      append(this.modal.body, sectionTitle('NOW ELIGIBLE FOR PROMOTION'));
      append(this.modal.body, note(report.promotions.join(', ')));
    }

    if (report.notes.length > 0) {
      const notes = div('summary-notes');
      append(notes, div('sb-title', t('DAY LOG')));
      for (const entry of report.notes) {
        // Classify on the English key so the colour coding is language
        // independent, then render the translated line.
        const bad = /injur|critical|below|error|set back|damaged|Unresolved|FAILURE/i.test(entry.key);
        const good = /funding|SUCCESS|completed/i.test(entry.key);
        append(notes, div(`n${bad ? ' bad' : good ? ' good' : ''}`, tnote(entry)));
      }
      append(this.modal.body, notes);
    }

    const cont = button(tf('BEGIN DAY {n}', { n: report.day + 1 }), 'primary', () =>
      this.modal.close(),
    );
    append(this.modal.foot, ...extras, cont);
    cont.focus();
  }
}
