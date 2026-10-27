import { Rng } from './rng';
import { ensureCouncil } from './council';
import type { CampaignMode, GameState, RoomState, SupplyId } from './types';
import { ALL_ROOMS } from '../data/decks';
import { UPGRADES } from '../data/missions';
import { generateCompany } from './crew';
import { assignInitialAircrew, generateAircrew } from './aircrew';
import { generateAirWing, openWorkOrder } from './aircraft';
import { computeDepartments, computeReadiness, computeRoomActivity } from './readiness';
import { generateCandidates } from './economy';
import { refreshMissionOffers } from './missions';
import { generateDailyEvents } from './events';
import { initialiseDuties } from './tasking';
import { stationCrew } from './posts';

export const SAVE_VERSION = 3;

export function newCampaign(seed?: number, mode: CampaignMode = 'career'): GameState {
  // The one draw outside Rng: picking a fresh campaign's seed. Everything
  // after this point replays from it.
  // eslint-disable-next-line no-restricted-properties
  const campaignSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = new Rng(campaignSeed);

  const rooms: Record<string, RoomState> = {};
  for (const room of ALL_ROOMS) {
    rooms[room.id] = {
      id: room.id,
      condition: rng.statRoll(88, 8, 55, 100),
      activity: 0,
      workload: 0,
      efficiency: 0,
      level: 1,
    };
  }

  const suppliesMax: Record<SupplyId, number> = {
    food: 100,
    medical: 100,
    parts: 100,
    fuel: 100,
    general: 100,
    ammo: 100,
  };

  const state: GameState = {
    version: SAVE_VERSION,
    seed: campaignSeed,
    day: 1,
    shipName: 'USS RESOLUTE',
    tempo: 'normal',
    status: 'port',
    statusDaysLeft: 0,
    prestige: 40,
    credits: 420000,
    supplies: {
      food: 82,
      medical: 78,
      parts: 71,
      fuel: 76,
      general: 80,
      ammo: 68,
    },
    suppliesMax,
    // The ship's company mans the compartments; the aircrew man the seats.
    crew: [...generateCompany(rng, 1), ...generateAircrew(rng, 500)],
    aircraft: generateAirWing(rng),
    workOrders: [],
    workOrderSeq: 0,
    rooms,
    mission: null,
    missionOffers: [],
    missionHistory: [],
    pendingEvents: [],
    scheduledEvents: [],
    eventLog: [],
    eventCooldowns: {},
    flags: {},
    candidates: [],
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 1])),
    equipment: {},
    deliveries: [],
    deliverySeq: 0,
    readiness: {
      aircraft: 0,
      crew: 0,
      engineering: 0,
      operations: 0,
      weapons: 0,
      logistics: 0,
      medical: 0,
      maintenance: 0,
      command: 0,
      overall: 0,
    },
    departments: {},
    lastReport: null,
    campaign: { mode },
    campaignEnd: null,
    totalCasualties: 0,
    sortieTotal: 0,
  };

  // Start with a small backlog so the maintenance system has something to do
  // on day one and the player meets it immediately.
  const startingFaults = rng.int(3, 5);
  for (let i = 0; i < startingFaults; i++) {
    const a = rng.pick(state.aircraft);
    openWorkOrder(
      state,
      a.id,
      rng.pick(['engine', 'avionics', 'airframe'] as const),
      rng.chance(0.25) ? 2 : 1,
    );
  }

  initialiseDuties(state);
  assignInitialAircrew(state);
  // Everyone is appointed to a post by their trade; this settles which of the
  // post's compartments each of them starts the campaign standing in.
  stationCrew(state);

  state.departments = computeDepartments(state);
  state.readiness = computeReadiness(state);
  computeRoomActivity(state);

  ensureCouncil(state);
  refreshMissionOffers(state, Rng.stream(campaignSeed, 0, 'offers'));
  state.candidates = generateCandidates(state, Rng.stream(campaignSeed, 0, 'candidates'));
  state.pendingEvents = generateDailyEvents(state, Rng.stream(campaignSeed, 1, 'events'));

  return state;
}
