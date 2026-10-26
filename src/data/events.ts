import type { EventDef } from '../core/types';

/**
 * Daily events (spec sections 47-51). Two rules govern this file:
 *
 *  1. No choice is obviously correct (spec section 50). Every option trades
 *     something the player currently wants for something else they want.
 *  2. Events can schedule follow-ups, so a bad day in week one is still
 *     being paid for in week three (spec section 49).
 */
export const EVENTS: EventDef[] = [
  // =========================================================================
  // Personnel
  // =========================================================================
  {
    id: 'ev-leave-request',
    title: 'Leave Request',
    category: 'personnel',
    weight: 10,
    cooldown: 6,
    subject: 'senior',
    body:
      '{rank} {subject} has put in for five days of leave. They have been aboard {daysAboard} days without a break, and it shows in their work — but they are also the most capable hand in {room}.',
    choices: [
      {
        label: 'Approve five days',
        hint: 'They come back sharp. You lose them for five days.',
        effects: [
          { t: 'leave', days: 5, scope: { kind: 'subject' } },
          { t: 'morale', v: 9, scope: { kind: 'subject' } },
          { t: 'morale', v: 1, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Deny — we need them',
        hint: 'Available tomorrow. They will remember this.',
        effects: [
          { t: 'fatigue', v: 14, scope: { kind: 'subject' } },
          { t: 'morale', v: -12, scope: { kind: 'subject' } },
          { t: 'morale', v: -2, scope: { kind: 'department', department: 'MAINT' } },
          { t: 'schedule', eventId: 'ev-resentment', inDays: 6, chance: 0.5 },
        ],
      },
      {
        label: 'Compromise — three days',
        hint: 'Half the rest, half the goodwill.',
        effects: [
          { t: 'leave', days: 3, scope: { kind: 'subject' } },
          { t: 'morale', v: 4, scope: { kind: 'subject' } },
        ],
      },
    ],
  },
  {
    id: 'ev-resentment',
    title: 'A Quiet Resignation',
    category: 'personnel',
    weight: 0,
    cooldown: 30,
    chained: true,
    subject: 'crew',
    body:
      '{rank} {subject} has stopped volunteering for anything. The work still gets done, to the letter and no further. Their chief has noticed and asks whether you want it addressed.',
    choices: [
      {
        label: 'Speak to them personally',
        hint: 'Costs you a day of command attention.',
        effects: [
          { t: 'morale', v: 14, scope: { kind: 'subject' } },
          { t: 'fatigue', v: -8, scope: { kind: 'subject' } },
          { t: 'credits', v: -4000 },
        ],
      },
      {
        label: 'Let the chief handle it',
        hint: 'Delegating is what chiefs are for. Results vary.',
        effects: [
          { t: 'morale', v: 5, scope: { kind: 'subject' } },
          { t: 'morale', v: -2, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
      {
        label: 'Ignore it',
        hint: 'They are still doing their job.',
        effects: [
          { t: 'morale', v: -8, scope: { kind: 'subject' } },
          { t: 'morale', v: -3, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-promotion-rec',
    title: 'Promotion Recommendation',
    category: 'personnel',
    weight: 8,
    cooldown: 8,
    minDay: 6,
    subject: 'senior',
    body:
      '{subject}’s chief has recommended them for advancement. Technically they are among the best aboard. Whether they can lead a division is a different question, and the paperwork does not ask it.',
    choices: [
      {
        label: 'Endorse the recommendation',
        hint: 'Morale across the division rises. Check their leadership first.',
        effects: [
          { t: 'flag', key: 'endorsed', v: 1 },
          { t: 'morale', v: 10, scope: { kind: 'subject' } },
          { t: 'morale', v: 3, scope: { kind: 'all' } },
          { t: 'xp', v: 6, scope: { kind: 'subject' } },
        ],
      },
      {
        label: 'Hold them at their current rank',
        hint: 'Keeps a superb technician on the tools.',
        effects: [
          { t: 'morale', v: -7, scope: { kind: 'subject' } },
          { t: 'skill', specialty: 'primary', v: 2, scope: { kind: 'subject' } },
        ],
      },
    ],
  },
  {
    id: 'ev-mentoring',
    title: 'Mentoring Offer',
    category: 'training',
    weight: 8,
    cooldown: 7,
    minDay: 4,
    subject: 'senior',
    body:
      '{rank} {subject} has offered to take the division’s junior hands through hands-on instruction. It would cost their own productivity for a while.',
    choices: [
      {
        label: 'Approve the mentoring programme',
        hint: 'Juniors improve. Your best technician spends the week teaching.',
        effects: [
          { t: 'xp', v: 14, scope: { kind: 'department', department: 'MAINT' } },
          { t: 'skill', specialty: 'primary', v: 2, scope: { kind: 'department', department: 'MAINT' } },
          { t: 'fatigue', v: 8, scope: { kind: 'subject' } },
          { t: 'morale', v: 5, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
      {
        label: 'Not now — we have a backlog',
        hint: 'Everyone stays on the tools.',
        effects: [{ t: 'morale', v: -4, scope: { kind: 'subject' } }],
      },
    ],
  },
  {
    id: 'ev-crew-breaking',
    title: 'The Crew Is Running Out',
    category: 'morale',
    weight: 12,
    priority: 1,
    cooldown: 8,
    condition: (c) => c.avgFatigue > 62,
    body:
      'Average fatigue across the ship has passed {avgFatigue}%. The senior chief has come to see you privately: mistakes are creeping into routine work, and someone is going to get hurt.',
    choices: [
      {
        label: 'Stand down for 24 hours',
        hint: 'Real rest. Mission progress stops dead for a day.',
        effects: [
          { t: 'fatigue', v: -22, scope: { kind: 'all' } },
          { t: 'morale', v: 8, scope: { kind: 'all' } },
          { t: 'missionProgress', v: -6 },
          { t: 'tempo', v: 'low' },
        ],
      },
      {
        label: 'Reduce tempo to normal',
        hint: 'A partial measure, which is often the right one.',
        effects: [
          { t: 'fatigue', v: -9, scope: { kind: 'all' } },
          { t: 'morale', v: 3, scope: { kind: 'all' } },
          { t: 'tempo', v: 'normal' },
        ],
      },
      {
        label: 'Press on',
        hint: 'The mission does not care how tired they are.',
        effects: [
          { t: 'fatigue', v: 6, scope: { kind: 'all' } },
          { t: 'morale', v: -7, scope: { kind: 'all' } },
          { t: 'missionProgress', v: 3 },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 2, chance: 0.55 },
        ],
      },
    ],
  },
  {
    id: 'ev-tired-tech',
    title: 'Exhausted Technician',
    category: 'personnel',
    weight: 11,
    cooldown: 4,
    subject: 'tired',
    condition: (c) => c.avgFatigue > 30,
    body:
      '{rank} {subject} is at {fatigue}% fatigue and has an aircraft opened up in {room}. Their chief wants them relieved; the work order is half finished and nobody else has their hands.',
    choices: [
      {
        label: 'Send them to their rack',
        hint: 'The job waits. So does the aircraft.',
        effects: [
          { t: 'fatigue', v: -26, scope: { kind: 'subject' } },
          { t: 'morale', v: 5, scope: { kind: 'subject' } },
          { t: 'flag', key: 'workDelayed', v: 1 },
        ],
      },
      {
        label: 'Let them finish the job',
        hint: 'Tired hands on an open aircraft.',
        effects: [
          { t: 'fatigue', v: 12, scope: { kind: 'subject' } },
          { t: 'schedule', eventId: 'ev-maintenance-error', inDays: 1, chance: 0.4 },
        ],
      },
    ],
  },

  // =========================================================================
  // Mechanical / aircraft
  // =========================================================================
  {
    id: 'ev-aircraft-accident',
    title: 'Flight Deck Accident',
    category: 'emergency',
    weight: 5,
    priority: 2,
    cooldown: 14,
    minDay: 3,
    body:
      'A tow tractor lost hydraulic pressure during a night respot and an aircraft went into the safety net stanchion. Two crew are down and the airframe is bent.',
    choices: [
      {
        label: 'Full stop — secure the deck and investigate',
        hint: 'The right answer. It costs you the day.',
        effects: [
          { t: 'injure', count: 2, days: 7 },
          { t: 'aircraftDamage', count: 1, amount: 30 },
          { t: 'morale', v: -5, scope: { kind: 'all' } },
          { t: 'missionProgress', v: -5 },
          { t: 'schedule', eventId: 'ev-investigation', inDays: 3 },
        ],
      },
      {
        label: 'Clear the wreck and keep the cycle going',
        hint: 'The deck keeps moving. So does whatever caused this.',
        effects: [
          { t: 'injure', count: 2, days: 7 },
          { t: 'aircraftDamage', count: 1, amount: 30 },
          { t: 'morale', v: -11, scope: { kind: 'all' } },
          { t: 'prestige', v: -8 },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 9, chance: 0.45 },
        ],
      },
    ],
  },
  {
    id: 'ev-investigation',
    title: 'Mishap Investigation Report',
    category: 'command',
    weight: 0,
    cooldown: 40,
    chained: true,
    body:
      'The investigation is on your desk. The tractor’s hydraulic inspection was signed off eleven days late. The signature belongs to a chief with fourteen years aboard and an otherwise spotless record.',
    choices: [
      {
        label: 'Formal disciplinary action',
        hint: 'Procedure tightens. The division will not forgive it quickly.',
        effects: [
          { t: 'morale', v: -9, scope: { kind: 'department', department: 'DECK' } },
          { t: 'skill', specialty: 'handling', v: 2, scope: { kind: 'department', department: 'DECK' } },
          { t: 'prestige', v: 6 },
          { t: 'flag', key: 'strictCommand', v: 1 },
        ],
      },
      {
        label: 'Retraining, not punishment',
        hint: 'Costs money and a week of a good chief’s time.',
        effects: [
          { t: 'credits', v: -14000 },
          { t: 'morale', v: 6, scope: { kind: 'department', department: 'DECK' } },
          { t: 'skill', specialty: 'handling', v: 3, scope: { kind: 'department', department: 'DECK' } },
        ],
      },
      {
        label: 'File it and move on',
        hint: 'Nothing changes, which is the problem.',
        effects: [
          { t: 'morale', v: -3, scope: { kind: 'all' } },
          { t: 'prestige', v: -5 },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 12, chance: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'ev-maintenance-error',
    title: 'Maintenance Error Found',
    category: 'mechanical',
    weight: 0,
    cooldown: 12,
    chained: true,
    body:
      'A quality assurance walk-through found a panel refitted with the wrong fasteners on an aircraft that flew twice yesterday. It held. It should not have.',
    choices: [
      {
        label: 'Ground the airframe and re-inspect the whole batch',
        hint: 'Thorough. Expensive in time and parts.',
        effects: [
          { t: 'workOrder', count: 2, severity: 1 },
          { t: 'supply', k: 'parts', v: -6 },
          { t: 'prestige', v: 4 },
          { t: 'skill', specialty: 'airframe', v: 2, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
      {
        label: 'Fix that one aircraft',
        hint: 'Probably fine. Probably.',
        effects: [
          { t: 'workOrder', count: 1 },
          { t: 'schedule', eventId: 'ev-battle-damage', inDays: 5, chance: 0.3 },
        ],
      },
    ],
  },
  {
    id: 'ev-good-catch',
    title: 'A Junior Technician Finds Something',
    category: 'mechanical',
    weight: 7,
    cooldown: 10,
    minDay: 5,
    subject: 'junior',
    body:
      '{subject}, three months out of technical school, stopped a launch. They found a chafed control run inside a wing root that was not on any inspection card. Their chief says another twenty hours and it would have failed in flight.',
    choices: [
      {
        label: 'Recognise it publicly at quarters',
        hint: 'The whole ship hears that speaking up is rewarded.',
        effects: [
          { t: 'morale', v: 16, scope: { kind: 'subject' } },
          { t: 'morale', v: 5, scope: { kind: 'all' } },
          { t: 'xp', v: 20, scope: { kind: 'subject' } },
          { t: 'prestige', v: 10 },
        ],
      },
      {
        label: 'Quiet word and a note in their record',
        hint: 'Correct, unremarkable, and less useful than it could be.',
        effects: [
          { t: 'morale', v: 8, scope: { kind: 'subject' } },
          { t: 'xp', v: 12, scope: { kind: 'subject' } },
          { t: 'prestige', v: 3 },
        ],
      },
    ],
  },
  {
    id: 'ev-elevator-jam',
    title: 'Aircraft Elevator Failure',
    category: 'mechanical',
    weight: 7,
    cooldown: 11,
    body:
      'The forward aircraft elevator has jammed at hangar level with an airframe on the platform. Until it moves, half the deck cycle runs through one elevator.',
    choices: [
      {
        label: 'All hands from Engineering onto it',
        hint: 'Fixed by morning. Engineering does nothing else today.',
        effects: [
          { t: 'fatigue', v: 15, scope: { kind: 'department', department: 'ENG' } },
          { t: 'roomCondition', v: 8, roomId: 'd2-elev1' },
          { t: 'supply', k: 'parts', v: -8 },
          { t: 'missionProgress', v: -2 },
        ],
      },
      {
        label: 'Work around it and repair overnight',
        hint: 'Slower cycle for a day, but nothing else stops.',
        effects: [
          { t: 'missionProgress', v: -4 },
          { t: 'fatigue', v: 7, scope: { kind: 'department', department: 'DECK' } },
          { t: 'supply', k: 'parts', v: -4 },
        ],
      },
      {
        label: 'Bypass the interlock and keep using it',
        hint: 'It will move. It should not.',
        effects: [
          { t: 'missionProgress', v: 2 },
          { t: 'roomCondition', v: -14, roomId: 'd2-elev1' },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 4, chance: 0.4 },
        ],
      },
    ],
  },
  {
    id: 'ev-arrestor-fail',
    title: 'Arresting Gear Anomaly',
    category: 'mechanical',
    weight: 6,
    cooldown: 12,
    body:
      'Number three arresting engine is showing inconsistent retraction pressure. Deck Department wants it out of service for a full strip-down; Air Department points out that three wires make a very thin margin for night recovery.',
    choices: [
      {
        label: 'Out of service — strip it down',
        hint: 'Safe. Recovery rate drops while it is down.',
        effects: [
          { t: 'missionProgress', v: -4 },
          { t: 'supply', k: 'parts', v: -6 },
          { t: 'fatigue', v: 8, scope: { kind: 'department', department: 'DECK' } },
        ],
      },
      {
        label: 'Keep it rigged for day recovery only',
        hint: 'A reasonable middle course with a real edge to it.',
        effects: [
          { t: 'missionProgress', v: -1 },
          { t: 'missionRisk', v: 6 },
        ],
      },
      {
        label: 'Leave it in service',
        hint: 'Four wires, one of them suspect.',
        effects: [
          { t: 'missionRisk', v: 16 },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 3, chance: 0.35 },
        ],
      },
    ],
  },
  {
    id: 'ev-weapons-fault',
    title: 'Ordnance Handling Discrepancy',
    category: 'aircraft',
    weight: 6,
    cooldown: 10,
    body:
      'A magazine inventory does not reconcile: the count is right but two arming units are logged to an aircraft that never flew. Weapons Department wants a full magazine recount, which shuts ordnance handling down for a day.',
    choices: [
      {
        label: 'Full recount — nobody touches the magazine',
        hint: 'The only defensible answer. It costs a launch cycle.',
        effects: [
          { t: 'missionProgress', v: -5 },
          { t: 'prestige', v: 5 },
          { t: 'skill', specialty: 'weapons', v: 2, scope: { kind: 'department', department: 'AIR' } },
          { t: 'fatigue', v: 10, scope: { kind: 'department', department: 'AIR' } },
        ],
      },
      {
        label: 'Spot-check the affected racks',
        hint: 'Faster. Narrower.',
        effects: [
          { t: 'missionProgress', v: -1 },
          { t: 'missionRisk', v: 8 },
        ],
      },
      {
        label: 'Correct the paperwork',
        hint: 'The count is right, after all.',
        effects: [
          { t: 'prestige', v: -6 },
          { t: 'missionRisk', v: 14 },
          { t: 'schedule', eventId: 'ev-magazine-incident', inDays: 7, chance: 0.35 },
        ],
      },
    ],
  },
  {
    id: 'ev-magazine-incident',
    title: 'Magazine Incident',
    category: 'emergency',
    weight: 0,
    priority: 3,
    cooldown: 40,
    chained: true,
    body:
      'An arming unit was found on a handling cart in a passageway, unsecured, half a deck from where it should have been. No one will say who left it. The magazine discrepancy you filed away is now a formal inquiry.',
    choices: [
      {
        label: 'Report it up the chain yourself',
        hint: 'Prestige hit now, credibility kept.',
        effects: [
          { t: 'prestige', v: -22 },
          { t: 'morale', v: -4, scope: { kind: 'all' } },
          { t: 'skill', specialty: 'weapons', v: 4, scope: { kind: 'department', department: 'AIR' } },
          { t: 'flag', key: 'selfReported', v: 1 },
        ],
      },
      {
        label: 'Handle it internally',
        hint: 'Contained, unless it is not.',
        effects: [
          { t: 'prestige', v: -8 },
          { t: 'morale', v: -9, scope: { kind: 'department', department: 'AIR' } },
          { t: 'schedule', eventId: 'ev-command-inquiry', inDays: 10, chance: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'ev-command-inquiry',
    title: 'Command Inquiry',
    category: 'command',
    weight: 0,
    priority: 3,
    cooldown: 60,
    chained: true,
    body:
      'Fleet has sent an inspection team. They are asking about the magazine incident, and they have the original discrepancy log.',
    choices: [
      {
        label: 'Full cooperation',
        hint: 'Painful and final.',
        effects: [
          { t: 'prestige', v: -45 },
          { t: 'credits', v: -50000 },
          { t: 'morale', v: -6, scope: { kind: 'all' } },
          { t: 'flag', key: 'inquiryClosed', v: 1 },
        ],
      },
      {
        label: 'Defend the ship’s handling of it',
        hint: 'Might hold. Might double the cost.',
        effects: [
          { t: 'prestige', v: -18 },
          { t: 'morale', v: 4, scope: { kind: 'all' } },
          { t: 'schedule', eventId: 'ev-inquiry-verdict', inDays: 8 },
        ],
      },
    ],
  },
  {
    id: 'ev-inquiry-verdict',
    title: 'Inquiry Findings',
    category: 'command',
    weight: 0,
    cooldown: 90,
    chained: true,
    body:
      'The findings are in. The team accepted that the ship’s handling procedures were sound but criticised the command climate that let a discrepancy be filed away.',
    choices: [
      {
        label: 'Accept the findings',
        hint: 'It ends here.',
        effects: [
          { t: 'prestige', v: -12 },
          { t: 'morale', v: -2, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-battle-damage',
    title: 'Aircraft Returns Damaged',
    category: 'aircraft',
    weight: 6,
    cooldown: 8,
    condition: (c) => c.missionActive,
    body:
      'An airframe recovered with structural damage and a dead hydraulic system. Maintenance estimates four days of work, or two days if they cannibalise parts from a hangared aircraft.',
    choices: [
      {
        label: 'Order parts and do it properly',
        hint: 'Four days down, stores drawn.',
        effects: [
          { t: 'workOrder', count: 2, severity: 2 },
          { t: 'supply', k: 'parts', v: -12 },
          { t: 'credits', v: -18000 },
        ],
      },
      {
        label: 'Cannibalise the hangar queen',
        hint: 'One aircraft flies sooner, another stops flying at all.',
        effects: [
          { t: 'workOrder', count: 1, severity: 1 },
          { t: 'aircraftDamage', count: 1, amount: 22 },
        ],
      },
      {
        label: 'Defer it — park the aircraft',
        hint: 'Nothing spent, nothing gained, one fewer airframe.',
        effects: [
          { t: 'aircraftDamage', count: 1, amount: 12 },
          { t: 'morale', v: -3, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
    ],
  },

  // =========================================================================
  // Operational / weather / mission
  // =========================================================================
  {
    id: 'ev-storm',
    title: 'Severe Weather Approaching',
    category: 'weather',
    weight: 10,
    cooldown: 7,
    body:
      'A storm front will reach the operating area within eight hours. Sea state will make recovery marginal and the deck will need to be respotted and chained.',
    choices: [
      {
        label: 'Continue operations',
        hint: 'Progress now, risk now.',
        effects: [
          { t: 'missionProgress', v: 7 },
          { t: 'missionRisk', v: 14 },
          { t: 'fatigue', v: 9, scope: { kind: 'onduty' } },
          { t: 'schedule', eventId: 'ev-aircraft-accident', inDays: 1, chance: 0.28 },
        ],
      },
      {
        label: 'Reduce flight operations',
        hint: 'The measured option.',
        effects: [
          { t: 'missionProgress', v: 2 },
          { t: 'fatigue', v: 3, scope: { kind: 'onduty' } },
        ],
      },
      {
        label: 'Cancel today’s operations and secure the deck',
        hint: 'No risk, no progress, and the crew gets a rare quiet day.',
        effects: [
          { t: 'missionProgress', v: -3 },
          { t: 'fatigue', v: -12, scope: { kind: 'all' } },
          { t: 'morale', v: 3, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-deck-foul',
    title: 'Foul Deck',
    category: 'operational',
    weight: 9,
    cooldown: 5,
    body:
      'An aircraft has gone down on the foul line with a nose gear indication during a recovery cycle. There are four airframes in the pattern and one of them is at low state.',
    choices: [
      {
        label: 'Divert the low-state aircraft to the tanker',
        hint: 'Costs fuel, buys time.',
        effects: [
          { t: 'supply', k: 'fuel', v: -5 },
          { t: 'missionProgress', v: 1 },
        ],
      },
      {
        label: 'Push the aircraft clear by hand — fast',
        hint: 'Deck crew work under a recovering aircraft.',
        effects: [
          { t: 'fatigue', v: 10, scope: { kind: 'department', department: 'DECK' } },
          { t: 'missionProgress', v: 3 },
          { t: 'missionRisk', v: 7 },
        ],
      },
      {
        label: 'Rig the barricade',
        hint: 'Safe, slow, and everybody watching will note it.',
        effects: [
          { t: 'missionProgress', v: -2 },
          { t: 'prestige', v: -2 },
          { t: 'fatigue', v: 5, scope: { kind: 'department', department: 'DECK' } },
        ],
      },
    ],
  },
  {
    id: 'ev-contact-unknown',
    title: 'Unidentified Contact',
    category: 'operational',
    weight: 9,
    cooldown: 5,
    condition: (c) => c.missionActive,
    body:
      'CIC holds an air contact at 140 miles, closing, no response to interrogation. Operations recommends launching the alert fighters.',
    choices: [
      {
        label: 'Launch the alert pair',
        hint: 'Correct and expensive in fuel and crew rest.',
        effects: [
          { t: 'supply', k: 'fuel', v: -6 },
          { t: 'fatigue', v: 7, scope: { kind: 'department', department: 'AIR' } },
          { t: 'missionProgress', v: 4 },
          { t: 'xp', v: 8, scope: { kind: 'department', department: 'OPS' } },
        ],
      },
      {
        label: 'Track it and hold the fighters',
        hint: 'Cheaper. Depends on your Operations department.',
        effects: [
          { t: 'missionProgress', v: 2 },
          { t: 'missionRisk', v: 6 },
          { t: 'xp', v: 5, scope: { kind: 'department', department: 'OPS' } },
        ],
      },
    ],
  },
  {
    id: 'ev-cap-intercept',
    title: 'Intercept',
    category: 'mission',
    weight: 8,
    cooldown: 6,
    condition: (c) => c.missionActive && c.readyAircraft > 2,
    body:
      'The alert pair has intercepted and is escorting the contact clear. The wing wants to extend the patrol to shadow it home; that means a tanker cycle and two more hours on tired aircrew.',
    choices: [
      {
        label: 'Extend the patrol',
        hint: 'Good intelligence, tired crews, thirsty aircraft.',
        effects: [
          { t: 'missionProgress', v: 6 },
          { t: 'supply', k: 'fuel', v: -7 },
          { t: 'fatigue', v: 9, scope: { kind: 'department', department: 'AIR' } },
          { t: 'prestige', v: 5 },
        ],
      },
      {
        label: 'Recover the pair',
        hint: 'Nothing gained, nothing spent.',
        effects: [{ t: 'missionProgress', v: 2 }],
      },
    ],
  },
  {
    id: 'ev-shadowed',
    title: 'We Are Being Watched',
    category: 'operational',
    weight: 7,
    cooldown: 9,
    condition: (c) => c.missionActive,
    body:
      'A trawler has been holding station twelve miles off the beam for two days, matching every course change. Operations is confident it is collecting.',
    choices: [
      {
        label: 'Run deception — vary the cycle, mask emissions',
        hint: 'Protects the mission, complicates everything aboard.',
        effects: [
          { t: 'missionProgress', v: -2 },
          { t: 'missionRisk', v: -10 },
          { t: 'fatigue', v: 6, scope: { kind: 'department', department: 'OPS' } },
          { t: 'xp', v: 10, scope: { kind: 'department', department: 'OPS' } },
        ],
      },
      {
        label: 'Carry on as normal',
        hint: 'Let them watch a well-run ship.',
        effects: [
          { t: 'missionRisk', v: 8 },
          { t: 'missionProgress', v: 2 },
        ],
      },
    ],
  },
  {
    id: 'ev-observer',
    title: 'Fleet Observer Aboard',
    category: 'command',
    weight: 6,
    cooldown: 14,
    minDay: 10,
    body:
      'A staff captain has embarked to observe operations for three days. Everything the ship does this week will be written down by someone who reports to the people who assign missions.',
    choices: [
      {
        label: 'Show them the real ship',
        hint: 'Honest. Whatever is broken will be seen.',
        effects: [
          { t: 'prestige', v: 12 },
          { t: 'flag', key: 'observerHonest', v: 1 },
          { t: 'morale', v: 2, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Put the best division forward',
        hint: 'Safer prestige, and the crew knows exactly what you did.',
        effects: [
          { t: 'prestige', v: 18 },
          { t: 'morale', v: -5, scope: { kind: 'all' } },
          { t: 'fatigue', v: 8, scope: { kind: 'onduty' } },
        ],
      },
    ],
  },
  {
    id: 'ev-comms-fault',
    title: 'Communications Degraded',
    category: 'operational',
    weight: 7,
    cooldown: 9,
    body:
      'The primary satellite terminal has dropped out and the backup is running at reduced bandwidth. Operations can work through it, but coordination will be slower and less certain.',
    choices: [
      {
        label: 'Pull an electrical team off machinery to fix it',
        hint: 'Comms restored, Engineering loses a day.',
        effects: [
          { t: 'fatigue', v: 11, scope: { kind: 'department', department: 'ENG' } },
          { t: 'supply', k: 'parts', v: -5 },
          { t: 'roomCondition', v: 6, roomId: 'd3-comms' },
        ],
      },
      {
        label: 'Operate on the backup',
        hint: 'Degraded Operations for a few days.',
        effects: [
          { t: 'roomCondition', v: -8, roomId: 'd3-comms' },
          { t: 'missionRisk', v: 9 },
        ],
      },
    ],
  },
  {
    id: 'ev-reactor-alarm',
    title: 'Reactor Plant Alarm',
    category: 'emergency',
    weight: 3,
    priority: 3,
    cooldown: 25,
    minDay: 8,
    body:
      'A coolant pump has annunciated low differential pressure and the plant has automatically reduced power. Reactor Control reports the plant is stable and safe. Available power is down, which means fewer catapult cycles.',
    choices: [
      {
        label: 'Shut the affected loop down and repair it',
        hint: 'By the book. Reduced power for two days.',
        effects: [
          { t: 'missionProgress', v: -6 },
          { t: 'supply', k: 'parts', v: -10 },
          { t: 'fatigue', v: 12, scope: { kind: 'department', department: 'ENG' } },
          { t: 'prestige', v: 4 },
        ],
      },
      {
        label: 'Run on reduced power and repair at sea alongside',
        hint: 'A compromise Engineering does not love.',
        effects: [
          { t: 'missionProgress', v: -2 },
          { t: 'missionRisk', v: 12 },
          { t: 'supply', k: 'parts', v: -6 },
        ],
      },
    ],
  },

  // =========================================================================
  // Logistics / medical
  // =========================================================================
  {
    id: 'ev-fuel-drain',
    title: 'Aviation Fuel Running Low',
    category: 'logistics',
    weight: 9,
    cooldown: 6,
    condition: (c) => c.supplies.fuel < 45,
    body:
      'Aviation fuel is down to {fuel}%. The next replenishment window is not for several days, and the current launch cycle will not reach it.',
    choices: [
      {
        label: 'Request an emergency replenishment',
        hint: 'Expensive, and Fleet notices you did not plan.',
        effects: [
          { t: 'supply', k: 'fuel', v: 40 },
          { t: 'credits', v: -60000 },
          { t: 'prestige', v: -5 },
        ],
      },
      {
        label: 'Cut the launch cycle to conserve',
        hint: 'Free, and the mission slows down.',
        effects: [
          { t: 'missionProgress', v: -7 },
          { t: 'supply', k: 'fuel', v: 8 },
        ],
      },
      {
        label: 'Press on and hope for the window',
        hint: 'If you run dry mid-mission, everything stops.',
        effects: [
          { t: 'missionRisk', v: 15 },
          { t: 'supply', k: 'fuel', v: -4 },
        ],
      },
    ],
  },
  {
    id: 'ev-parts-shortage',
    title: 'Spare Parts Shortage',
    category: 'logistics',
    weight: 9,
    cooldown: 6,
    condition: (c) => c.supplies.parts < 40 && c.openWorkOrders > 2,
    body:
      'Spares are at {parts}% with {openWorkOrders} work orders open. Supply says the high-demand avionics modules are the constraint.',
    choices: [
      {
        label: 'Buy spares at premium price',
        hint: 'Solves it with money.',
        effects: [
          { t: 'supply', k: 'parts', v: 35 },
          { t: 'credits', v: -55000 },
        ],
      },
      {
        label: 'Authorise controlled cannibalisation',
        hint: 'Free parts from an aircraft you stop flying.',
        effects: [
          { t: 'supply', k: 'parts', v: 18 },
          { t: 'aircraftDamage', count: 1, amount: 25 },
          { t: 'morale', v: -3, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
      {
        label: 'Prioritise the work orders and wait',
        hint: 'Discipline. The backlog grows.',
        effects: [
          { t: 'morale', v: -2, scope: { kind: 'department', department: 'MAINT' } },
          { t: 'missionProgress', v: -4 },
        ],
      },
    ],
  },
  {
    id: 'ev-food-low',
    title: 'Fresh Provisions Exhausted',
    category: 'logistics',
    weight: 8,
    cooldown: 8,
    condition: (c) => c.supplies.food < 35,
    body:
      'The last of the fresh provisions went out at breakfast. Everything from here is out of a can until replenishment, and five thousand people will notice by tomorrow.',
    choices: [
      {
        label: 'Arrange a stores transfer',
        hint: 'Money fixes it.',
        effects: [
          { t: 'supply', k: 'food', v: 45 },
          { t: 'credits', v: -35000 },
        ],
      },
      {
        label: 'Ration and explain it at quarters',
        hint: 'Honesty helps a little. Not much.',
        effects: [
          { t: 'supply', k: 'food', v: 10 },
          { t: 'morale', v: -6, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-medical-surge',
    title: 'Medical Surge',
    category: 'medical',
    weight: 7,
    cooldown: 8,
    body:
      'Medical has more patients than beds — a mix of heat casualties from the flight deck and a gastrointestinal outbreak in one berthing compartment.',
    choices: [
      {
        label: 'Convert a berthing space into an overflow ward',
        hint: 'Capacity now, crowding later.',
        effects: [
          { t: 'supply', k: 'medical', v: -12 },
          { t: 'morale', v: -4, scope: { kind: 'all' } },
          { t: 'flag', key: 'overflowWard', v: 1 },
        ],
      },
      {
        label: 'Fly the worst cases ashore',
        hint: 'Costs a sortie and some fuel; they get real hospitals.',
        effects: [
          { t: 'supply', k: 'fuel', v: -4 },
          { t: 'credits', v: -22000 },
          { t: 'morale', v: 3, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Treat aboard and restrict movement',
        hint: 'Contained, uncomfortable, and slower to clear.',
        effects: [
          { t: 'supply', k: 'medical', v: -18 },
          { t: 'morale', v: -7, scope: { kind: 'all' } },
          { t: 'fatigue', v: 5, scope: { kind: 'department', department: 'MED' } },
        ],
      },
    ],
  },
  {
    id: 'ev-relief-overload',
    title: 'More People Than Lift',
    category: 'mission',
    weight: 8,
    cooldown: 6,
    condition: (c) => c.missionActive,
    body:
      'The shore team reports three times the expected number of people waiting at the landing site, and the light is going. Every additional lift tonight is flown by aircrew already at their limit.',
    choices: [
      {
        label: 'Fly through the night',
        hint: 'More people out. Everyone pays for it tomorrow.',
        effects: [
          { t: 'missionProgress', v: 11 },
          { t: 'prestige', v: 14 },
          { t: 'fatigue', v: 16, scope: { kind: 'onduty' } },
          { t: 'supply', k: 'fuel', v: -8 },
          { t: 'missionRisk', v: 10 },
        ],
      },
      {
        label: 'Stop at last light, resume at dawn',
        hint: 'Disciplined. Some of those people will not be there at dawn.',
        effects: [
          { t: 'missionProgress', v: 3 },
          { t: 'morale', v: -4, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Request additional lift from the group',
        hint: 'Shares the credit and the load.',
        effects: [
          { t: 'missionProgress', v: 7 },
          { t: 'prestige', v: 4 },
          { t: 'credits', v: -15000 },
        ],
      },
    ],
  },
  {
    id: 'ev-morale-slump',
    title: 'The Ship Has Gone Quiet',
    category: 'morale',
    weight: 10,
    cooldown: 9,
    condition: (c) => c.avgMorale < 48,
    body:
      'Morale is at {avgMorale}%. The mess is silent, the recreation space is empty, and three separate chiefs have used the same phrase this week: the crew is just going through the motions.',
    choices: [
      {
        label: 'Steel beach picnic — half a day off',
        hint: 'Costs stores and a day. Works.',
        effects: [
          { t: 'morale', v: 15, scope: { kind: 'all' } },
          { t: 'fatigue', v: -8, scope: { kind: 'all' } },
          { t: 'supply', k: 'food', v: -10 },
          { t: 'credits', v: -25000 },
          { t: 'missionProgress', v: -4 },
        ],
      },
      {
        label: 'Address the crew directly',
        hint: 'Free. Depends on what you have earned.',
        effects: [
          { t: 'morale', v: 7, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Nothing — they will work through it',
        hint: 'Sometimes true.',
        effects: [
          { t: 'morale', v: -4, scope: { kind: 'all' } },
          { t: 'schedule', eventId: 'ev-resentment', inDays: 5, chance: 0.6 },
        ],
      },
    ],
  },
  {
    id: 'ev-funding-review',
    title: 'Operating Budget Review',
    category: 'command',
    weight: 6,
    cooldown: 20,
    minDay: 14,
    body:
      'Fleet is reviewing the ship’s operating account. You can make a case for additional funding, but you will be asked to justify the tempo you have been running.',
    choices: [
      {
        label: 'Request an increase',
        hint: 'Money now, scrutiny later.',
        effects: [
          { t: 'credits', v: 90000 },
          { t: 'prestige', v: -6 },
        ],
      },
      {
        label: 'Report the account as sufficient',
        hint: 'Reputation for efficiency; no cash.',
        effects: [
          { t: 'prestige', v: 12 },
        ],
      },
      {
        label: 'Return unspent funds',
        hint: 'A gesture, at a real cost.',
        effects: [
          { t: 'credits', v: -40000 },
          { t: 'prestige', v: 22 },
        ],
      },
    ],
  },
  {
    id: 'ev-fire',
    title: 'Fire in a Machinery Space',
    category: 'emergency',
    weight: 4,
    priority: 3,
    cooldown: 18,
    minDay: 6,
    body:
      'Class Bravo fire reported in an auxiliary machinery space. The compartment is manned. Damage Control is closing up; the on-scene leader is asking permission to enter rather than seal and flood the space.',
    choices: [
      {
        label: 'Send the hose team in',
        hint: 'Saves the equipment. Risks the team.',
        effects: [
          { t: 'injure', count: 1, days: 6 },
          { t: 'roomCondition', v: -12, department: 'ENG' },
          { t: 'fatigue', v: 14, scope: { kind: 'department', department: 'ENG' } },
          { t: 'prestige', v: 6 },
          { t: 'morale', v: 4, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Seal and flood the compartment',
        hint: 'Nobody gets hurt. The space is destroyed.',
        effects: [
          { t: 'roomCondition', v: -34, department: 'ENG' },
          { t: 'supply', k: 'parts', v: -14 },
          { t: 'credits', v: -45000 },
          { t: 'morale', v: -2, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  // =========================================================================
  // On passage — the transit legs have their own work and their own risks
  // =========================================================================
  {
    id: 'ev-unrep',
    title: 'Replenishment at Sea',
    category: 'logistics',
    weight: 14,
    cooldown: 8,
    condition: (ctx) => ctx.status === 'outbound' || ctx.status === 'inbound',
    body:
      'A fleet oiler has been routed to meet you on the passage. Coming alongside at speed is hard work for the deck and supply departments, and the stores are not free — but nothing else can come aboard until you are back in port.',
    choices: [
      {
        label: 'Full replenishment',
        hint: 'Fuel, food and parts topped up. A long, tiring evolution.',
        effects: [
          { t: 'supply', k: 'fuel', v: 30 },
          { t: 'supply', k: 'food', v: 20 },
          { t: 'supply', k: 'parts', v: 18 },
          { t: 'credits', v: -70000 },
          { t: 'fatigue', v: 7, scope: { kind: 'department', department: 'DECK' } },
          { t: 'fatigue', v: 7, scope: { kind: 'department', department: 'SUP' } },
        ],
      },
      {
        label: 'Fuel only',
        hint: 'A short approach. The essentials, cheaply.',
        effects: [
          { t: 'supply', k: 'fuel', v: 25 },
          { t: 'credits', v: -25000 },
          { t: 'fatigue', v: 3, scope: { kind: 'department', department: 'DECK' } },
        ],
      },
      {
        label: 'Wave her off',
        hint: 'No cost and no stores. The crew notices the mail did not come.',
        effects: [{ t: 'morale', v: -3, scope: { kind: 'all' } }],
      },
    ],
  },
  {
    id: 'ev-gq-drill',
    title: 'General Quarters Drill',
    category: 'training',
    weight: 10,
    cooldown: 7,
    condition: (ctx) => ctx.status === 'outbound' || ctx.status === 'inbound',
    body:
      'The executive officer wants to use the passage for a full general quarters drill: every compartment manned, damage control teams put through their paces, the flight deck cleared and re-spotted.',
    choices: [
      {
        label: 'Full drill, twice',
        hint: 'The crew gets better. It also gets tired.',
        effects: [
          { t: 'xp', v: 8, scope: { kind: 'all' } },
          { t: 'fatigue', v: 9, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'One run-through',
        hint: 'A useful rehearsal at a modest cost.',
        effects: [
          { t: 'xp', v: 4, scope: { kind: 'all' } },
          { t: 'fatigue', v: 4, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Not this passage',
        hint: 'Everyone rests. The XO thinks the ship is going soft, and the operation carries the risk.',
        effects: [
          { t: 'morale', v: 2, scope: { kind: 'all' } },
          { t: 'missionRisk', v: 5 },
        ],
      },
    ],
  },
  {
    id: 'ev-man-overboard',
    title: 'Man Overboard',
    category: 'emergency',
    weight: 5,
    cooldown: 20,
    subject: 'junior',
    condition: (ctx) => ctx.status === 'outbound' || ctx.status === 'inbound',
    body:
      '"Man overboard, starboard side!" {rank} {subject} went over the side from a sponson in a rising sea. The escort is closer, but the carrier has the helicopters.',
    choices: [
      {
        label: 'Turn the ship and launch the helicopters',
        hint: 'Fuel and a night’s routine thrown away — and the whole crew sees the ship come back for one of its own.',
        effects: [
          { t: 'supply', k: 'fuel', v: -6 },
          { t: 'fatigue', v: 5, scope: { kind: 'all' } },
          { t: 'morale', v: 6, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Helicopters only, the ship holds her course',
        hint: 'A middle path that rests on the aircrew.',
        effects: [
          { t: 'fatigue', v: 6, scope: { kind: 'department', department: 'AIR' } },
          { t: 'xp', v: 3, scope: { kind: 'department', department: 'AIR' } },
          { t: 'morale', v: 2, scope: { kind: 'all' } },
        ],
      },
      {
        label: 'Leave it to the escort',
        hint: 'Efficient. The sailor comes back hurt, and the crew draws its own conclusions.',
        effects: [
          { t: 'injure', count: 1, days: 6, scope: { kind: 'subject' } },
          { t: 'morale', v: -8, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-heavy-seas',
    title: 'Heavy Weather on Passage',
    category: 'weather',
    weight: 9,
    cooldown: 8,
    condition: (ctx) => ctx.status === 'outbound' || ctx.status === 'inbound',
    body:
      'A deep low is crossing the route. Green water is coming over the bow and the hangar deck is moving under the parked aircraft.',
    choices: [
      {
        label: 'Ride it out at speed',
        hint: 'Keeps the schedule. Something will break.',
        effects: [
          { t: 'aircraftDamage', count: 1, amount: 18 },
          { t: 'roomCondition', v: -8, department: 'DECK' },
        ],
      },
      {
        label: 'Double the lashings and ease the speed',
        hint: 'Hard, wet work for the deck crews and extra fuel. Nothing breaks.',
        effects: [
          { t: 'fatigue', v: 6, scope: { kind: 'department', department: 'DECK' } },
          { t: 'supply', k: 'fuel', v: -5 },
        ],
      },
      {
        label: 'Strike everything below',
        hint: 'Safe, and a day’s work for the deck and the shops to undo.',
        effects: [
          { t: 'fatigue', v: 4, scope: { kind: 'department', department: 'DECK' } },
          { t: 'fatigue', v: 4, scope: { kind: 'department', department: 'MAINT' } },
        ],
      },
    ],
  },
  // =========================================================================
  // Operations — each mechanic brings its own decisions
  // =========================================================================
  {
    id: 'ev-unid-contact',
    title: 'Unidentified Contact',
    category: 'mission',
    weight: 16,
    cooldown: 3,
    condition: (ctx) => ctx.mechanic === 'contacts' && ctx.unidentified >= 2,
    body:
      'A surface contact has gone dark and is closing the operating area at speed. The picture says fishing trawler; the track says otherwise.',
    choices: [
      {
        label: 'Send a section to intercept',
        hint: 'Eyes on it within the hour. Fuel and a tired pair of aircrew.',
        effects: [
          { t: 'mech', key: 'identified', v: 2 },
          { t: 'missionProgress', v: 3 },
          { t: 'supply', k: 'fuel', v: -3 },
          { t: 'fatigue', v: 4, scope: { kind: 'department', department: 'AIR' } },
        ],
      },
      {
        label: 'Shadow it with the Hawkeye',
        hint: 'A slower answer, and the contact may slip away.',
        effects: [
          { t: 'mech', key: 'identified', v: 1 },
          { t: 'missionRisk', v: 2 },
        ],
      },
      {
        label: 'Log it and carry on',
        hint: 'No cost today. An unknown in the picture is a risk carried.',
        effects: [{ t: 'missionRisk', v: 5 }],
      },
    ],
  },
  {
    id: 'ev-fishing-fleet',
    title: 'A Fishing Fleet in the Box',
    category: 'mission',
    weight: 10,
    cooldown: 5,
    condition: (ctx) => ctx.mechanic === 'contacts',
    body:
      'Forty fishing boats have drifted into the patrol area, each one a contact to sort from anything hiding among them. The boarding team is keen; the recon crews are not.',
    choices: [
      {
        label: 'Sort them one by one',
        hint: 'Every contact accounted for. A long day for the recon crews.',
        effects: [
          { t: 'mech', key: 'found', v: 3 },
          { t: 'mech', key: 'identified', v: 3 },
          { t: 'fatigue', v: 5, scope: { kind: 'department', department: 'OPS' } },
        ],
      },
      {
        label: 'Route the patrol around them',
        hint: 'Clean picture, smaller area: the operation loses a little ground.',
        effects: [{ t: 'missionProgress', v: -2 }],
      },
      {
        label: 'Treat the fleet as one contact',
        hint: 'Fast, and anything hiding in it stays hidden.',
        effects: [{ t: 'missionRisk', v: 4 }],
      },
    ],
  },
  {
    id: 'ev-raid-warning',
    title: 'Raid Warning',
    category: 'mission',
    weight: 16,
    cooldown: 3,
    condition: (ctx) => ctx.mechanic === 'threat' && ctx.threatTomorrow >= 2,
    body:
      'Intelligence expects a heavy raid tomorrow: aircraft massing at two fields and a surface group moving to support them. The CAP as tasked will not meet it all.',
    choices: [
      {
        label: 'Surge the CAP tomorrow',
        hint: 'High tempo: more fighters up, more fatigue and wear.',
        effects: [
          { t: 'tempo', v: 'high' },
          { t: 'fatigue', v: 3, scope: { kind: 'department', department: 'AIR' } },
        ],
      },
      {
        label: 'Bring the alert to five minutes overnight',
        hint: 'Takes risk off now; the alert crews lose their sleep.',
        effects: [
          { t: 'missionRisk', v: -4 },
          { t: 'fatigue', v: 4, scope: { kind: 'department', department: 'AIR' } },
        ],
      },
      {
        label: 'Trust the screen as tasked',
        hint: 'Nothing changes. Check the tasking order before the day ends.',
        effects: [{ t: 'missionRisk', v: 2 }],
      },
    ],
  },
  {
    id: 'ev-leaker',
    title: 'Leaker',
    category: 'emergency',
    weight: 14,
    cooldown: 3,
    condition: (ctx) => ctx.mechanic === 'threat' && ctx.leakers > 0,
    body:
      'A raider slipped the screen yesterday and fired before the CAP could turn back. A ship in company is damaged; her captain is asking what the carrier means to do about it.',
    choices: [
      {
        label: 'Send the damage control team across',
        hint: 'Your engineers save her. They come back exhausted.',
        effects: [
          { t: 'fatigue', v: 8, scope: { kind: 'department', department: 'ENG' } },
          { t: 'prestige', v: 6 },
          { t: 'missionProgress', v: 2 },
        ],
      },
      {
        label: 'Launch the alert and hunt the shooter',
        hint: 'A point made. The alert crews fly a long night.',
        effects: [
          { t: 'missionRisk', v: -5 },
          { t: 'fatigue', v: 6, scope: { kind: 'department', department: 'AIR' } },
        ],
      },
      {
        label: 'Keep station and report it',
        hint: 'The operation goes on. The fleet will remember the screen failed.',
        effects: [
          { t: 'prestige', v: -6 },
          { t: 'morale', v: -3, scope: { kind: 'all' } },
        ],
      },
    ],
  },
  {
    id: 'ev-mass-casualty',
    title: 'Mass Casualty Arrival',
    category: 'medical',
    weight: 16,
    cooldown: 3,
    condition: (ctx) => ctx.mechanic === 'casualties' && ctx.evacuees >= 30,
    body:
      'Three helicopters are inbound with more injured than sick bay has beds. The medical officer wants the hangar deck cleared for triage within twenty minutes.',
    choices: [
      {
        label: 'Clear the hangar — triage there',
        hint: 'Everyone pitches in. Medical stores and sleep both go fast.',
        effects: [
          { t: 'supply', k: 'medical', v: -8 },
          { t: 'fatigue', v: 5, scope: { kind: 'all' } },
          { t: 'morale', v: 4, scope: { kind: 'all' } },
          { t: 'missionProgress', v: 4 },
        ],
      },
      {
        label: 'Fly the worst cases ashore',
        hint: 'They get a real hospital; the helicopters lose half a day.',
        effects: [
          { t: 'supply', k: 'fuel', v: -6 },
          { t: 'missionProgress', v: 1 },
        ],
      },
      {
        label: 'Sick bay only; the routine continues',
        hint: 'The ship keeps its rhythm. The crew sees who is left waiting.',
        effects: [{ t: 'morale', v: -4, scope: { kind: 'all' } }],
      },
    ],
  },
  {
    id: 'ev-target-shift',
    title: 'The Target Moves',
    category: 'mission',
    weight: 14,
    cooldown: 4,
    condition: (ctx) => ctx.mechanic === 'window' && ctx.intel >= 50,
    body:
      'The target the package has been building toward has moved overnight. The intelligence is a day old; the strike leads want to go anyway.',
    choices: [
      {
        label: 'Re-task the recon and rebuild the picture',
        hint: 'Sound targeting, and the window slips.',
        effects: [{ t: 'mech', key: 'intel', v: -20 }],
      },
      {
        label: 'Strike on the old intelligence',
        hint: 'Progress now, at a real risk of hitting nothing worth hitting.',
        effects: [
          { t: 'missionProgress', v: 5 },
          { t: 'missionRisk', v: 6 },
        ],
      },
      {
        label: 'Ask the theatre for fresh imagery',
        hint: 'Costs money and goodwill with staff. The picture holds.',
        effects: [
          { t: 'credits', v: -40000 },
          { t: 'prestige', v: -3 },
        ],
      },
    ],
  },
  {
    id: 'ev-shadowed',
    title: 'Shadowed',
    category: 'mission',
    weight: 14,
    cooldown: 3,
    condition: (ctx) => ctx.mechanic === 'escalation',
    body:
      'A foreign destroyer has taken station two miles off the quarter and is lighting the carrier up with fire-control radar. The world is watching what the Resolute does next.',
    choices: [
      {
        label: 'Hold course and ignore it',
        hint: 'No escalation from you. It reads as weakness to some.',
        effects: [{ t: 'mech', key: 'tension', v: 4 }],
      },
      {
        label: 'Put a helicopter over it',
        hint: 'A clear message. Tension climbs, and so does your standing.',
        effects: [
          { t: 'mech', key: 'tension', v: 9 },
          { t: 'prestige', v: 5 },
          { t: 'missionRisk', v: -2 },
        ],
      },
      {
        label: 'Open a bridge-to-bridge channel',
        hint: 'Talk it down. Some at home will call it soft.',
        effects: [
          { t: 'mech', key: 'tension', v: -9 },
          { t: 'prestige', v: -3 },
        ],
      },
    ],
  },
  {
    id: 'ev-flashpoint',
    title: 'Flashpoint',
    category: 'emergency',
    weight: 30,
    priority: 2,
    cooldown: 4,
    condition: (ctx) => ctx.mechanic === 'escalation' && ctx.tension >= 85,
    body:
      'Missile boats are closing at speed and the other side has stopped answering on any channel. The next decision will be read in every capital in the region.',
    choices: [
      {
        label: 'Hold fire and stand firm',
        hint: 'Nerve under pressure. The crew feels every minute of it.',
        effects: [
          { t: 'mech', key: 'tension', v: -15 },
          { t: 'morale', v: -4, scope: { kind: 'all' } },
          { t: 'missionRisk', v: 4 },
        ],
      },
      {
        label: 'Show of force: launch the alert',
        hint: 'They turn away, or they do not. Progress and risk both jump.',
        effects: [
          { t: 'mech', key: 'tension', v: 5 },
          { t: 'missionProgress', v: 6 },
          { t: 'missionRisk', v: 6 },
        ],
      },
      {
        label: 'Open the distance — ten miles',
        hint: 'The crisis cools. The operation gives ground, and so does your name.',
        effects: [
          { t: 'mech', key: 'tension', v: -25 },
          { t: 'missionProgress', v: -8 },
          { t: 'prestige', v: -10 },
        ],
      },
    ],
  },
];

export const EVENTS_BY_ID: Record<string, EventDef> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
);

export function eventDef(id: string): EventDef | null {
  return EVENTS_BY_ID[id] ?? null;
}
