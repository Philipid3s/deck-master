import type { GameState, MissionDef } from '../core/types';
import { missionDef } from '../data/missions';
import {
  MECHANIC_LABELS,
  THREAT_LABELS,
  airDefence,
  bonusFor,
  bonusProgress,
  defenceNeeded,
} from '../core/operations';
import { append, div, span, statRow } from './dom';
import { t, tf } from '../i18n';

/**
 * The readouts for a mission's own mechanic: the same few lines in the
 * sidebar, the mission board and the tasking panel, so the player always
 * sees what the operation is asking for today.
 */
export function mechanicRows(state: GameState): HTMLDivElement[] {
  const mission = state.mission;
  if (!mission) return [];
  const def = missionDef(mission.defId);
  const m = mission.mech ?? {};
  const rows: HTMLDivElement[] = [];

  switch (def.mechanic) {
    case 'contacts': {
      const open = (m.found ?? 0) - (m.identified ?? 0);
      rows.push(
        statRow('Contacts identified', `${m.identified ?? 0} / ${m.found ?? 0}`, open >= 4 ? 'bad' : open > 0 ? 'warn' : 'good'),
      );
      break;
    }
    case 'threat': {
      const tomorrow = m.threatTomorrow ?? 0;
      const have = airDefence(state);
      const need = defenceNeeded(tomorrow);
      rows.push(
        statRow('Raid forecast', t(THREAT_LABELS[tomorrow] ?? 'NONE', 'threat'), tomorrow >= 2 ? 'bad' : tomorrow === 1 ? 'warn' : 'good'),
        statRow('Air defence', `${have.toFixed(1)} / ${need.toFixed(1)}`, have >= need ? 'good' : 'bad'),
        statRow('Raiders through', String(m.leakers ?? 0), (m.leakers ?? 0) > 0 ? 'bad' : 'good'),
      );
      break;
    }
    case 'casualties':
      rows.push(statRow('People brought aboard', `${m.evacuees ?? 0} (${m.injured ?? 0} ${t('hurt')})`, 'good'));
      break;
    case 'window':
      if ((m.windowDays ?? 0) > 0) {
        rows.push(statRow('Strike window', tf('OPEN — {n} days', { n: m.windowDays ?? 0 }), 'good'));
      } else {
        rows.push(statRow('Targeting picture', `${Math.round(m.intel ?? 0)}%`, 'warn'));
      }
      break;
    case 'escalation': {
      const tension = Math.round(m.tension ?? 50);
      rows.push(statRow('Tension', String(tension), tension >= 75 ? 'bad' : tension <= 30 ? 'good' : 'warn'));
      break;
    }
    default:
      break;
  }

  const bonus = bonusFor(def.id);
  const progress = bonusProgress(mission, def);
  if (bonus && progress) {
    rows.push(
      statRow(
        'Bonus objective',
        `${tf(bonus.label, { target: bonus.target })} ${progress.met ? '✓' : `(${progress.current})`}`,
        progress.met ? 'good' : '',
      ),
    );
  }
  return rows;
}

/** One line on the mission board: what the operation asks for, and the bonus. */
export function mechanicSummary(def: MissionDef): HTMLDivElement {
  const box = div('mech-summary');
  if (def.mechanic) append(box, span('mech-label', t(MECHANIC_LABELS[def.mechanic])));
  const bonus = bonusFor(def.id);
  if (bonus) append(box, span('mech-bonus', `${t('Bonus')}: ${tf(bonus.label, { target: bonus.target })}`));
  return box;
}

/** Today's advice for the tasking panel, by mechanic. */
export function mechanicHint(state: GameState): string | null {
  const mission = state.mission;
  if (!mission || state.status !== 'onstation') return null;
  const def = missionDef(mission.defId);
  const m = mission.mech ?? {};
  switch (def.mechanic) {
    case 'contacts':
      return tf('Recon finds contacts and identifies them: {n} still unidentified.', {
        n: (m.found ?? 0) - (m.identified ?? 0),
      });
    case 'threat': {
      const tomorrow = m.threatTomorrow ?? 0;
      return tf('Raid forecast {level}: CAP aloft and the deck alert give {have} of the {need} air defence it needs.', {
        level: t(THREAT_LABELS[tomorrow] ?? 'NONE', 'threat'),
        have: airDefence(state).toFixed(1),
        need: defenceNeeded(tomorrow).toFixed(1),
      });
    }
    case 'casualties':
      return t('Lift brings evacuees and injured aboard — keep food and medical stores up.');
    case 'window':
      return (m.windowDays ?? 0) > 0
        ? t('The strike window is open: strike sorties count for far more today. Put the package up.')
        : tf('Recon builds the targeting picture ({n}%); until the window opens, the day counts for little.', {
            n: Math.round(m.intel ?? 0),
          });
    case 'escalation':
      return tf('Tension {n}: CAP, anti-submarine and recon presence bring it down; at 90 it becomes a flashpoint.', {
        n: Math.round(m.tension ?? 50),
      });
    default:
      return null;
  }
}
