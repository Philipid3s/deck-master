/**
 * Balance probe for the 30-day deployment.
 *
 * Plays the deployment headless across thirty-six seeds with each scripted
 * player in `deploymentBots.ts` and reports what they achieve. The orders
 * should separate the player who manages the watch bill from the one who
 * sets it once, and the top grade should need better than any of them.
 *
 *   npm run balance:deployment            every player, one line each
 *   BOT=careful npm run balance:deployment   one player, seed by seed
 *   SEEDS=12 SEED_OFFSET=24 ...              a different block of seeds
 */
import { BOTS, botRecord } from './deploymentBots.ts';

const OFFSET = Number(process.env.SEED_OFFSET ?? 0);
const COUNT = Number(process.env.SEEDS ?? 36);
const SEEDS = Array.from({ length: COUNT }, (_, i) => OFFSET + i + 1);
const only = process.env.BOT;

for (const bot of only ? [only] : BOTS) {
  const { wins, stars, results } = botRecord(bot, SEEDS);
  if (only) {
    for (const { seed, state: s } of results) {
      const morale = s.crew.reduce((a, c) => a + c.morale, 0) / s.crew.length;
      console.log(
        `seed ${String(seed).padStart(2)}`,
        `missions ${s.missionHistory.map((m) => `${m.defId.slice(2)}:${m.outcome}`).join(',') || '-'}`,
        `prestige ${s.prestige}`,
        `ready ${Math.round(s.readiness.overall)}`,
        `morale ${Math.round(morale)}`,
        `cas ${s.totalCasualties}`,
        s.campaignEnd ? `won=${s.campaignEnd.won} stars=${s.campaignEnd.stars ?? 0}` : '',
      );
    }
  }
  console.log(`${bot.padEnd(9)} ${String(wins).padStart(2)}/${SEEDS.length} wins  ${stars.toFixed(2)} stars`);
}
