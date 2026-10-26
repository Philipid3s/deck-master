import { aircraftType } from '../data/aircraft';
import { aircraftDataUrl } from './pixelArt';

/**
 * Airframe pictures for the panels.
 *
 * The panels show the same baked pixel sprite the deck draws, enlarged by a
 * whole number so every art pixel stays square. One source of truth: a type
 * looks identical on the deck, in its context panel, in the crew chart and
 * on its procurement card, and every type has a picture.
 */
export function artElement(typeId: string, className = 'plan-art'): HTMLImageElement | null {
  const small = className.includes('small');
  const img = document.createElement('img');
  img.className = className;
  img.src = aircraftDataUrl(typeId, small ? 2 : 3);
  img.alt = aircraftType(typeId).name;
  return img;
}
