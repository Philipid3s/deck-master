import { clamp, Rng } from './rng';
import { alertBoard } from './tasking';
import { computeAlerts, writeJournal } from './alerts';
import { seatFactor } from './councilEffects';
import { councilDay, ensureCouncil, runDelegations } from './council';
import type { CrewMember, DailyReport, FlightRecord, GameState, LogNote } from './types';
import {
  checkPromotion,
  effectiveness,
  gainExperience,
  isAvailable,
  isAboardAndFit,
  mistakeChance,
} from './crew';
import { runFlightOperations, runMaintenance } from './aircraft';
import { pruneAircrew } from './aircrew';
import { stationCrew } from './posts';
import { computeTasking } from './tasking';
import { equipmentBonus } from './equipmentEffects';
import { runDeliveries } from './procurement';
import { advanceTraining, runMentoring } from './training';
import {
  computeDepartments,
  computeReadiness,
  computeRoomActivity,
  explainReadiness,
} from './readiness';
import { applyWatchBill } from './watch';
import { consumeSupplies, generateCandidates, runEconomy, tierIndex } from './economy';
import {
  advanceMission,
  missionShouldResolve,
  resolveMission,
  refreshMissionOffers,
} from './missions';
import { generateDailyEvents } from './events';
import { advanceInbound, advanceOutbound, isInPort, isOnStation } from './status';
import { missionDef } from '../data/missions';
import { getRoom } from '../data/decks';
import { eventDef } from '../data/events';
import { applyEffects } from './effects';
import {
  DEPLOYMENT_BANKRUPT_DAYS,
  DEPLOYMENT_CRITICAL_DAYS,
  checkDeploymentEnd,
  isDeployment,
} from './deployment';

/**
 * Resolve one turn (spec sections 5 and 79).
 *
 * The whole authoritative simulation happens here, once per day. Everything
 * else — crew walking around the deck, aircraft moving — is presentation.
 * That keeps the game deterministic and debuggable: the same seed and the
 * same decisions always produce the same campaign.
 */
