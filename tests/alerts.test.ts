import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { computeAlerts } from '../src/core/alerts';
import { relieveOfficer } from '../src/core/council';
import { startMission } from '../src/core/missions';

const ids = (s: Parameters<typeof computeAlerts>[0]) => computeAlerts(s).map((a) => a.id);

describe('alerts', () => {
  it('flags the day’s pending decisions', () => {
    const s = newCampaign(1);
    expect(s.pendingEvents.length).toBeGreaterThan(0);
    expect(ids(s)).toContain('decisions');
  });

  it('appears with its cause and disappears when it is dealt with', () => {
    const s = newCampaign(2);
    expect(ids(s)).not.toContain('vacant');
    relieveOfficer(s, 'cheng');
    expect(ids(s)).toContain('vacant');
    s.pendingEvents = [];
    expect(ids(s)).not.toContain('decisions');
  });

  it('puts the urgent ones first', () => {
    const s = newCampaign(3);
    s.credits = -50000;
    s.crew[0]!.promotable = true;
    const alerts = computeAlerts(s);
    const order = { urgent: 0, warn: 1, info: 2 };
    for (let i = 1; i < alerts.length; i++) {
      expect(order[alerts[i]!.level]).toBeGreaterThanOrEqual(order[alerts[i - 1]!.level]);
    }
    expect(alerts[0]!.level).toBe('urgent');
  });
});

describe('readiness alerts', () => {
  it('counts the airframes out of service', () => {
    const s = newCampaign(5);
    for (const a of s.aircraft.slice(0, 7)) a.state = 'damaged';
    const alert = computeAlerts(s).find((a) => a.id === 'aircraft-down')!;
    expect(alert).toBeDefined();
    expect(alert.count).toBeGreaterThanOrEqual(7);
    expect(alert.level).toBe('urgent');
  });

  it('flags posts short of people', () => {
    const s = newCampaign(6);
    // Send most of one post on leave: it falls below strength.
    const post = s.crew[10]!.postId;
    for (const c of s.crew.filter((x) => x.postId === post)) {
      c.status = 'leave';
      c.awayDays = 5;
    }
    expect(ids(s)).toContain('manning');
  });

  it('warns when the active operation is below its requirements', () => {
    const s = newCampaign(7);
    s.prestige = 2000; // the crisis needs standing to be offered at all
    expect(startMission(s, 'm-crisis')).toBe(true);
    s.readiness.overall = 10;
    s.readiness.crew = 10;
    expect(ids(s)).toContain('requirements');
  });
});

describe('the journal', () => {
  it('records each day’s notifications, newest first', () => {
    const s = newCampaign(4);
    s.pendingEvents = [];
    endDay(s);
    s.pendingEvents = [];
    endDay(s);
    const journal = s.journal ?? [];
    expect(journal.length).toBeGreaterThan(0);
    expect(journal[0]!.day).toBeGreaterThanOrEqual(journal[journal.length - 1]!.day);
  });
});
