import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { startMission } from '../src/core/missions';
import { computeReadiness, explainReadiness } from '../src/core/readiness';
import { autoAssign, trainOnPassage } from '../src/core/tasking';
import { applyWatchBill, setWatchPolicy, watchPolicy, DEFAULT_WATCH_POLICY } from '../src/core/watch';
import { deploymentObjectives } from '../src/core/deployment';
import { effectiveness, RESTING_OUTPUT } from '../src/core/crew';
import { DEPT_IDS } from '../src/data/specialties';
import { FLYING_DUTIES, type GameState } from '../src/core/types';

function allPolicy(s: GameState, p: 'surge' | 'standard' | 'rotation'): void {
  for (const d of DEPT_IDS) setWatchPolicy(s, d, p);
}

function play(s: GameState, days: number): void {
  for (let i = 0; i < days && !s.campaignEnd; i++) {
    s.pendingEvents = [];
    endDay(s);
  }
}

const avgFatigue = (s: GameState) => s.crew.reduce((t, c) => t + c.fatigue, 0) / s.crew.length;

describe('watch bill', () => {
  it('defaults every department to the standard rotation', () => {
    const s = newCampaign(1);
    for (const d of DEPT_IDS) expect(watchPolicy(s, d)).toBe(DEFAULT_WATCH_POLICY);
  });

  it('stands the most tired down first, within the department cap', () => {
    const s = newCampaign(2);
    allPolicy(s, 'rotation');
    const deck = s.crew.filter((c) => c.department === 'DECK' && c.status === 'working');
    deck.forEach((c, i) => (c.fatigue = 40 + i * 4));
    applyWatchBill(s);
    const resting = deck.filter((c) => c.status === 'resting');
    expect(resting.length).toBeGreaterThan(0);
    expect(resting.length).toBeLessThanOrEqual(Math.floor(s.crew.filter((c) => c.department === 'DECK').length * 0.4));
    const minResting = Math.min(...resting.map((c) => c.fatigue));
    const maxWorking = Math.max(...deck.filter((c) => c.status === 'working').map((c) => c.fatigue));
    expect(minResting).toBeGreaterThanOrEqual(maxWorking > 52 ? 52 : 0);
  });

  it('never stands anyone down on surge', () => {
    const s = newCampaign(3);
    allPolicy(s, 'surge');
    for (const c of s.crew) c.fatigue = 95;
    expect(applyWatchBill(s).stoodDown).toBe(0);
  });

  it('returns rested people to duty', () => {
    const s = newCampaign(4);
    const c = s.crew.find((x) => x.status === 'working')!;
    c.status = 'resting';
    c.fatigue = 10;
    expect(applyWatchBill(s).returned).toBeGreaterThanOrEqual(1);
    expect(c.status).toBe('working');
  });

  it('keeps a hard-run ship measurably fresher than surge', () => {
    const surge = newCampaign(11);
    const rota = newCampaign(11);
    allPolicy(surge, 'surge');
    allPolicy(rota, 'rotation');
    for (const s of [surge, rota]) s.tempo = 'high';
    for (let i = 0; i < 12; i++) {
      for (const s of [surge, rota]) {
        s.tempo = 'high';
        s.pendingEvents = [];
        endDay(s);
      }
    }
    expect(avgFatigue(rota)).toBeLessThan(avgFatigue(surge) - 5);
  });

  it('costs output: someone resting works at half rate', () => {
    const s = newCampaign(5);
    const c = s.crew.find((x) => x.status === 'working')!;
    const onDuty = effectiveness(c);
    c.status = 'resting';
    expect(effectiveness(c)).toBeCloseTo(onDuty * RESTING_OUTPUT);
  });

  it('calls back the rested when a department moves to a harder-working policy', () => {
    const s = newCampaign(6);
    setWatchPolicy(s, 'DECK', 'rotation');
    const deck = s.crew.filter((c) => c.department === 'DECK' && c.status === 'working');
    const [fresh, spent] = [deck[0]!, deck[1]!];
    fresh.status = 'resting';
    fresh.fatigue = 45;
    spent.status = 'resting';
    spent.fatigue = 90;
    expect(setWatchPolicy(s, 'DECK', 'standard')).toBe(1);
    expect(fresh.status).toBe('working');
    // Nobody past the standard threshold is turned out, even for a surge.
    expect(setWatchPolicy(s, 'DECK', 'surge')).toBe(0);
    expect(spent.status).toBe('resting');
  });

  it('calls nobody back when a department moves to more rest', () => {
    const s = newCampaign(7);
    const c = s.crew.find((x) => x.department === 'ENG' && x.status === 'working')!;
    c.status = 'resting';
    c.fatigue = 40;
    expect(setWatchPolicy(s, 'ENG', 'rotation')).toBe(0);
    expect(c.status).toBe('resting');
  });

  it('replays deterministically from the seed', () => {
    const a = newCampaign(21);
    const b = newCampaign(21);
    allPolicy(a, 'rotation');
    allPolicy(b, 'rotation');
    play(a, 8);
    play(b, 8);
    expect(a.crew.map((c) => `${c.status}:${c.fatigue.toFixed(3)}`)).toEqual(
      b.crew.map((c) => `${c.status}:${c.fatigue.toFixed(3)}`),
    );
  });
});

