/**
 * Balance probe for the 30-day deployment.
 *
 * Plays the deployment headless with a simple, sensible policy — accept the
 * most likely mission when alongside, auto-task the wing, answer every
 * event with its first choice — and reports what such a player achieves.
 * The deployment objectives should be reachable by this player most of the
 * time, and the top grade should need better than this.
 */
import { newCampaign } from '../src/core/newGame.ts';
import { startMission, successProbability } from '../src/core/missions.ts';
import { autoAssign } from '../src/core/tasking.ts';
import { endDay } from '../src/core/simulation.ts';
import { resolveEvent } from '../src/core/events.ts';
import { missionDef } from '../src/data/missions.ts';
import { Rng } from '../src/core/rng.ts';
import { setWatchPolicy } from '../src/core/watch.ts';
import { trainOnPassage } from '../src/core/tasking.ts';
import { DEPT_IDS } from '../src/data/specialties.ts';
import { SEATS, setDelegated } from '../src/core/council.ts';

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const choice = Number(process.env.CHOICE ?? 0);
// CAREFUL=1 plays like an attentive player: three watches everywhere, lets
// the ship recover alongside before sailing, keeps tempo down in port and
// flies work-ups on the passage out. The default player touches nothing:
// the standard watch bill, auto-tasking, sail at once.
const careful = process.env.CAREFUL === '1';
// SURGE=1 is the old game's default: nobody rests unless told to.
const surge = process.env.SURGE === '1';
// ROTATION=1 takes the single decision the watch bill exists for — three
// watches everywhere — and nothing else.
const rotationOnly = process.env.ROTATION === '1';
// DELEGATE=1 hands every domain to the council and does nothing itself.
const delegateAll = process.env.DELEGATE === '1';

for (const seed of SEEDS) {
  const s = newCampaign(seed, 'deployment');
  while (s.day <= 30 && !s.campaignEnd) {
    if (s.day === 1 && delegateAll) for (const seat of SEATS) setDelegated(s, seat.id, true);
    if (delegateAll) {
      endDay(s);
      continue;
    }
    if (s.day === 1) {
      for (const d of DEPT_IDS) {
        if (careful || rotationOnly) setWatchPolicy(s, d, 'rotation');
        if (surge) setWatchPolicy(s, d, 'surge');
      }
    }
    if (careful) s.tempo = s.status === 'port' ? 'low' : 'normal';
    const recovering = careful && s.readiness.overall < 62 && (s.flags['portDays'] ?? 0) < 3;
    if (s.status === 'port') s.flags['portDays'] = (s.flags['portDays'] ?? 0) + 1;
    else s.flags['portDays'] = 0;
    if (s.status === 'port' && !s.mission && s.missionOffers.length > 0 && !recovering) {
      const best = [...s.missionOffers]
        .filter((id) => s.prestige >= missionDef(id).minPrestige)
        .sort((a, b) => successProbability(s, missionDef(b)) - successProbability(s, missionDef(a)))[0];
      if (best) startMission(s, best);
    }
    autoAssign(s);
    if ((careful || process.env.TRAIN === '1') && s.status === 'outbound') trainOnPassage(s);
    while (s.pendingEvents.length > 0) {
      const def = s.pendingEvents[0];
      resolveEvent(s, Rng.stream(s.seed, s.day, 'choice'), 0, choice);
      if (s.pendingEvents[0] === def) s.pendingEvents.shift();
    }
    endDay(s);
  }
  const morale = s.crew.reduce((a, c) => a + c.morale, 0) / s.crew.length;
  console.log(
    `seed ${String(seed).padStart(2)}`,
    `day ${s.day}`,
    `missions ${s.missionHistory.map((m) => `${m.defId.slice(2)}:${m.outcome}`).join(',') || '-'}`,
    `active ${s.mission ? s.mission.defId.slice(2) : '-'}`,
    `prestige ${s.prestige}`,
    `ready ${Math.round(s.readiness.overall)}`,
    `morale ${Math.round(morale)}`,
    `cas ${s.totalCasualties}`,
    `credits ${Math.round(s.credits / 1000)}k`,
    s.campaignEnd ? `END won=${s.campaignEnd.won} stars=${s.campaignEnd.stars ?? 0}` : "",
  );
}
