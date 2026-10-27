import type { CampaignMode, GameState } from '../core/types';
import { newCampaign } from '../core/newGame';
import { hasSave, loadAutosave, loadGame } from '../core/save';
import { pickSaveFile } from './saveFile';
import { shipAudio } from './audio';
import { append, button, div, note, span } from './dom';
import { LOCALES, LOCALE_NAMES, getLocale, onLocaleChange, setLocale, t } from '../i18n';

/**
 * The title screen: language, seed, and which campaign to play. Calls
 * `onStart` once with the campaign the player chose, then removes itself.
 */
export function showTitleScreen(host: HTMLElement, onStart: (state: GameState) => void): void {
  const screen = div('title-screen');
  const h1 = document.createElement('h1');
  h1.textContent = 'DECK MASTER';
  append(screen, h1, div('sub', 'USS RESOLUTE — CVN 79'));
  const blurb = div('blurb');
  append(screen, blurb);

  const seedLabel = span('', '');
  const hint = note('');
  // Why the last attempt to load failed, in place of the seed hint.
  // A function, so it follows a change of language.
  let problem: (() => string) | null = null;

  // The language picker sits on the title screen as well as the top bar,
  // so a French player never has to read an English menu to find it.
  const langRow = div('btn-row');
  const langButtons = LOCALES.map((code) =>
    button(LOCALE_NAMES[code], getLocale() === code ? 'primary' : '', () => {
      setLocale(code);
    }),
  );
  append(langRow, ...langButtons);
  append(screen, langRow);

  const paintTitle = () => {
    blurb.textContent = t(
      'Command a nuclear aircraft carrier one day at a time. The ship is the interface: navigate the decks, inspect the spaces, and manage the people who keep it running. Every decision costs something.',
    );
    seedLabel.textContent = t('CAMPAIGN SEED');
    hint.textContent = problem
      ? problem()
      : t('A seed makes a campaign reproducible — the same seed and the same decisions replay exactly.');
    langButtons.forEach((b, i) => {
      b.className = `btn ${getLocale() === LOCALES[i] ? 'primary' : ''}`.trim();
      b.textContent = LOCALE_NAMES[LOCALES[i]!];
    });
    newBtn.textContent = t('NEW DEPLOYMENT — 30 DAYS');
    careerBtn.textContent = t('OPEN CAREER');
    continueBtn.textContent = t('CONTINUE');
    importBtn.textContent = t('LOAD FROM FILE');
  };
  const stopWatching = onLocaleChange(paintTitle);

  const seedRow = div('seed-row');
  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.placeholder = t('random');
  seedInput.style.width = '120px';
  append(seedRow, seedLabel, seedInput);
  append(screen, seedRow);

  const finish = (state: GameState) => {
    stopWatching();
    screen.remove();
    onStart(state);
  };
  const fail = (message: () => string) => {
    problem = message;
    paintTitle();
  };

  const actions = div('btn-row');
  const start = (mode: CampaignMode) => {
    shipAudio.unlock();
    const raw = seedInput.value.trim();
    const seed = raw === '' ? undefined : Number.isFinite(Number(raw))
      ? Number(raw)
      : hashSeed(raw);
    finish(newCampaign(seed, mode));
  };
  // The deployment is the way in: thirty days, clear orders, a grade.
  // The open career is there for players who want the sandbox.
  const newBtn = button('NEW DEPLOYMENT — 30 DAYS', 'primary', () => start('deployment'));
  const careerBtn = button('OPEN CAREER', '', () => start('career'));

  const continueBtn = button('CONTINUE', '', () => {
    shipAudio.unlock();
    const loaded = loadGame() ?? loadAutosave();
    if (loaded) finish(loaded);
    else fail(() => t('No save found'));
  });
  continueBtn.disabled = !hasSave() && loadAutosave() === null;

  const importBtn = button('LOAD FROM FILE', '', () => {
    shipAudio.unlock();
    void pickSaveFile().then((loaded) => {
      if (loaded) finish(loaded);
      else if (loaded === null) {
        fail(() => t('That file is not a Deck Master save, or is from a version too old to load'));
      }
    });
  });

  append(actions, newBtn, careerBtn, continueBtn, importBtn);
  append(screen, actions);
  append(screen, hint);

  paintTitle();
  host.appendChild(screen);
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 1;
}