export function endDay(state: GameState): DailyReport {
  const day = state.day;
  const seed = state.seed;
  const readinessBefore = state.readiness.overall;
  const breakdownBefore = { ...state.readiness };
  const creditsBefore = state.credits;
  const prestigeBefore = state.prestige;

  const moraleBefore = average(state.crew.filter(isAboardAndFit).map((c) => c.morale));
  const fatigueBefore = average(state.crew.filter(isAboardAndFit).map((c) => c.fatigue));

  const notes: LogNote[] = [];
  const casualties: string[] = [];
  const statusBefore = state.status;

  // Any events the player left unanswered resolve as the first option, which
  // is always the cautious one. Ignoring a decision is itself a decision.
  if (state.pendingEvents.length > 0) {
    const rngDefault = Rng.stream(seed, day, 'unanswered');
    for (const pending of state.pendingEvents.slice()) {
      const def = eventDef(pending.defId);
      if (def) {
        const result = applyEffects(state, rngDefault, def.choices[0]!.effects, pending.subjectId);
        casualties.push(...result.casualties);
        notes.push({
          key: 'Unresolved: {title} — defaulted to "{choice}"',
          tvars: { title: def.title, choice: def.choices[0]!.label },
        });
      }
    }
    state.pendingEvents = [];
  }

  // A save from before the council existed gets one, seated from its seed.
  ensureCouncil(state);

  // -- Phase 4: operational resolution -------------------------------------
  // Post people to compartments before anything reads where they are: their
  // post says what they do, and the backlog says which of its spaces they do
  // it in today.
  stationCrew(state);

  // Seats next: nobody can be left assigned to an airframe they are no
  // longer aboard for.
  pruneAircrew(state);

  // The tasking order the player set is read once, before anything moves.
  const tasking = computeTasking(state);
  notes.push(...tasking.warnings);

  const opsRng = Rng.stream(seed, day, 'operations');
  // Where everyone is spotted before the first launch, for the replay.
  const spots = new Map(state.aircraft.map((a) => [a.id, { deck: a.deck, x: a.x, y: a.y, duty: a.duty }]));
  const flight = runFlightOperations(state, opsRng, tasking.sortieCapacity);
  state.sortieTotal += flight.launched;
  const damagedToday = new Set(flight.damaged);
  const flights: FlightRecord[] = flight.flown.flatMap((id) => {
    const a = state.aircraft.find((x) => x.id === id);
    const spot = spots.get(id);
    if (!a || !spot) return [];
    return [
      {
        aircraftId: id,
        typeId: a.typeId,
        squadron: a.squadron,
        tail: a.tail,
        duty: spot.duty,
        deck: spot.deck,
        x: spot.x,
        y: spot.y,
        damaged: damagedToday.has(id),
      },
    ];
  });

  // Training sorties are how aircrew and deck crews earn their keep on a
  // quiet day.
  const trainingSorties = flight.training;
  if (trainingSorties > 0) {
    for (const c of state.crew) {
      if ((c.department === 'AIR' || c.department === 'DECK') && isAvailable(c)) {
        gainExperience(c, trainingSorties * 0.8);
      }
    }
    notes.push(...bankPassagePrep(state, trainingSorties));
  }

  const maintRng = Rng.stream(seed, day, 'maintenance');
  const maintenance = runMaintenance(state, maintRng);
  if (maintenance.botched > 0) {
    notes.push({
      key:
        maintenance.botched === 1
          ? '1 maintenance task set back by error'
          : '{n} maintenance tasks set back by error',
      vars: { n: maintenance.botched },
    });
  }

  const trainRng = Rng.stream(seed, day, 'training');
  const training = advanceTraining(state, trainRng);
  const mentoringPairs = runMentoring(state);

  // -- Crew day ------------------------------------------------------------
  const crewRng = Rng.stream(seed, day, 'crew');
  // Alert crews spent the day strapped in at five minutes' notice.
  const alertCrews = new Set(tasking.alertCount > 0 ? alertBoard(state).ready.flatMap((a) => a.crewIds ?? []) : []);
  const promotions = runCrewDay(
    state,
    crewRng,
    notes,
    casualties,
    new Set(flight.flownBy),
    alertCrews,
    tasking.planeGuard,
  );

  // -- Mission -------------------------------------------------------------
  // The passage out is spent before any work is done, so the day the ship
  // arrives is the first day the mission advances.
  notes.push(...advanceOutbound(state).notes);

  // The homeward leg is advanced *before* the mission block, so the day a
  // return transit is ordered is not also the day it completes — a one-day
  // passage home must actually cost a day.
  const inbound = advanceInbound(state);
  notes.push(...inbound.notes);

  const missionRng = Rng.stream(seed, day, 'mission');
  const missionTitle = state.mission ? missionDef(state.mission.defId).title : null;
  let missionOutcome: DailyReport['missionOutcome'] = null;
  let progressResult: { delta: number; note: LogNote | null } = { delta: 0, note: null };

  if (isOnStation(state)) {
    progressResult = advanceMission(state, missionRng);
    if (state.mission && missionShouldResolve(state)) {
      const resolved = resolveMission(state, missionRng);
      missionOutcome = resolved.outcome;
      notes.push(...resolved.notes);
    }
  }
  const missionProgress = state.mission?.progress ?? 0;

  // -- Logistics and money -------------------------------------------------
  notes.push(...consumeSupplies(state));
  const economy = runEconomy(state);
  notes.push(...economy.notes);

  // -- Equipment wear ------------------------------------------------------
  const wearRng = Rng.stream(seed, day, 'wear');
  runEquipmentWear(state, wearRng, notes);

  // -- Recompute derived state --------------------------------------------
  state.day = day + 1;

  // Deliveries arrive with the new day, and only alongside.
  notes.push(...runDeliveries(state));

  // Change of watch: tomorrow's rota, set by each department's watch bill.
  notes.push(...applyWatchBill(state).notes);

  // Coming alongside reopens the mission board.
  if (inbound.arrivedInPort) {
    refreshMissionOffers(state, Rng.stream(seed, state.day, 'offers'));
  }

  state.departments = computeDepartments(state);
  state.readiness = computeReadiness(state);
  computeRoomActivity(state);

  // -- Next day's setup ----------------------------------------------------
  state.pendingEvents = generateDailyEvents(state, Rng.stream(seed, state.day, 'events'));

  if (!state.mission && state.missionOffers.length === 0) {
    refreshMissionOffers(state, Rng.stream(seed, state.day, 'offers'));
  }
  if (state.day % 5 === 0) {
    state.candidates = generateCandidates(state, Rng.stream(seed, state.day, 'candidates'));
  }

  // A wing that cannot do the job in hand is worth a line in the log, so
  // the journal shows when and why the operation ran short of airframes.
  if (state.mission) {
    for (const alert of computeAlerts(state)) {
      if (alert.id === 'capability' || alert.id === 'cover') notes.push(alert.detail);
    }
  }

  // The council: opinions move with the day, then the officers left in
  // charge of a domain do tomorrow's work and answer its decisions.
  councilDay(state, missionOutcome, inbound.arrivedInPort);
  notes.push(...runDelegations(state));

  checkCampaignEnd(state, notes);

  const moraleAfter = average(state.crew.filter(isAboardAndFit).map((c) => c.morale));
  const fatigueAfter = average(state.crew.filter(isAboardAndFit).map((c) => c.fatigue));

  const report: DailyReport = {
    day,
    missionTitle,
    missionProgressDelta: progressResult.delta,
    missionProgress,
    missionOutcome,
    sortiesLaunched: flight.launched,
    sortiesRecovered: flight.recovered,
    tasking: {
      contribution: tasking.contribution,
      required: tasking.required,
      ratio: tasking.ratio,
      grounded: tasking.grounded,
      capacityLimited: tasking.capacityLimited,
    },
    maintenanceCompleted: maintenance.completed,
    workOrdersOpened: flight.opened,
    trainedToday: training.inTraining,
    trainingCompleted: training.completed,
    promotions,
    moraleDelta: moraleAfter - moraleBefore,
    fatigueDelta: fatigueAfter - fatigueBefore,
    readinessBefore,
    readinessAfter: state.readiness.overall,
    statusBefore,
    statusAfter: state.status,
    creditsDelta: state.credits - creditsBefore,
    prestigeDelta: state.prestige - prestigeBefore,
    casualties,
    notes,
    readinessDrivers: explainReadiness(breakdownBefore, state.readiness, state),
    flights,
  };

  if (mentoringPairs > 0) {
    report.notes.push({
      key: mentoringPairs === 1 ? '1 mentoring pair active' : '{n} mentoring pairs active',
      vars: { n: mentoringPairs },
    });
  }

  state.lastReport = report;
  writeJournal(state, day, report.notes);
  return report;
}

