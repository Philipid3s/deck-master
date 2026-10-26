import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { startMission } from '../src/core/missions';
import { autoAssign } from '../src/core/tasking';
import { DUTIES_BY_ID } from '../src/data/aircraft';

describe('the day’s flight records', () => {
  it('records every sortie with its duty and where it was spotted', () => {
    const s = newCampaign(12);
    expect(startMission(s, 'm-patrol')).toBe(true);
    s.status = 'onstation';
    autoAssign(s);
    s.pendingEvents = [];
    const report = endDay(s);
    const flights = report.flights ?? [];
    expect(report.sortiesLaunched).toBeGreaterThan(0);
    expect(flights.length).toBe(report.sortiesLaunched);
    for (const f of flights) {
      expect(DUTIES_BY_ID[f.duty].flies).toBe(true);
      expect([1, 2]).toContain(f.deck);
      expect(s.aircraft.some((a) => a.id === f.aircraftId)).toBe(true);
    }
  });

  it('records nothing on a day nobody flies', () => {
    const s = newCampaign(13);
    for (const a of s.aircraft) a.duty = 'standdown';
    s.pendingEvents = [];
    expect(endDay(s).flights ?? []).toEqual([]);
  });
});
