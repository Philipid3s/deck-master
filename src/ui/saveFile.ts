import type { GameState } from '../core/types';
import { deserialize, serialize } from '../core/save';
import { isDeployment } from '../core/deployment';

/**
 * Campaigns as files.
 *
 * Browser storage is one slot per browser and goes with the site data, so a
 * campaign can also be written out as the same JSON the slot holds and read
 * back on any machine. Loading goes through `deserialize`, so an older file
 * is migrated exactly as an older slot would be.
 */
export function downloadSave(state: GameState): void {
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = saveFileName(state);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function saveFileName(state: GameState): string {
  const mode = isDeployment(state) ? 'deployment' : 'career';
  return `deck-master-${mode}-day${state.day}-seed${state.seed}.json`;
}

/**
 * Asks the player for a save file. Resolves to the campaign, to null for a
 * file that is not a readable save, or to undefined if nothing was chosen.
 */
export function pickSaveFile(): Promise<GameState | null | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      file.text().then(
        (json) => resolve(deserialize(json)),
        () => resolve(null),
      );
    });
    input.addEventListener('cancel', () => resolve(undefined));
    input.click();
  });
}