// ---------------------------------------------------------------------------
// Work-ups on passage
// ---------------------------------------------------------------------------

/** Progress each training sortie on the passage out banks for arrival. */
export const PREP_PER_SORTIE = 0.5;
/** Most progress the passage can bank: a head start, not the operation. */
export const PREP_CAP = 12;

/**
 * Training sorties flown on the way out rehearse the operation, and the
 * wing arrives already working: the banked progress lands on the first day
 * on station. It costs what flying costs — aircrew and deck fatigue, wear —
 * so the passage is a real choice between rehearsing and resting.
 */
function bankPassagePrep(state: GameState, sorties: number): LogNote[] {
  const mission = state.mission;
  if (!mission || state.status !== 'outbound') return [];
  const banked = mission.prep ?? 0;
  const gain = Math.min(PREP_CAP - banked, sorties * PREP_PER_SORTIE);
  if (gain <= 0) return [];
  mission.prep = banked + gain;
  mission.progressModifier += gain;
  return [
    {
      key: 'Work-ups on passage: +{gain} progress banked for arrival ({total} in hand)',
      vars: { gain: Math.round(gain * 10) / 10, total: Math.round(mission.prep * 10) / 10 },
    },
  ];
}

// ---------------------------------------------------------------------------
// Crew day
// ---------------------------------------------------------------------------

/**
 * Fatigue, morale, experience and health for every crew member, plus the
 * accident checks that make a tired ship a dangerous one.
 */
