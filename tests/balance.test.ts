import { describe, expect, it } from 'vitest';
import { botRecord } from '../scripts/deploymentBots';

/**
 * The deployment has to reward managing the ship, not one setting.
 *
 * These are the scripted players from `npm run balance:deployment` over
 * twenty-four seeds. The simulation is deterministic, so this cannot flake;
 * the margins are there so that new content can move the figures a little
 * without failing the build, while a change that lets a single decision win
 * — as three watches everywhere once did, when resting people still did a
 * full day's work — cannot slip through unnoticed.
 */
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);

describe('deployment balance', () => {
  const passive = botRecord('passive', SEEDS);
  const rotation = botRecord('rotation', SEEDS);
  const careful = botRecord('careful', SEEDS);

  it('is lost by a captain who touches nothing', () => {
    expect(passive.wins).toBeLessThanOrEqual(2);
  });

  it('is usually won by a captain who manages the watch bill', () => {
    expect(careful.wins).toBeGreaterThanOrEqual(15);
  });

  it('rewards managing the watch bill over setting it once', () => {
    expect(careful.wins - rotation.wins).toBeGreaterThanOrEqual(4);
    expect(careful.stars).toBeGreaterThan(rotation.stars);
  });

  it('keeps the top grade out of easy reach', () => {
    expect(careful.stars).toBeLessThan(2.5);
  });
}, 120_000);