describe('the passage', () => {
  it('rests the wing when auto-tasked in transit instead of flying for nothing', () => {
    const s = newCampaign(5);
    startMission(s, s.missionOffers[0]!);
    expect(s.status).toBe('outbound');
    autoAssign(s);
    expect(s.aircraft.some((a) => FLYING_DUTIES.includes(a.duty))).toBe(false);
  });

  it('banks work-up progress for arrival, capped', () => {
    const s = newCampaign(6);
    startMission(s, 'm-patrol');
    expect(s.status).toBe('outbound');
    const tasked = trainOnPassage(s);
    expect(tasked).toBeGreaterThan(0);
    s.pendingEvents = [];
    endDay(s);
    expect(s.mission!.prep ?? 0).toBeGreaterThan(0);
    expect(s.mission!.prep ?? 0).toBeLessThanOrEqual(12);
    expect(s.mission!.progressModifier).toBeGreaterThan(0);
  });

  it('is lighter on the crew than a day on station', () => {
    const passage = newCampaign(7);
    const station = newCampaign(7);
    for (const s of [passage, station]) {
      allPolicy(s, 'surge');
      startMission(s, 'm-patrol');
      for (const a of s.aircraft) a.duty = 'standdown';
      for (const c of s.crew) c.fatigue = 20;
    }
    station.status = 'onstation';
    passage.pendingEvents = [];
    station.pendingEvents = [];
    endDay(passage);
    endDay(station);
    expect(avgFatigue(passage)).toBeLessThan(avgFatigue(station));
  });
});

describe('why readiness moved', () => {
  it('names the component that moved, with its cause', () => {
    const s = newCampaign(8);
    const before = { ...s.readiness };
    for (const c of s.crew) c.fatigue = 90;
    const after = computeReadiness(s);
    const drivers = explainReadiness(before, after, s);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers.some((d) => d.component === 'crew' && d.impact < 0)).toBe(true);
    expect(drivers[0]!.cause.key).toBeTruthy();
  });

  it('is attached to every daily report', () => {
    const s = newCampaign(9);
    s.pendingEvents = [];
    const report = endDay(s);
    expect(Array.isArray(report.readinessDrivers)).toBe(true);
  });
});

describe('objective states', () => {
  it('reads secondaries as on track, not done, before the last day', () => {
    const s = newCampaign(10, 'deployment');
    for (const c of s.crew) c.morale = 95;
    const morale = deploymentObjectives(s).find((o) => o.id === 'morale')!;
    expect(morale.met).toBe(true);
    expect(morale.state).toBe('ontrack');
  });

  it('warns when too few days remain for the operations still needed', () => {
    const s = newCampaign(10, 'deployment');
    s.day = 22;
    const ops = deploymentObjectives(s).find((o) => o.primary)!;
    expect(ops.state).toBe('atrisk');
    s.day = 2;
    expect(deploymentObjectives(s).find((o) => o.primary)!.state).toBe('ontrack');
  });
});