function runCrewDay(
  state: GameState,
  rng: Rng,
  notes: LogNote[],
  casualties: string[],
  /** Aircrew who flew a sortie today. */
  flew: Set<string>,
  /** Aircrew who sat deck alert today. */
  onAlert: Set<string> = new Set(),
  /** A plane guard was up while the ship flew. */
  planeGuard = false,
): string[] {
  const promotions: string[] = [];
  // On passage there is no flying programme to run: the routine is lighter,
  // and the operation's own strain only starts in the operating area. The
  // transit is the chance to get a tired ship back on its feet.
  const passage = state.status === 'outbound' || state.status === 'inbound';
  // A good navigator finds the kinder route.
  const passageFactor = 0.7 - 0.08 * seatFactor(state, 'nav');
  const tempoFatigue =
    { low: 3.5, normal: 7, high: 11.5, maximum: 16 }[state.tempo] * (passage ? passageFactor : 1);
  const missionFatigue = isOnStation(state) ? 2.5 : 0;

  const berthLevel = state.upgrades['up-berthing'] ?? 1;
  // Berthing upgrades and berthing fittings both help people actually rest,
  // and alongside there is liberty and a full night's sleep on top.
  const restBonus =
    (1 +
      [0, 0.12, 0.22, 0.32, 0.45][berthLevel - 1]! +
      Math.min(0.35, equipmentBonus(state, 'restRate'))) *
    (isInPort(state) ? 1.6 : 1);
  const recLevel = state.upgrades['up-recreation'] ?? 1;
  const moraleBonus = 1 + [0, 0.15, 0.28, 0.40, 0.55][recLevel - 1]!;
  const medLevel = state.upgrades['up-medical'] ?? 1;
  const recoveryBonus = 1 + [0, 0.15, 0.28, 0.40, 0.55][medLevel - 1]!;

  for (const crew of state.crew) {
    crew.daysAboard++;

    // -- Away: leave, sickness, injury ------------------------------------
    if (crew.awayDays > 0) {
      crew.awayDays -= crew.health === 'healthy' ? 1 : recoveryBonus;
      if (crew.awayDays <= 0) {
        crew.awayDays = 0;
        crew.health = 'healthy';
        crew.status = 'working';
        crew.career.push({ day: state.day, key: 'Returned to duty' });
      }
      // Rest is what being away is for.
      crew.fatigue = clamp(crew.fatigue - 14 * restBonus, 0, 100);
      crew.consecutiveWorkDays = 0;
      crew.consecutiveFlyingDays = 0;
      continue;
    }

    if (crew.status === 'training') {
      // Training is tiring but not exhausting; morale rises slightly.
      crew.fatigue = clamp(crew.fatigue + tempoFatigue * 0.35, 0, 100);
      crew.morale = clamp(crew.morale + 0.4 * moraleBonus, 0, 100);
      crew.consecutiveFlyingDays = 0;
      continue;
    }

    if (crew.status === 'resting') {
      crew.fatigue = clamp(crew.fatigue - (13 + crew.attrs.stamina * 0.06) * restBonus, 0, 100);
      crew.morale = clamp(crew.morale + 1.4 * moraleBonus, 0, 100);
      crew.consecutiveWorkDays = 0;
      crew.consecutiveFlyingDays = 0;
      // Come back on duty once genuinely rested.
      if (crew.fatigue < 18) crew.status = 'working';
      continue;
    }

    // -- On duty -----------------------------------------------------------
    crew.consecutiveWorkDays++;

    // Stamina blunts the daily fatigue hit; consecutive days compound it.
    const staminaResist = 1 - (crew.attrs.stamina / 100) * 0.35;
    const streakPenalty = 1 + Math.max(0, crew.consecutiveWorkDays - 5) * 0.07;
    crew.fatigue = clamp(
      crew.fatigue + (tempoFatigue + missionFatigue) * staminaResist * streakPenalty,
      0,
      100,
    );

    // -- Flying ------------------------------------------------------------
    // A sortie costs its crew far more than a day in a shop, and flying the
    // same people day after day compounds: this is what makes a wing that
    // has been surged for a week stop performing.
    if (flew.has(crew.id)) {
      crew.consecutiveFlyingDays++;
      const streak = 1 + Math.max(0, crew.consecutiveFlyingDays - 3) * 0.22;
      // A CAG who manages the flying schedule well spares the crews.
      const stressResist = (1 - (crew.attrs.stress / 100) * 0.4) * (1 - 0.1 * seatFactor(state, 'cag'));
      crew.fatigue = clamp(
        crew.fatigue + (5.5 + tempoFatigue * 0.55) * streak * stressResist,
        0,
        100,
      );
      // Flying is what aircrew are for; a few days running is a grind.
      if (crew.consecutiveFlyingDays > 5) {
        crew.morale = clamp(crew.morale - (crew.consecutiveFlyingDays - 5) * 0.8, 0, 100);
      }
      // Hours in the air are worth far more than hours in a briefing.
      gainExperience(crew, 2.2);
      if (crew.consecutiveFlyingDays === 8) {
        notes.push({
          key: '{name} has flown 8 days without a break',
          vars: { name: crew.name },
        });
      }
    } else {
      crew.consecutiveFlyingDays = 0;
      // Sitting alert is not flying, but it is a day in the cockpit.
      if (onAlert.has(crew.id)) crew.fatigue = clamp(crew.fatigue + 2.5 * staminaResist, 0, 100);
    }

    // Morale drifts toward a target set by conditions, rather than jumping.
    const target = moraleTarget(state, crew);
    const drift = (target - crew.morale) * 0.14 * (target > crew.morale ? moraleBonus : 1);
    crew.morale = clamp(crew.morale + drift, 0, 100);

    // Experience from the day's work, scaled by how productive they were.
    gainExperience(crew, effectiveness(crew) * 2.6);

    // Accidents: the direct consequence of running tired people hard.
    const tempoRisk = { low: 0.4, normal: 1, high: 1.6, maximum: 2.4 }[state.tempo];
    // Safety equipment is bought to keep people out of the sick bay.
    // So is an XO who holds the line on standards.
    const safety =
      (1 - Math.min(0.5, equipmentBonus(state, 'accidentRisk'))) * (1 - 0.15 * seatFactor(state, 'xo'));
    // Flying a tired crew is the single most dangerous thing the ship does,
    // and markedly less so with a plane guard up to pull people out.
    const flyingRisk = flew.has(crew.id) ? (planeGuard ? 1.0 : 1.5) : 1;
    if (rng.chance(mistakeChance(crew) * 0.045 * tempoRisk * safety * flyingRisk)) {
      const severe = rng.chance(0.3);
      crew.health = 'injured';
      crew.status = 'injured';
      crew.awayDays = severe ? rng.int(6, 14) : rng.int(2, 5);
      crew.morale = clamp(crew.morale - 10, 0, 100);
      crew.career.push({ day: state.day, key: 'Injured on duty' });
      state.totalCasualties++;
      casualties.push(crew.name);
      notes.push({
        key: '{name} injured — {days} days off duty',
        vars: { name: crew.name, days: crew.awayDays },
      });
    }

    // Sickness rises when the ship is crowded, tired and short of food.
    const sickChance =
      0.0025 +
      (crew.fatigue / 100) * 0.006 +
      (state.supplies.food < 30 ? 0.005 : 0) +
      (state.flags['overflowWard'] ? 0.004 : 0);
    if (crew.health === 'healthy' && rng.chance(sickChance)) {
      crew.health = 'sick';
      crew.status = 'sick';
      crew.awayDays = rng.int(2, 5);
    }
  }

  // -- Promotion eligibility ------------------------------------------------
  for (const crew of state.crew) {
    const wasPromotable = crew.promotable;
    crew.promotable = checkPromotion(crew).eligible;
    if (crew.promotable && !wasPromotable) {
      promotions.push(crew.name);
    }
  }

  return promotions;
}

