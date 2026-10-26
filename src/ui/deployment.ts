import type { GameState } from '../core/types';
import {
  DEPLOYMENT_DAYS,
  deploymentDay,
  deploymentObjectives,
  isDeployment,
  type Objective,
  type ObjectiveState,
} from '../core/deployment';
import { Modal } from './modals';
import { append, bar, button, clear, div, note, noteRaw, span, statRow } from './dom';
import { OUTCOME_LABELS } from '../core/missions';
import { t, tf } from '../i18n';

/**
 * The deployment's orders, always in view: how many days are left and how
 * the ship stands against each objective. A short campaign needs its goal
 * on screen, not in a menu.
 */
export function renderDeploymentPanel(host: HTMLElement, state: GameState): void {
  clear(host);
  if (!isDeployment(state)) return;

  const day = deploymentDay(state);
  const left = Math.max(0, DEPLOYMENT_DAYS - state.day + 1);
  const clock = div('attr-row');
  append(
    clock,
    span('attr-label', tf('DAY {n} OF {total}', { n: day, total: DEPLOYMENT_DAYS })),
    bar((day / DEPLOYMENT_DAYS) * 100, left <= 5 ? '#c0392b' : '#e8ad12'),
    span('attr-value', tf('{n}d', { n: left })),
  );
  append(host, clock);

  for (const o of deploymentObjectives(state)) append(host, objectiveRow(o));
  append(
    host,
    note(
      'Orders: two successful operations inside thirty days. Each other objective met on the last day earns a star. ● on track · ▲ at risk · ✓ done',
    ),
  );
}

/**
 * The end-of-deployment debrief: the verdict, the stars, the objectives
 * and what the ship did. Offers to keep commanding the same ship as an open
 * career, so a good deployment is not thrown away.
 */
export class DebriefModal {
  private modal = new Modal(false);
  readonly root = this.modal.root;

  constructor(
    private onCareer: () => void,
    private onTitle: () => void,
  ) {}

  get isOpen(): boolean {
    return this.modal.isOpen;
  }

  open(state: GameState): void {
    const end = state.campaignEnd;
    if (!end) return;
    const relieved = !end.won && /relieved/i.test(end.reason);
    this.modal.open(
      end.won ? t('DEPLOYMENT ACCOMPLISHED') : relieved ? t('COMMAND RELIEVED') : t('DEPLOYMENT NOT ACCOMPLISHED'),
    );
    const body = this.modal.body;
    clear(body);

    const stars = end.stars ?? 0;
    const verdict = div(`debrief-verdict ${end.won ? 'good' : 'bad'}`);
    append(
      verdict,
      div('debrief-stars', end.won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '—'),
      div('debrief-grade', t(gradeName(end.won, stars))),
    );
    append(body, verdict, note(end.reason));

    append(body, div('section-title', t('OBJECTIVES')));
    for (const o of deploymentObjectives(state)) append(body, objectiveRow(o));

    append(body, div('section-title', t('THE DEPLOYMENT')));
    const stats: [string, string][] = [
      ['Days at sea and alongside', String(end.day)],
      ['Operations completed', String(state.missionHistory.length)],
      ['Sorties flown', String(state.sortieTotal)],
      ['Crew injured on duty', String(state.totalCasualties)],
      ['Prestige', String(state.prestige)],
    ];
    for (const [k, v] of stats) append(body, statRow(k, v));
    for (const m of state.missionHistory) {
      append(
        body,
        noteRaw(`${tf('Day {n}', { n: m.endedDay })} — ${t(m.title)}: ${t(OUTCOME_LABELS[m.outcome])}`),
      );
    }

    clear(this.modal.foot);
    append(
      this.modal.foot,
      button('RETURN TO TITLE', '', () => this.onTitle()),
      button('KEEP COMMAND — OPEN CAREER', 'primary', () => {
        this.modal.close();
        this.onCareer();
      }),
    );
  }
}

const STATE_MARK: Record<ObjectiveState, string> = {
  done: '✓',
  ontrack: '●',
  atrisk: '▲',
  failed: '✗',
};

const STATE_LABEL: Record<ObjectiveState, string> = {
  done: 'Done',
  ontrack: 'On track',
  atrisk: 'At risk',
  failed: 'Missed',
};

/**
 * One objective. The secondaries are only judged on the last day, so until
 * then they read as on track or at risk rather than as achieved.
 */
function objectiveRow(o: Objective): HTMLDivElement {
  const row = div(`objective st-${o.state}${o.primary ? ' primary' : ''}`);
  const mark = span('obj-mark', STATE_MARK[o.state]);
  mark.title = t(STATE_LABEL[o.state]);
  append(
    row,
    mark,
    span('obj-label', t(o.label)),
    span('obj-value', `${o.current}${o.unit} / ${o.target}${o.unit}`),
  );
  row.title = t(STATE_LABEL[o.state]);
  return row;
}

function gradeName(won: boolean, stars: number): string {
  if (!won) return 'Orders not carried out';
  return ['Orders carried out', 'Well done', 'Bravo Zulu', 'Exceptional command'][stars] ?? 'Orders carried out';
}
