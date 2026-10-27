import type { AircraftDuty, DailyReport } from '../core/types';
import type { FlightShow } from '../render/flightShow';
import { DUTIES_BY_ID } from '../data/aircraft';
import { append, button, div, span } from './dom';
import { t, tf } from '../i18n';

const FLIGHT_OPS_KEY = 'deckmaster.flightops';

/** Whether the day's flying plays automatically when the day ends. */
export function flightOpsAuto(): boolean {
  try {
    return localStorage.getItem(FLIGHT_OPS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setFlightOpsAuto(on: boolean): void {
  try {
    localStorage.setItem(FLIGHT_OPS_KEY, on ? 'on' : 'off');
  } catch {
    // Without storage the choice lasts until the page is reloaded.
  }
}

/** The banner over the flight deck that sums up the air tasking order. */
export function flightOpsBanner(
  report: DailyReport,
  show: FlightShow,
  onSkip: () => void,
  onStopAutoPlay: () => void,
): HTMLDivElement {
  const flights = report.flights ?? [];
  const banner = div('flightops-banner');
  append(banner, div('fo-title', tf('FLIGHT OPERATIONS — DAY {n}', { n: report.day })));
  const chips = div('fo-chips');
  for (const { duty, n } of show.summary()) {
    append(chips, span('fo-chip', `${t(DUTIES_BY_ID[duty as AircraftDuty].short, 'duty')} ×${n}`));
  }
  append(banner, chips);
  const damaged = flights.filter((f) => f.damaged).length;
  append(
    banner,
    div(
      'fo-sub',
      `${tf('{n} sorties launched and recovered', { n: flights.length })}${
        damaged > 0 ? ` · ${tf('{n} came back with a fault', { n: damaged })}` : ''
      }${show.extra > 0 ? ` · ${tf('{n} more not shown', { n: show.extra })}` : ''}`,
    ),
  );
  const actions = div('fo-actions');
  append(
    actions,
    button('SKIP', '', onSkip),
    button('DON’T PLAY EVERY DAY', '', () => {
      setFlightOpsAuto(false);
      onStopAutoPlay();
    }),
  );
  append(banner, actions, div('fo-hint', t('Click the deck or press Enter to skip')));
  return banner;
}