/** The morale level the ship's current conditions are pulling toward. */
function moraleTarget(state: GameState, crew: CrewMember): number {
  let target = 62;

  target -= Math.max(0, crew.fatigue - 45) * 0.45;
  target += (tierIndex(state.prestige) - 1) * 3;
  target -= state.supplies.food < 35 ? 12 : 0;
  target -= state.supplies.general < 25 ? 6 : 0;
  target += state.mission ? 4 : -2; // purposeful work beats sitting still
  target -= state.tempo === 'maximum' ? 9 : state.tempo === 'high' ? 4 : 0;
  target += crew.rank >= 4 ? 4 : 0;
  target += (crew.traits.loyalty - 50) * 0.06;
  // The master chief is the crew's voice; the XO sets the climate.
  target += 3 * seatFactor(state, 'cmc') + 1.5 * seatFactor(state, 'xo');

  // Recent casualties weigh on everyone.
  const injured = state.crew.filter((c) => c.health !== 'healthy').length;
  target -= clamp((injured / Math.max(1, state.crew.length)) * 120, 0, 18);

  // A well-led division is a happier one.
  const supervisors = state.crew.filter(
    (c) => c.department === crew.department && c.rank >= 4 && isAboardAndFit(c),
  );
  if (supervisors.length > 0) {
    const lead = average(supervisors.map((s) => s.attrs.leadership));
    target += (lead - 50) * 0.14;
  } else {
    target -= 5;
  }

  return clamp(target, 5, 96);
}

