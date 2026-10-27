import type { GameState } from '../core/types';
import type { HitTarget } from '../render/deckView';
import { PAL, DEPT_ACCENT } from '../render/palette';
import { getRoom } from '../data/decks';
import { SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { aircraftType } from '../data/aircraft';
import { statusLabel, effectiveness, isAvailable, primarySkill } from '../core/crew';
import { aircraftStatusText, aircraftReadiness } from '../core/aircraft';
import { append, clear, div, span } from './dom';
import { t } from '../i18n';

/**
 * Hover readout for rooms, crew and aircraft (spec section 16), anchored
 * near the cursor without leaving the stage. Hidden when nothing is hovered.
 */
export function renderHoverTooltip(
  tooltip: HTMLElement,
  hover: HitTarget,
  s: GameState,
  mouse: { x: number; y: number },
): void {
  if (!hover) {
    tooltip.classList.remove('show');
    return;
  }
  clear(tooltip);

  const row = (k: string, v: string) => {
    const r = div('tip-row');
    append(r, span('', t(k)), span('', v));
    return r;
  };

  if (hover.kind === 'room') {
    const room = getRoom(hover.id);
    const rs = s.rooms[room.id]!;
    const occupants = s.crew.filter((c) => c.assignmentRoomId === room.id && isAvailable(c)).length;
    const orders = s.workOrders.filter((w) => w.roomId === room.id).length;
    append(tooltip, div('tip-title', t(room.name)));
    append(
      tooltip,
      row('Personnel', `${occupants} / ${room.capacity}`),
      row('Workload', `${Math.round(rs.workload)}%`),
      row('Efficiency', `${Math.round(rs.efficiency)}%`),
      row('Active jobs', String(orders)),
      row('Equipment', `${Math.round(rs.condition)}%`),
    );
    const accent = DEPT_ACCENT[room.department];
    if (accent) tooltip.style.borderColor = accent;
  } else if (hover.kind === 'crew') {
    const c = s.crew.find((x) => x.id === hover.id);
    if (!c) {
      tooltip.classList.remove('show');
      return;
    }
    append(tooltip, div('tip-title', c.name));
    append(
      tooltip,
      row('Rank', rank(c.rank).code),
      row('Specialty', t(SPECIALTIES[c.primary].short)),
      row('Skill', String(Math.round(primarySkill(c)))),
      row('Status', t(statusLabel(c), 'status')),
      row('Morale', `${Math.round(c.morale)}%`),
      row('Fatigue', `${Math.round(c.fatigue)}%`),
      row('Output', `${Math.round(effectiveness(c) * 100)}%`),
    );
    tooltip.style.borderColor = SPECIALTIES[c.primary].color;
  } else {
    const a = s.aircraft.find((x) => x.id === hover.id);
    if (!a) {
      tooltip.classList.remove('show');
      return;
    }
    const type = aircraftType(a.typeId);
    append(tooltip, div('tip-title', `${type.name} #${a.tail}`));
    append(
      tooltip,
      row('Status', t(aircraftStatusText(a), 'aircraft')),
      row('Readiness', `${Math.round(aircraftReadiness(a))}%`),
      row('Engine', `${Math.round(a.systems.engine)}%`),
      row('Avionics', `${Math.round(a.systems.avionics)}%`),
      row('Airframe', `${Math.round(a.systems.airframe)}%`),
      row('Fuel', `${Math.round(a.fuel)}%`),
    );
    tooltip.style.borderColor = PAL.aircraftAccent;
  }

  const stage = tooltip.parentElement!.getBoundingClientRect();
  const tw = 230;
  tooltip.style.left = `${Math.min(stage.width - tw - 10, mouse.x + 14)}px`;
  tooltip.style.top = `${Math.min(stage.height - 170, mouse.y + 12)}px`;
  tooltip.classList.add('show');
}
