import type { DeptId, GameState, WatchPolicy } from '../core/types';
import { DEPARTMENTS, DEPT_IDS } from '../data/specialties';
import { WATCH_POLICY_LABELS, WATCH_POLICY_ORDER, watchPolicy, watchSummary } from '../core/watch';
import { statusColor } from '../core/readiness';
import { append, bar, clear, div, note, span } from './dom';
import { t, tf } from '../i18n';

const SHORT: Record<WatchPolicy, string> = {
  surge: 'SRG',
  standard: 'STD',
  rotation: '3W',
};

const POLICY_HINTS: Record<WatchPolicy, string> = {
  surge: 'Surge: nobody is stood down. Everyone on duty today, paid for in fatigue later.',
  standard: 'Standard: the exhausted are stood down to rest, a few at a time.',
  rotation: 'Three watches: people rest before they are worn out. Fewer hands on duty, sharper ones.',
};

/**
 * The watch bill panel: one row per department with its fatigue, how many
 * are resting, and the rotation it runs. Changing a policy takes effect at
 * once, so the rota the player sees is the one the day will be played with.
 */
export function renderWatchBill(
  host: HTMLElement,
  state: GameState,
  onChange: (depts: DeptId[], policy: WatchPolicy) => void,
): void {
  clear(host);

  const head = div('watch-row watch-head');
  append(head, span('w-dept', ''), span('w-fat', t('FATIGUE')), span('w-rest', t('RESTING')));
  const all = div('w-seg');
  for (const p of WATCH_POLICY_ORDER) {
    const b = document.createElement('button');
    b.className = 'w-btn';
    b.textContent = t(SHORT[p], 'watch');
    b.title = tf('All departments: {policy}', { policy: t(WATCH_POLICY_LABELS[p]) });
    b.addEventListener('click', () => onChange([...DEPT_IDS], p));
    all.appendChild(b);
  }
  append(head, all);
  append(host, head);

  for (const dept of DEPT_IDS) {
    const s = watchSummary(state, dept);
    const current = watchPolicy(state, dept);
    const row = div('watch-row');
    const fat = Math.round(s.fatigue);
    const name = span('w-dept', t(DEPARTMENTS[dept].short));
    name.title = t(DEPARTMENTS[dept].name);
    const fatigue = div('w-fat');
    append(fatigue, bar(fat, statusColor(100 - fat)), span('w-num', `${fat}`));
    const resting = span('w-rest', s.resting > 0 ? `${s.resting}/${s.members}` : '—');
    const seg = div('w-seg');
    for (const p of WATCH_POLICY_ORDER) {
      const b = document.createElement('button');
      b.className = `w-btn${p === current ? ' active' : ''}${p === 'surge' && p === current ? ' surge' : ''}`;
      b.textContent = t(SHORT[p], 'watch');
      b.title = t(POLICY_HINTS[p]);
      b.addEventListener('click', () => onChange([dept], p));
      seg.appendChild(b);
    }
    append(row, name, fatigue, resting, seg);
    append(host, row);
  }

  append(
    host,
    note('SRG surge · STD standard · 3W three watches. People resting work at half rate. Moving to a harder-working policy calls back anyone it would not stand down.'),
  );
}