/** Rooms and equipment degrade with use; upgrades slow it down. */
function runEquipmentWear(state: GameState, rng: Rng, notes: LogNote[]): void {
  const tempoWear = { low: 0.10, normal: 0.20, high: 0.34, maximum: 0.5 }[state.tempo];
  const engLevel = state.upgrades['up-engineering'] ?? 1;
  const reliability = 1 - [0, 0.15, 0.28, 0.40, 0.55][engLevel - 1]!;

  for (const rs of Object.values(state.rooms)) {
    const activityWear = (rs.activity / 100) * tempoWear;
    rs.condition = clamp(rs.condition - (activityWear + 0.05) * reliability, 0, 100);
  }

  // Engineering crews repair the worst spaces they can reach.
  const engCrew = state.crew.filter((c) => c.department === 'ENG' && isAvailable(c));
  const repairBudget =
    engCrew.reduce((s, c) => s + effectiveness(c), 0) * 1.4 * (1 + 0.2 * seatFactor(state, 'cheng'));
  const worst = Object.values(state.rooms)
    .filter((r) => r.condition < 92)
    .sort((a, b) => a.condition - b.condition)
    .slice(0, 8);
  const perRoom = worst.length > 0 ? repairBudget / worst.length : 0;
  for (const rs of worst) {
    rs.condition = clamp(rs.condition + perRoom, 0, 100);
  }

  // A badly degraded space announces itself.
  for (const rs of Object.values(state.rooms)) {
    if (rs.condition < 30 && rng.chance(0.12)) {
      notes.push({
        key: 'Equipment condition critical in {room}',
        tvars: { room: getRoom(rs.id).name },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Campaign end (spec sections 68-69)
// ---------------------------------------------------------------------------

function checkCampaignEnd(state: GameState, notes: LogNote[]): void {
  if (state.campaignEnd) return;

  if (state.prestige >= 2000) {
    state.campaignEnd = {
      day: state.day,
      won: true,
      reason: 'The Resolute has reached Legendary standing. Career victory.',
    };
    notes.push({ key: state.campaignEnd.reason });
    return;
  }

  // Failure conditions are sustained states, not single bad days. A
  // deployment judges them faster: it only has thirty days to recover in.
  const deployment = isDeployment(state);
  const bankruptLimit = deployment ? DEPLOYMENT_BANKRUPT_DAYS : 10;
  const criticalLimit = deployment ? DEPLOYMENT_CRITICAL_DAYS : 14;
  if (state.credits < -250000) {
    state.flags['bankruptDays'] = (state.flags['bankruptDays'] ?? 0) + 1;
  } else {
    state.flags['bankruptDays'] = 0;
  }
  if (state.readiness.overall < 25) {
    state.flags['criticalDays'] = (state.flags['criticalDays'] ?? 0) + 1;
  } else {
    state.flags['criticalDays'] = 0;
  }

  if ((state.flags['bankruptDays'] ?? 0) >= bankruptLimit) {
    state.campaignEnd = {
      day: state.day,
      won: false,
      reason: deployment
        ? 'The operating account has been unsustainable for five days. Command relieved.'
        : 'The operating account has been unsustainable for ten days. Command relieved.',
    };
    notes.push({ key: state.campaignEnd.reason });
  } else if ((state.flags['criticalDays'] ?? 0) >= criticalLimit) {
    state.campaignEnd = {
      day: state.day,
      won: false,
      reason: deployment
        ? 'Carrier readiness has been critical for seven days. Command relieved.'
        : 'Carrier readiness has been critical for fourteen days. Command relieved.',
    };
    notes.push({ key: state.campaignEnd.reason });
  }

  checkDeploymentEnd(state, notes);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Player actions during the management phase
// ---------------------------------------------------------------------------

export function setRest(state: GameState, crewId: string, resting: boolean): boolean {
  const crew = state.crew.find((c) => c.id === crewId);
  if (!crew) return false;
  if (crew.health !== 'healthy' || crew.status === 'leave' || crew.status === 'training') {
    return false;
  }
  crew.status = resting ? 'resting' : 'working';
  return true;
}
