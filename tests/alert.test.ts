import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { startMission } from '../src/core/missions';
import {
  ALERT_SPOTS,
  alertBoard,
  alertProblem,
  autoAssign,
  computeTasking,
  setDuty,
  sortieCapacity,
} from '../src/core/tasking';
import { aircraftType } from '../src/data/aircraft';
import type { GameState } from '../src/core/types';

function onStation(seed: number): GameState {
  const s = newCampaign(seed);
  s.prestige = 2000;
  expect(startMission(s, 'm-patrol')).toBe(true);
  s.status = 'onstation';
  return s;
}

const fighterOnDeck = (s: GameState) =>
  s.aircraft.find((a) => a.deck === 1 && aircraftType(a.typeId).role === 'fighter' && alertProblem(s, a) === null);

describe('deck alert', () => {
  it('only counts airframes really ready to launch', () => {
    const s = onStation(1);
    for (const a of s.aircraft) a.duty = 'standdown';
    const a = fighterOnDeck(s)!;
    a.duty = 'alert';
    expect(computeTasking(s).alertCount).toBe(1);

    a.weapons = 10;
    expect(alertProblem(s, a)).toBe('weapons');
    expect(computeTasking(s).alertCount).toBe(0);

    a.weapons = 90;
    a.fuel = 40; // enough to fly, not enough to sit alert
    expect(alertProblem(s, a)).toBe('fuel');
  });

  it('does not count an airframe sitting in the hangar', () => {
    const s = onStation(2);
    const hangar = s.aircraft.find((a) => a.deck === 2)!;
    hangar.duty = 'alert';
    expect(alertProblem(s, hangar)).toBe('hangar');
    expect(alertBoard(s).ready).not.toContain(hangar);
  });

  it('holds at most the launch spots, the rest stand by', () => {
    const s = onStation(3);
    for (const a of s.aircraft) a.duty = 'alert';
    const board = alertBoard(s);
    expect(board.ready.length).toBeLessThanOrEqual(ALERT_SPOTS);
    expect(board.ready.length + board.standingBy.length).toBe(s.aircraft.length);
  });

  it('costs deck cycles: alert airframes hold catapults', () => {
    const s = onStation(4);
    for (const a of s.aircraft) a.duty = 'standdown';
    const free = computeTasking(s).sortieCapacity;
    let posted = 0;
    for (const a of s.aircraft) {
      if (posted >= 4) break;
      if (a.deck === 1 && alertProblem(s, a) === null) {
        a.duty = 'alert';
        posted++;
      }
    }
    expect(computeTasking(s).alertCount).toBeGreaterThanOrEqual(2);
    expect(computeTasking(s).sortieCapacity).toBeLessThan(free);
    expect(free).toBe(Math.max(2, sortieCapacity(s)));
  });

  it('brings an airframe up from the hangar when it is tasked to alert', () => {
    const s = onStation(5);
    // Make room on the flight deck first.
    const parked = s.aircraft.find((a) => a.deck === 1)!;
    parked.deck = 2;
    const hangar = s.aircraft.find((a) => a.deck === 2 && a !== parked)!;
    setDuty(s, hangar.id, 'alert');
    expect(hangar.deck).toBe(1);
  });

  it('is laid on by the automatic tasking order, within the spots', () => {
    const s = onStation(6);
    autoAssign(s);
    const board = alertBoard(s);
    expect(board.ready.length).toBeGreaterThan(0);
    expect(board.ready.length).toBeLessThanOrEqual(ALERT_SPOTS);
    expect(board.standingBy.length).toBe(0);
  });
});
