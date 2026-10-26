import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/core/newGame';
import { endDay } from '../src/core/simulation';
import { startMission } from '../src/core/missions';
import { autoAssign, computeTasking, sortieCapacity } from '../src/core/tasking';
import {
  AIRCRAFT_CAPACITY,
  aircraftCapacityUsed,
  canBuyAircraft,
  canBuyEquipment,
  equipmentBonus,
  orderAircraft,
  orderEquipment,
  pendingDeliveries,
} from '../src/core/procurement';
import { AIRCRAFT_TYPES, aircraftType } from '../src/data/aircraft';
import { openWorkOrder } from '../src/core/aircraft';
import { EQUIPMENT } from '../src/data/equipment';
import { serialize, deserialize } from '../src/core/save';
import type { GameState } from '../src/core/types';

function quietDays(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    state.pendingEvents = [];
    endDay(state);
  }
}

/** Enough money and standing to buy anything in the catalogue. */
function rich(state: GameState): void {
  state.credits = 20_000_000;
  state.prestige = 3000;
}

describe('ordering aircraft', () => {
  it('does not deliver instantly', () => {
    const s = newCampaign(1234);
    rich(s);
    const before = s.aircraft.length;
    expect(orderAircraft(s, 'mh60r')).toBe(true);

    // Still on order, not aboard.
    expect(s.aircraft.length).toBe(before);
    expect(pendingDeliveries(s)).toHaveLength(1);
    expect(pendingDeliveries(s)[0]!.daysLeft).toBe(aircraftType('mh60r').leadDays);

    // Arrives exactly on its lead day, not before.
    quietDays(s, aircraftType('mh60r').leadDays - 1);
    expect(s.aircraft.length).toBe(before);

    quietDays(s, 1);
    expect(s.aircraft.length).toBe(before + 1);
    expect(s.deliveries).toHaveLength(0);
  });

  it('charges credits and prestige at order time', () => {
    const s = newCampaign(11);
    rich(s);
    const type = aircraftType('e2d');
    const credits = s.credits;
    const prestige = s.prestige;

    expect(orderAircraft(s, 'e2d')).toBe(true);
    expect(s.credits).toBe(credits - type.costCredits);
    expect(s.prestige).toBe(prestige - type.costPrestige);
  });

  it('gates the better airframes behind prestige', () => {
    const s = newCampaign(22);
    s.credits = 20_000_000;
    s.prestige = 0;

    // An F-35C detachment needs a reputation, not just money.
    expect(canBuyAircraft(s, 'f35c').ok).toBe(false);
    expect(orderAircraft(s, 'f35c')).toBe(false);

    s.prestige = 3000;
    expect(canBuyAircraft(s, 'f35c').ok).toBe(true);
  });

  it('refuses an order with no money', () => {
    const s = newCampaign(33);
    s.credits = 1000;
    s.prestige = 3000;
    expect(orderAircraft(s, 'fa18e')).toBe(false);
    expect(s.deliveries).toHaveLength(0);
  });

  it('respects physical parking capacity, orders included', () => {
    const s = newCampaign(44);
    rich(s);

    // Fill every remaining spot with orders.
    let ordered = 0;
    while (canBuyAircraft(s, 'mh60r').ok) {
      expect(orderAircraft(s, 'mh60r')).toBe(true);
      ordered++;
      expect(ordered).toBeLessThan(60); // guard against a runaway loop
    }
    expect(aircraftCapacityUsed(s)).toBe(AIRCRAFT_CAPACITY);
    expect(canBuyAircraft(s, 'mh60r').ok).toBe(false);

    // Everything ordered actually arrives and is parked.
    quietDays(s, 12);
    expect(s.aircraft.length).toBe(AIRCRAFT_CAPACITY);
    for (const a of s.aircraft) {
      expect(a.deck === 1 || a.deck === 2).toBe(true);
    }
    // No two airframes share a spot.
    const spots = s.aircraft.map((a) => `${a.deck}:${a.x},${a.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('gives a delivered airframe a duty and a unique tail', () => {
    const s = newCampaign(55);
    rich(s);
    orderAircraft(s, 'mh60r');
    quietDays(s, aircraftType('mh60r').leadDays);

    const tails = s.aircraft.map((a) => a.tail);
    expect(new Set(tails).size).toBe(tails.length);
    for (const a of s.aircraft) expect(a.duty).toBeDefined();
  });

  it('lets bought lift close the gap on a lift-heavy mission', () => {
    // Two identical ships. One buys heavy-lift helicopters alongside before
    // sailing; the other does not. Both then deploy on the same mission.
    const plain = newCampaign(66);
    const bought = newCampaign(66);
    for (const s of [plain, bought]) rich(s);

    // One airframe, not three: an MH-60S needs four aircrew and the wing
    // carries only a small spare margin, so buying three would leave one of
    // them with nobody to fly it. Airframes without crews are covered in the
    // aircrew tests.
    expect(orderAircraft(bought, 'mh60s')).toBe(true);
    // Deliveries only happen in port, so wait alongside for them.
    quietDays(bought, aircraftType('mh60s').leadDays + 1);
    quietDays(plain, aircraftType('mh60s').leadDays + 1);
    expect(bought.aircraft.length).toBe(plain.aircraft.length + 1);

    for (const s of [plain, bought]) {
      expect(startMission(s, 'm-evacuation')).toBe(true);
      // Contribution only counts on station, so sail there first.
      s.status = 'onstation';
      autoAssign(s);
    }

    // The gain is in the mix rather than the count: an automatic tasking
    // order stops once the requirement is met, so an extra lift airframe
    // meets it with better-suited sorties — more cover per airframe flown,
    // and the airframes saved go to the deck alert instead.
    // Mission sorties only: support (plane guard, tanker) flies too but
    // works through the others rather than counting itself.
    const perSortie = (s: typeof plain) => {
      const t = computeTasking(s);
      const mission = t.lines.filter((l) => l.weight > 0).reduce((n, l) => n + l.flying, 0);
      return t.contribution / Math.max(1, mission);
    };
    expect(computeTasking(bought).ratio).toBeGreaterThan(0.9);
    expect(perSortie(bought)).toBeGreaterThan(perSortie(plain));
  });
});

describe('ordering equipment', () => {
  it('delivers after its lead time and accumulates', () => {
    const s = newCampaign(77);
    rich(s);
    expect(orderEquipment(s, 'eq-tractor')).toBe(true);
    expect(equipmentBonus(s, 'sortieCapacity')).toBe(0);

    quietDays(s, 3);
    expect(s.equipment['eq-tractor']).toBe(1);
    expect(equipmentBonus(s, 'sortieCapacity')).toBe(1);

    expect(orderEquipment(s, 'eq-tractor')).toBe(true);
    quietDays(s, 3);
    expect(s.equipment['eq-tractor']).toBe(2);
    expect(equipmentBonus(s, 'sortieCapacity')).toBe(2);
  });

  it('caps at what the ship can hold, counting orders in transit', () => {
    const s = newCampaign(88);
    rich(s);
    const def = EQUIPMENT.find((e) => e.id === 'eq-tractor')!;

    for (let i = 0; i < def.max; i++) {
      expect(orderEquipment(s, 'eq-tractor')).toBe(true);
    }
    // Already at the cap through orders alone.
    expect(canBuyEquipment(s, 'eq-tractor').ok).toBe(false);
    quietDays(s, 5);
    expect(s.equipment['eq-tractor']).toBe(def.max);
    expect(canBuyEquipment(s, 'eq-tractor').ok).toBe(false);
  });

  it('gates equipment behind prestige', () => {
    const s = newCampaign(99);
    s.credits = 20_000_000;
    s.prestige = 0;
    expect(canBuyEquipment(s, 'eq-datalink').ok).toBe(false);
    s.prestige = 3000;
    expect(canBuyEquipment(s, 'eq-datalink').ok).toBe(true);
  });
});

describe('equipment changes the simulation', () => {
  it('tow tractors raise the sortie capacity', () => {
    const plain = newCampaign(2024);
    const equipped = newCampaign(2024);
    equipped.equipment['eq-tractor'] = 4;

    expect(sortieCapacity(equipped)).toBe(sortieCapacity(plain) + 4);
  });

  it('tooling speeds maintenance', () => {
    const plain = newCampaign(4242);
    const equipped = newCampaign(4242);
    equipped.equipment['eq-gse'] = 4;
    equipped.equipment['eq-toolset'] = 4;

    // Load both shops with the same heavy backlog, then measure a single day
    // of labour. Running to completion would just saturate both.
    const outstanding = (s: GameState) =>
      s.workOrders.reduce((t, w) => t + (w.labourRequired - w.labourDone), 0);
    const required: Record<string, number> = {};

    for (const [name, s] of [
      ['plain', plain],
      ['equipped', equipped],
    ] as [string, GameState][]) {
      s.supplies.parts = 100;
      for (const a of s.aircraft) {
        openWorkOrder(s, a.id, 'avionics', 3);
      }
      required[name] = s.workOrders.reduce((t, w) => t + w.labourRequired, 0);
      s.pendingEvents = [];
      endDay(s);
    }

    // Work applied, counting orders that were finished and closed — summing
    // labourDone alone would go *down* as soon as an order left the list.
    const applied = (name: string, s: GameState) => required[name]! - outstanding(s);
    expect(applied('equipped', equipped)).toBeGreaterThan(applied('plain', plain));
  });

  it('corrosion control reduces airframe wear', () => {
    const plain = newCampaign(31337);
    const equipped = newCampaign(31337);
    equipped.equipment['eq-wearkit'] = 3;
    for (const s of [plain, equipped]) {
      s.prestige = 3000;
      expect(startMission(s, 'm-crisis')).toBe(true);
      s.status = 'onstation';
      autoAssign(s);
    }
    quietDays(plain, 10);
    quietDays(equipped, 10);

    const wear = (s: GameState) => s.aircraft.reduce((t, a) => t + a.systems.airframe, 0);
    expect(wear(equipped)).toBeGreaterThan(wear(plain));
  });

  it('munitions and datalink take risk off a mission', () => {
    const plain = newCampaign(606);
    const equipped = newCampaign(606);
    equipped.equipment['eq-munitions'] = 3;
    equipped.equipment['eq-datalink'] = 2;

    for (const s of [plain, equipped]) {
      s.prestige = 3000;
      expect(startMission(s, 'm-strike')).toBe(true);
      s.status = 'onstation';
      s.mission!.riskModifier = 40;
      s.pendingEvents = [];
      endDay(s);
    }
    expect(equipped.mission!.riskModifier).toBeLessThan(plain.mission!.riskModifier);
  });

  it('safety equipment reduces injuries over a long push', () => {
    const plain = newCampaign(808);
    const equipped = newCampaign(808);
    equipped.equipment['eq-safety'] = 3;

    for (const s of [plain, equipped]) {
      s.tempo = 'maximum';
      for (const c of s.crew) c.fatigue = 90;
    }
    for (let i = 0; i < 20; i++) {
      plain.tempo = 'maximum';
      equipped.tempo = 'maximum';
      plain.pendingEvents = [];
      equipped.pendingEvents = [];
      endDay(plain);
      endDay(equipped);
    }
    expect(equipped.totalCasualties).toBeLessThan(plain.totalCasualties);
  });

  it('berthing fittings speed fatigue recovery', () => {
    const plain = newCampaign(1357);
    const equipped = newCampaign(1357);
    equipped.equipment['eq-bunks'] = 3;

    for (const s of [plain, equipped]) {
      s.tempo = 'low';
      for (const c of s.crew) {
        c.fatigue = 80;
        c.status = 'resting';
      }
    }
    // One day only: rested crew return to duty once recovered, and a longer
    // run would measure them working again rather than resting.
    plain.pendingEvents = [];
    equipped.pendingEvents = [];
    endDay(plain);
    endDay(equipped);

    const fatigue = (s: GameState) => s.crew.reduce((t, c) => t + c.fatigue, 0);
    expect(fatigue(equipped)).toBeLessThan(fatigue(plain));
  });
});

describe('procurement persistence', () => {
  it('survives a save/load round trip with orders in transit', () => {
    const s = newCampaign(2468);
    rich(s);
    orderAircraft(s, 'fa18e');
    orderEquipment(s, 'eq-tractor');
    quietDays(s, 2);

    const restored = deserialize(serialize(s))!;
    expect(restored).not.toBeNull();
    expect(restored.deliveries).toHaveLength(s.deliveries.length);

    quietDays(s, 8);
    quietDays(restored, 8);
    expect(serialize(restored)).toBe(serialize(s));
    expect(restored.aircraft.length).toBe(s.aircraft.length);
  });

  it('keeps every catalogue entry buyable at full standing', () => {
    for (const type of AIRCRAFT_TYPES) {
      const s = newCampaign(7);
      rich(s);
      expect(canBuyAircraft(s, type.id).ok, `${type.id} is unbuyable`).toBe(true);
    }
    for (const item of EQUIPMENT) {
      const s = newCampaign(7);
      rich(s);
      expect(canBuyEquipment(s, item.id).ok, `${item.id} is unbuyable`).toBe(true);
    }
  });
});
