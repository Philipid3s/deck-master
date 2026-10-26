import type { CarrierStatus, GameState, LogNote } from './types';
import { missionDef } from '../data/missions';

/**
 * The carrier's place in the mission cycle.
 *
 *   port -> outbound -> on station -> inbound -> port
 *
 * The cycle is what gives a campaign its rhythm: you prepare alongside, pay
 * for the passage, do the work, and come home. Nothing can be bought or
 * delivered at sea, so a mission is committed to at the moment you sail.
 */

export const STATUS_LABELS: Record<CarrierStatus, string> = {
  port: 'IN PORT',
  outbound: 'OUTBOUND',
  onstation: 'ON STATION',
  inbound: 'RETURNING',
};

export const STATUS_DESCRIPTIONS: Record<CarrierStatus, string> = {
  port: 'Alongside. Stores, equipment, airframes and people can all come aboard.',
  outbound: 'On passage to the operating area. Nothing can be brought aboard at sea.',
  onstation: 'In the operating area. This is the only place the mission advances.',
  inbound: 'On passage home. The operation is finished; the accounting is not.',
};

export function isInPort(state: GameState): boolean {
  return state.status === 'port';
}

export function isAtSea(state: GameState): boolean {
  return state.status !== 'port';
}

/** Only on station does the mission move. */
export function isOnStation(state: GameState): boolean {
  return state.status === 'onstation';
}

/** Total days a mission occupies: passage out, work, passage home. */
export function missionTotalDays(defId: string): number {
  const def = missionDef(defId);
  return def.transitDays * 2 + def.days;
}

export function statusLabel(state: GameState): string {
  return STATUS_LABELS[state.status];
}

/** "OUTBOUND — 2 days" for the HUD. */
export function statusDetail(state: GameState): LogNote {
  switch (state.status) {
    case 'outbound':
      return {
        key: state.statusDaysLeft === 1 ? 'arrives on station tomorrow' : 'on station in {n} days',
        vars: { n: state.statusDaysLeft },
      };
    case 'inbound':
      return {
        key: state.statusDaysLeft === 1 ? 'alongside tomorrow' : 'alongside in {n} days',
        vars: { n: state.statusDaysLeft },
      };
    case 'onstation':
      return { key: 'in the operating area' };
    default:
      return { key: 'alongside' };
  }
}

/** Reasons a purchase or delivery cannot happen right now. */
export function portOnlyReason(state: GameState): string | null {
  if (isInPort(state)) return null;
  switch (state.status) {
    case 'outbound':
      return 'The ship is on passage — nothing can be brought aboard until it returns to port';
    case 'onstation':
      return 'The ship is on station — nothing can be brought aboard until it returns to port';
    default:
      return 'The ship is on passage home — wait until it is alongside';
  }
}

// ---------------------------------------------------------------------------
// The daily status machine
// ---------------------------------------------------------------------------

export interface StatusTick {
  notes: LogNote[];
  /** True when the ship reached port today, so offers can be refreshed. */
  arrivedInPort: boolean;
  /** True when the ship reached the operating area today. */
  arrivedOnStation: boolean;
}

/**
 * Advance the transit legs. Called during the daily resolution *before* the
 * mission is progressed, so the day the ship arrives on station is the first
 * day it does useful work.
 */
export function advanceOutbound(state: GameState): StatusTick {
  const notes: LogNote[] = [];
  let arrivedOnStation = false;

  if (state.status === 'outbound') {
    state.statusDaysLeft = Math.max(0, state.statusDaysLeft - 1);
    if (state.statusDaysLeft === 0) {
      state.status = 'onstation';
      arrivedOnStation = true;
      const title = state.mission ? missionDef(state.mission.defId).title : '';
      notes.push({ key: 'On station — {title} begins', tvars: { title } });
    } else {
      notes.push({
        key: 'On passage — {n} days to the operating area',
        vars: { n: state.statusDaysLeft },
      });
    }
  }

  return { notes, arrivedInPort: false, arrivedOnStation };
}

/**
 * Advance the homeward leg. Called after the mission has been resolved, so
 * the ship spends its transit days before purchases reopen.
 */
export function advanceInbound(state: GameState): StatusTick {
  const notes: LogNote[] = [];
  let arrivedInPort = false;

  if (state.status === 'inbound') {
    state.statusDaysLeft = Math.max(0, state.statusDaysLeft - 1);
    if (state.statusDaysLeft === 0) {
      state.status = 'port';
      arrivedInPort = true;
      notes.push({ key: 'Alongside. Stores, equipment and personnel can come aboard.' });
    } else {
      notes.push({
        key: 'On passage home — {n} days to port',
        vars: { n: state.statusDaysLeft },
      });
    }
  }

  return { notes, arrivedInPort, arrivedOnStation: false };
}

/** Begin the homeward leg once the operation is finished. */
export function beginReturnTransit(state: GameState, transitDays: number): LogNote {
  state.status = 'inbound';
  state.statusDaysLeft = Math.max(1, transitDays);
  return {
    key: 'Detached from the operating area — {n} days to port',
    vars: { n: state.statusDaysLeft },
  };
}

/** Begin the outbound leg when a mission is accepted. */
export function beginOutboundTransit(state: GameState, transitDays: number): void {
  state.status = 'outbound';
  state.statusDaysLeft = Math.max(1, transitDays);
}
