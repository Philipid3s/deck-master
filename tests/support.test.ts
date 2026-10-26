import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { startMission } from '../src/core/missions';
import {
  autoAssign,
  computeTasking,
  escortBoost,
  hasPlaneGuard,
  keyAssets,
  tankerBoost,
  trainOnPassage,
} from '../src/core/tasking';
import { crewFactor, isCrewed } from '../src/core/aircrew';
import { isMissionCapable } from '../src/core/aircraft';
import { computeAlerts } from '../src/core/alerts';
import { aircraftType, typeSuitability } from '../src/data/aircraft';
import type { Aircraft, GameState } from '../src/core/types';

function onStation(seed: number, mission: string): GameState {
  const s = newCampaign(seed);
  s.prestige = 2000;
  expect(startMission(s, mission)).toBe(true);
  s.status = 'onstation';
  return s;
}

function addAircraft(s: GameState, typeId: string): Aircraft {
  const template = s.aircraft[0]!;
  const a: Aircraft = {
    ...structuredClone(template),
    id: `test-${typeId}-${s.aircraft.length}`,
    typeId,
    tail: '599',
    deck: 1,
    crewIds: [],
    duty: 'standdown',
    state: 'ready',
    systems: { engine: 95, avionics: 95, airframe: 95 },
    fuel: 95,
    weapons: 95,
  };
  s.aircraft.push(a);
  return a;
}

describe('support duties', () => {
  it('gives each airframe its own job', () => {
    expect(typeSuitability('fa18e', 'tanker')).toBeGreaterThan(0);
    expect(typeSuitability('f35c', 'tanker')).toBe(0);
    expect(typeSuitability('ea18g', 'escort')).toBeGreaterThan(1);
    expect(typeSuitability('fa18e', 'escort')).toBe(0);
    expect(typeSuitability('mh60r', 'asw')).toBeGreaterThan(typeSuitability('mh60s', 'asw'));
    expect(typeSuitability('mh60s', 'planeguard')).toBeGreaterThan(typeSuitability('mh60r', 'planeguard'));
    expect(typeSuitability('mq25', 'tanker')).toBeGreaterThan(typeSuitability('fa18e', 'tanker'));
  });

  it('lets a tanker lengthen the combat sorties', () => {
    const s = onStation(1, 'm-patrol');
    autoAssign(s);
    for (const a of s.aircraft) if (a.duty === 'tanker') a.duty = 'standdown';
    const without = computeTasking(s).contribution;
    const tanker = s.aircraft.find((a) => a.duty === 'standdown' && typeSuitability(a.typeId, 'tanker') > 0 && isCrewed(s, a))!;
    tanker.duty = 'tanker';
    expect(tankerBoost(s)).toBeGreaterThan(0);
    expect(computeTasking(s).contribution).toBeGreaterThan(without);
  });

  it('lets an electronic escort make strike sorties count for more', () => {
    const s = onStation(2, 'm-strike');
    for (const a of s.aircraft) a.duty = 'standdown';
    const strikers = s.aircraft.filter((a) => a.typeId === 'fa18e' && isCrewed(s, a)).slice(0, 3);
    for (const a of strikers) a.duty = 'strike';
    const base = computeTasking(s).contribution;
    const growler = s.aircraft.find((a) => a.typeId === 'ea18g' && isCrewed(s, a))!;
    growler.duty = 'escort';
    expect(escortBoost(s)).toBeGreaterThan(0);
    expect(computeTasking(s).contribution).toBeGreaterThan(base);
  });

  it('puts a plane guard up whenever the automatic order flies anything', () => {
    const s = onStation(3, 'm-patrol');
    autoAssign(s);
    expect(hasPlaneGuard(s)).toBe(true);
    expect(computeTasking(s).warnings.some((w) => w.key.includes('plane guard'))).toBe(false);
  });

  it('counts anti-submarine work where a submarine is part of the threat', () => {
    const s = onStation(4, 'm-convoy');
    autoAssign(s);
    const asw = computeTasking(s).lines.find((l) => l.duty === 'asw')!;
    expect(asw.weight).toBeGreaterThan(0);
    expect(asw.contribution).toBeGreaterThan(0);
  });
});

describe('the MQ-25', () => {
  it('flies with nobody aboard', () => {
    const s = onStation(5, 'm-patrol');
    const drone = addAircraft(s, 'mq25');
    expect(isCrewed(s, drone)).toBe(true);
    expect(crewFactor(s, drone)).toBe(1);
    drone.duty = 'tanker';
    expect(tankerBoost(s)).toBeGreaterThan(0);
  });
});

describe('capability alerts', () => {
  it('flags a key task nothing can fly', () => {
    const s = onStation(6, 'm-convoy');
    for (const a of s.aircraft.filter((x) => x.typeId === 'mh60r')) a.state = 'damaged';
    const alert = computeAlerts(s).find((a) => a.id === 'capability');
    expect(alert).toBeDefined();
    expect(alert!.level).toBe('urgent');
  });

  it('warns when even the best order cannot cover the operation', () => {
    const s = onStation(7, 'm-crisis');
    // Ground most of the wing.
    for (const a of s.aircraft.slice(0, 12)) a.state = 'damaged';
    const ids = computeAlerts(s).map((a) => a.id);
    expect(ids.some((id) => id === 'cover' || id === 'capability')).toBe(true);
  });

  it('stays quiet when the wing can do the job', () => {
    const s = onStation(8, 'm-workups');
    const ids = computeAlerts(s).map((a) => a.id);
    expect(ids).not.toContain('capability');
    expect(ids).not.toContain('cover');
  });
});

describe('work-ups and the airframes the operation depends on', () => {
  function outbound(seed: number, mission: string): GameState {
    const s = newCampaign(seed);
    s.prestige = 2000;
    expect(startMission(s, mission)).toBe(true);
    expect(s.status).toBe('outbound');
    return s;
  }

  it('names the scarce airframes a key task rests on', () => {
    const s = outbound(20, 'm-relief');
    const key = keyAssets(s);
    expect(key.duty).toBe('lift');
    // Every helicopter able to carry the lift is one the operation needs.
    const lifters = s.aircraft.filter(
      (a) => aircraftRole(s, a.id) === 'helo' && isCrewed(s, a) && isMissionCapable(a),
    );
    expect(lifters.length).toBeGreaterThan(0);
    for (const a of lifters) expect(key.ids.has(a.id)).toBe(true);
    // Fighters, of which there are plenty, are not.
    expect(s.aircraft.some((a) => key.ids.has(a.id) && aircraftRole(s, a.id) === 'fighter')).toBe(false);
  });

  it('spares them when work-ups are laid on', () => {
    const s = outbound(21, 'm-relief');
    trainOnPassage(s);
    const key = keyAssets(s);
    expect(s.aircraft.some((a) => key.ids.has(a.id) && a.duty === 'training')).toBe(false);
    expect(s.aircraft.some((a) => a.duty === 'training')).toBe(true);
  });

  it('warns when the player flies them anyway', () => {
    const s = outbound(22, 'm-relief');
    const key = keyAssets(s);
    for (const a of s.aircraft) if (key.ids.has(a.id)) a.duty = 'training';
    expect(computeTasking(s).warnings.some((w) => w.key.includes('depends on'))).toBe(true);
    expect(computeAlerts(s).some((a) => a.id === 'key-training')).toBe(true);
  });
});

function aircraftRole(s: GameState, id: string): string {
  return aircraftType(s.aircraft.find((a) => a.id === id)!.typeId).role;
}
