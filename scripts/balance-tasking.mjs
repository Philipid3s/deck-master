/**
 * Balance probe for the air tasking order.
 *
 * For each mission, reports the objective cover a well-run ship achieves with
 * the starting air wing. Requirements should sit where a good tasking order
 * clears 100% and a careless one clearly does not.
 */
import { newCampaign } from '../src/core/newGame.ts';
import { startMission } from '../src/core/missions.ts';
import { autoAssign, computeTasking } from '../src/core/tasking.ts';
import { MISSIONS } from '../src/data/missions.ts';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

console.log(
  'mission'.padEnd(16),
  'req'.padStart(4),
  'cover'.padStart(7),
  'best'.padStart(6),
  'worst'.padStart(6),
);
console.log('-'.repeat(48));

for (const def of MISSIONS) {
  const covers = [];
  for (const seed of SEEDS) {
    const s = newCampaign(seed);
    s.prestige = 2000;
    // A healthy, rested ship: this is the ceiling the wing can reach.
    for (const c of s.crew) {
      c.fatigue = 10;
      c.morale = 80;
    }
    for (const a of s.aircraft) {
      a.systems.engine = 95;
      a.systems.avionics = 95;
      a.systems.airframe = 95;
      a.fuel = 95;
    }
    s.workOrders.length = 0;
    if (!startMission(s, def.id)) continue;
    // Sorties only count for the objective once the ship is in the area, so
    // put it there — otherwise every mission reads 0%.
    s.status = 'onstation';
    autoAssign(s);
    covers.push(computeTasking(s).ratio);
  }
  if (covers.length === 0) continue;
  const avg = covers.reduce((a, b) => a + b, 0) / covers.length;
  console.log(
    def.id.padEnd(16),
    String(def.sortiesRequired).padStart(4),
    `${(avg * 100).toFixed(0)}%`.padStart(7),
    `${(Math.max(...covers) * 100).toFixed(0)}%`.padStart(6),
    `${(Math.min(...covers) * 100).toFixed(0)}%`.padStart(6),
  );
}
