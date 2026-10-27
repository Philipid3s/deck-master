import type { CarrierStatus, GameState } from '../core/types';
import { mechanicRows } from './operationsView';
import { ALERT_SPOTS, alertBoard, computeTasking } from '../core/tasking';
import { PAL } from '../render/palette';
import { getDeck } from '../data/decks';
import { missionDef } from '../data/missions';
import { isAvailable } from '../core/crew';
import { prestigeTier, SUPPLY_LABELS } from '../core/economy';
import {
  COMPONENT_ADVICE,
  COMPONENT_LABELS,
  readinessLabel,
  statusColor,
  weakestLink,
} from '../core/readiness';
import { STATUS_LABELS, isInPort, statusDetail } from '../core/status';
import { append, bar, button, clear, div, formatCredits, note, span, statRow } from './dom';
import { t, tf, tnote } from '../i18n';

// The chrome around the deck: status bar, deck caption, SHIP STATUS panel,
// legend and bottom-bar metrics. Each renders from the state into the node
// it is given and holds nothing of its own.

/** Legend entries, transcribed from the concept art's legend block. */
const LEGEND: [string, string][] = [
  ['CREW', PAL.crew],
  ['AIRCRAFT', PAL.aircraftAccent],
  ['SYSTEM', PAL.system],
  ['SUPPORT', PAL.support],
  ['ELEVATOR', PAL.elevator],
  ['STAIRS / LADDER', PAL.stairs],
];

const STATUS_LEGEND: [string, string][] = [
  ['IDLE', PAL.idle],
  ['WORKING', PAL.working],
  ['TRAINING', PAL.training],
  ['REPAIRING', PAL.repairing],
  ['ALERT', PAL.alert],
];

/**
 * The carrier status bar. Shows the phase, how long is left in it, and
 * plainly states whether anything can be brought aboard.
 */
export function renderStatusBar(el: HTMLElement, s: GameState): void {
  clear(el);
  el.className = `statusbar st-${s.status}`;

  append(
    el,
    span('sb-label', t(STATUS_LABELS[s.status], 'carrierstatus')),
    span('sb-detail', tnote(statusDetail(s))),
  );

  // Phase pips: passage out, work, passage home.
  const track = div('sb-track');
  const order: CarrierStatus[] = ['outbound', 'onstation', 'inbound'];
  if (s.status !== 'port') {
    const current = order.indexOf(s.status);
    order.forEach((phase, i) => {
      const pip = div(`pip${i < current ? ' done' : i === current ? ' active' : ''}`);
      pip.title = t(STATUS_LABELS[phase], 'carrierstatus');
      append(track, pip);
    });
    append(el, track);
  }

  if (s.mission) {
    const def = missionDef(s.mission.defId);
    append(
      el,
      span(
        'sb-detail',
        `${t(def.title)} — ${tf('{n} day passage each way', { n: def.transitDays })}`,
      ),
    );
  }

  append(
    el,
    span(
      'sb-note',
      isInPort(s)
        ? t('Stores, equipment, airframes and personnel can come aboard')
        : t('Nothing can be brought aboard until the ship is alongside'),
    ),
  );
}

export function renderLegend(el: HTMLElement): void {
  clear(el);
  const legendGrid = div('legend');
  for (const [label, color] of LEGEND) {
    const item = div('item');
    const sw = div('sw');
    sw.style.background = color;
    append(item, sw, span('', t(label, 'legend')));
    append(legendGrid, item);
  }
  append(el, legendGrid);

  const statusGrid = div('legend');
  statusGrid.style.marginTop = '7px';
  for (const [label, color] of STATUS_LEGEND) {
    const item = div('item');
    const sw = div('sw');
    sw.style.background = color;
    append(item, sw, span('', t(label, 'legend')));
    append(statusGrid, item);
  }
  append(el, div('section-title', t('STATUS')), statusGrid);
}

export function renderDeckCaption(el: HTMLElement, deckIndex: number, s: GameState): void {
  clear(el);
  const deck = getDeck(deckIndex);
  append(
    el,
    div('num', tf('DECK {n}', { n: String(deck.index).padStart(2, '0') })),
    div('name', t(deck.short)),
  );
  const list = document.createElement('ol');
  const rooms = deck.rooms
    .filter((r) => r.kind !== 'elevator' && r.kind !== 'stairs')
    .slice(0, 10);
  for (const room of rooms) {
    const li = document.createElement('li');
    li.textContent = t(room.name);
    const rs = s.rooms[room.id];
    if (rs && rs.condition < 45) li.style.color = PAL.alert;
    list.appendChild(li);
  }
  append(el, list);
}

/** The SHIP STATUS panel. */
export function renderReadout(el: HTMLElement, s: GameState, openTasking: () => void): void {
  clear(el);

  const missionTitle = s.mission
    ? t(missionDef(s.mission.defId).title)
    : t('No active mission');

  append(
    el,
    statRow('CARRIER STATUS', t(STATUS_LABELS[s.status], 'carrierstatus'), statusClass(s.status)),
  );
  if (s.status !== 'port' && s.status !== 'onstation') {
    append(el, statRow('PASSAGE', tnote(statusDetail(s))));
  }
  append(el, statRow('MISSION', missionTitle));
  if (s.mission) {
    const row = div('attr-row');
    append(
      row,
      span('attr-label', t('PROGRESS')),
      bar(s.mission.progress),
      span('attr-value', `${Math.round(s.mission.progress)}`),
    );
    append(el, row);
    // The operation's own mechanic: contacts, raid forecast, tension...
    append(el, ...mechanicRows(s));
  }

  // Today's air tasking: the number the player is actually steering.
  const tasking = computeTasking(s);
  if (s.mission) {
    const cover = div('attr-row');
    append(
      cover,
      span('attr-label', t('OBJECTIVE COVER')),
      bar(Math.min(100, tasking.ratio * 100), statusColor(tasking.ratio * 80)),
      span('attr-value', `${Math.round(tasking.ratio * 100)}`),
    );
    append(el, cover);
  }
  append(
    el,
    statRow(
      'TASKED TO FLY',
      `${tasking.flyable} / ${tasking.sortieCapacity}`,
      tasking.capacityLimited ? 'bad' : '',
    ),
    statRow(
      'ON DECK ALERT',
      `${tasking.alertCount} / ${ALERT_SPOTS}`,
      alertBoard(s).standingBy.length > 0 ? 'warn' : '',
    ),
  );
  const taskingBtn = button('AIR TASKING ORDER', 'wide', openTasking);
  append(el, taskingBtn);

  append(el, div('divider'));
  append(
    el,
    statRow('PRESTIGE', `${s.prestige}  ★`, 'gold'),
    statRow('STANDING', t(prestigeTier(s.prestige).name), 'gold'),
    statRow('CREDITS', formatCredits(s.credits), s.credits < 0 ? 'bad' : 'gold'),
  );

  append(el, div('divider'));

  const r = s.readiness;
  append(
    el,
    statRow(
      'CARRIER READINESS',
      `${Math.round(r.overall)}%`,
      r.overall >= 74 ? 'good' : r.overall >= 50 ? 'warn' : 'bad',
    ),
    statRow('ASSESSMENT', t(readinessLabel(r.overall), 'readiness')),
  );

  const readyAircraft = s.aircraft.filter((a) => a.state === 'ready').length;
  const availableCrew = s.crew.filter(isAvailable).length;
  const injured = s.crew.filter((c) => c.health !== 'healthy').length;
  const avgMorale = mean(s.crew.map((c) => c.morale));
  const avgFatigue = mean(s.crew.map((c) => c.fatigue));

  append(
    el,
    statRow(
      'AIRCRAFT READY',
      `${readyAircraft} / ${s.aircraft.length}`,
      readyAircraft / Math.max(1, s.aircraft.length) > 0.6 ? 'good' : 'warn',
    ),
    statRow('CREW AVAILABLE', `${availableCrew} / ${s.crew.length}`),
    statRow('CREW MORALE', `${Math.round(avgMorale)}%`, avgMorale >= 60 ? 'good' : 'warn'),
    statRow('CREW FATIGUE', `${Math.round(avgFatigue)}%`, avgFatigue <= 45 ? 'good' : 'bad'),
    statRow('IN MEDICAL', String(injured), injured > 0 ? 'warn' : 'good'),
    statRow('OPEN WORK ORDERS', String(s.workOrders.length), s.workOrders.length > 6 ? 'warn' : ''),
  );

  append(el, div('divider'));
  append(el, div('section-title', t('READINESS BREAKDOWN')));
  const components: [string, number][] = [
    ['Aircraft', r.aircraft],
    ['Crew', r.crew],
    ['Maintenance', r.maintenance],
    ['Engineering', r.engineering],
    ['Operations', r.operations],
    ['Logistics', r.logistics],
    ['Weapons', r.weapons],
    ['Medical', r.medical],
    ['Command', r.command],
  ];
  const worst = Math.min(...components.map(([, v]) => v));
  for (const [label, value] of components) {
    const row = div('attr-row');
    const lbl = span('attr-label', label);
    if (value === worst) lbl.style.color = PAL.alert;
    lbl.textContent = t(label);
    append(row, lbl, bar(value, statusColor(value)), span('attr-value', String(Math.round(value))));
    append(el, row);
  }
  // The weakest component is 40% of overall readiness: name it and say
  // what fixes it, right where the player is looking at the numbers.
  const weakest = weakestLink(s);
  const advice = div('weakest-link');
  append(
    advice,
    div('wl-title', `${t('Weakest link')}: ${t(COMPONENT_LABELS[weakest.component])}`),
    div('wl-body', t(COMPONENT_ADVICE[weakest.component])),
  );
  append(el, advice);
  append(
    el,
    note(
      'Overall readiness blends the weighted mean with the single worst component — one collapsed department drags the whole ship down.',
    ),
  );

  append(el, div('section-title', t('SUPPLIES')));
  for (const [key, value] of Object.entries(s.supplies)) {
    const row = div('attr-row');
    append(
      row,
      span('attr-label', t(SUPPLY_LABELS[key as keyof typeof SUPPLY_LABELS]).toUpperCase()),
      bar(value, statusColor(value)),
      span('attr-value', String(Math.round(value))),
    );
    append(el, row);
  }

  if (s.campaignEnd) {
    append(el, div('divider'));
    const banner = div(
      `outcome-banner ${s.campaignEnd.won ? 'good' : 'bad'}`,
      s.campaignEnd.won ? t('CAMPAIGN WON') : t('COMMAND RELIEVED'),
    );
    append(el, banner, note(s.campaignEnd.reason));
  }
}

export function renderBottomMetrics(el: HTMLElement, s: GameState): void {
  clear(el);
  const readyAircraft = s.aircraft.filter((a) => a.state === 'ready').length;
  const metrics: [string, string][] = [
    ['AIRCRAFT', `${readyAircraft}/${s.aircraft.length}`],
    ['CREW', `${s.crew.filter(isAvailable).length}/${s.crew.length}`],
    ['READINESS', `${Math.round(s.readiness.overall)}%`],
    ['PRESTIGE', String(s.prestige)],
    ['CREDITS', formatCredits(s.credits)],
    ['SORTIES', String(s.sortieTotal)],
  ];
  for (const [k, v] of metrics) {
    const m = div('metric');
    append(m, span('k', t(k, 'metric')), span('v', v));
    append(el, m);
  }
}

function statusClass(status: CarrierStatus): string {
  return status === 'port' ? 'good' : status === 'onstation' ? 'gold' : '';
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
