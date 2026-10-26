/**
 * Collects every user-facing English string in the game.
 *
 * Three sources:
 *  - content, walked from the data modules themselves (rooms, missions,
 *    events, courses...), so nothing is missed when content is added;
 *  - deferred `key:` / `reason:` templates recorded by the simulation;
 *  - UI chrome, scraped from the translating call sites in src/ui.
 *
 * Context-qualified keys (`status|WORKING`) are listed in CONTEXT_KEYS
 * because their arguments are computed at runtime.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** t(value, ctx) call sites whose value is dynamic. */
export const CONTEXT_KEYS = {
  status: [
    'WORKING', 'RESTING', 'TRAINING', 'MENTORING', 'SICK', 'INJURED',
    'HOSPITAL', 'ON LEAVE', 'EMERGENCY',
  ],
  aircraft: ['READY', 'NOT READY', 'DAMAGED', 'IN MAINTENANCE', 'AIRBORNE'],
  readiness: ['EXCELLENT', 'READY', 'DEGRADED', 'LIMITED', 'CRITICAL'],
  legend: [
    'CREW', 'AIRCRAFT', 'SYSTEM', 'SUPPORT', 'ELEVATOR', 'STAIRS / LADDER',
    'IDLE', 'WORKING', 'TRAINING', 'REPAIRING', 'ALERT',
  ],
  metric: ['AIRCRAFT', 'CREW', 'READINESS', 'PRESTIGE', 'CREDITS', 'SORTIES'],
  tempo: ['LOW', 'NORMAL', 'HIGH', 'MAXIMUM'],
  role: ['FIGHTER', 'EW', 'AEW', 'HELO', 'TRANSPORT', 'UAV'],
  system: ['Engine', 'Avionics', 'Airframe', 'Fuel'],
  roomkind: [
    'WORK', 'HANGAR', 'FLIGHT', 'BERTHING', 'MESS', 'MEDICAL', 'TRAINING',
    'STORE', 'COMMAND', 'ELEVATOR', 'STAIRS',
  ],
  category: [
    'PERSONNEL', 'TRAINING', 'MECHANICAL', 'AIRCRAFT', 'MEDICAL', 'MORALE',
    'OPERATIONAL', 'MISSION', 'WEATHER', 'LOGISTICS', 'COMMAND', 'EMERGENCY',
    'NARRATIVE',
  ],
  missioncat: ['HUMANITARIAN', 'MARITIME', 'AIR', 'FLEET', 'INTEL', 'COMBAT', 'CRISIS'],
  coursecat: ['BASIC', 'SPECIALTY', 'ADVANCED', 'LEADERSHIP'],
  duty: ['STRIKE', 'CAP', 'RECON', 'LIFT', 'ASW', 'TANKER', 'EW ESCORT', 'SAR', 'TRAINING', 'ALERT', 'MAINT', 'STOOD DOWN'],
  eqcat: ['DECK', 'MAINTENANCE', 'SAFETY', 'CREW', 'WEAPONS', 'OPERATIONS'],
  carrierstatus: ['IN PORT', 'OUTBOUND', 'ON STATION', 'RETURNING'],
  watch: ['SRG', 'STD', '3W'],
  threat: ['NONE', 'LIGHT', 'HEAVY', 'MAJOR'],
};

function walkTs(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.ts') && !p.includes('i18n')) files.push(p);
    }
  };
  walk(root);
  return files;
}

const KEY_FIELD = /\b(?:key|reason):\s*'((?:[^'\\]|\\.)*)'/g;

export async function collectContentStrings() {
  const { DECKS } = await import('../src/data/decks.ts');
  const { MISSIONS, UPGRADES } = await import('../src/data/missions.ts');
  const { EVENTS } = await import('../src/data/events.ts');
  const { TRAINING_COURSES } = await import('../src/data/training.ts');
  const { DUTIES } = await import('../src/data/aircraft.ts');
  const { POSTS } = await import('../src/data/posts.ts');
  const { EQUIPMENT } = await import('../src/data/equipment.ts');
  const { SPECIALTIES, DEPARTMENTS } = await import('../src/data/specialties.ts');
  const { RANKS, PROMOTION_GATES } = await import('../src/data/ranks.ts');
  const { PRESTIGE_TIERS, SUPPLY_LABELS } = await import('../src/core/economy.ts');
  const { OUTCOME_LABELS } = await import('../src/core/missions.ts');
  const { ATTR_LABELS, TRAIT_LABELS, DEFAULT_TASKS } = await import('../src/core/crew.ts');

  const out = new Set();
  const add = (s) => {
    if (typeof s === 'string' && s.trim()) out.add(s);
  };

  for (const deck of DECKS) {
    add(deck.name);
    add(deck.short);
    for (const room of deck.rooms) {
      add(room.name);
      add(room.short);
    }
  }
  for (const m of MISSIONS) {
    add(m.title);
    add(m.description);
    m.objectives.forEach(add);
    m.recommended.forEach(add);
  }
  for (const u of UPGRADES) {
    add(u.name);
    add(u.description);
    u.effectText.forEach(add);
  }
  for (const e of EVENTS) {
    add(e.title);
    add(e.body);
    for (const c of e.choices) {
      add(c.label);
      add(c.hint);
    }
  }
  for (const c of TRAINING_COURSES) {
    add(c.name);
    add(c.description);
  }
  for (const d of DUTIES) {
    add(d.name);
    add(d.short);
    add(d.description);
  }
  for (const p of POSTS) {
    add(p.name);
    add(p.short);
  }
  for (const e of EQUIPMENT) {
    add(e.name);
    add(e.description);
    add(e.effectText);
  }
  for (const s of Object.values(SPECIALTIES)) {
    add(s.name);
    add(s.short);
  }
  for (const d of Object.values(DEPARTMENTS)) add(d.name);
  for (const r of RANKS) add(r.name);
  for (const g of PROMOTION_GATES) add(g.label);
  for (const p of PRESTIGE_TIERS) {
    add(p.name);
    add(p.unlocks);
  }
  Object.values(SUPPLY_LABELS).forEach(add);
  Object.values(OUTCOME_LABELS).forEach(add);
  Object.values(ATTR_LABELS).forEach(add);
  Object.values(TRAIT_LABELS).forEach(add);
  Object.values(DEFAULT_TASKS).forEach(add);

  // Deferred templates recorded by the simulation, which are `key:` and
  // `reason:` fields rather than t() calls.
  for (const file of walkTs('src/core')) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(KEY_FIELD)) {
      add(m[1].replace(/\\'/g, "'"));
    }
  }

  for (const [ctx, values] of Object.entries(CONTEXT_KEYS)) {
    for (const v of values) out.add(ctx + '|' + v);
  }

  return out;
}

/**
 * Fields that hold English source strings translated at display time:
 * deployment objective labels and the tutorial's step titles and bodies.
 */
const TEXT_FIELD = /\b(?:label|title|body|domain|effect|delegation|good|bad):\s*'((?:[^'\\]|\\.)*)'/g;
const TEXT_FIELD_FILES = ['src/core/deployment.ts', 'src/ui/tutorial.ts', 'src/core/council.ts', 'src/core/alerts.ts', 'src/core/operations.ts'];

/** Scrape translating call sites out of the source. */
export function collectUiStrings(root = 'src') {
  const CALLS = [
    't', 'tf', 'note', 'noteRaw', 'sectionTitle', 'button', 'statRow', 'attrRow',
    'pill', 'panel', 'open', 'toast',
  ];
  const pattern = new RegExp('\\b(?:' + CALLS.join('|') + ")\\(\\s*'((?:[^'\\\\]|\\\\.)*)'", 'g');

  const out = new Set();
  for (const file of walkTs(root)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(pattern)) {
      const raw = m[1].replace(/\\'/g, "'");
      if (raw.trim()) out.add(raw);
    }
  }
  for (const file of TEXT_FIELD_FILES) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(TEXT_FIELD)) out.add(m[1].replace(/\\'/g, "'"));
  }
  return out;
}

/**
 * Strings that reach t() through a variable rather than a literal argument:
 * table headers, tab labels, ternaries and helper return values. Listed
 * explicitly so the coverage test still accounts for them.
 */
export const INDIRECT_UI = [
  'DECK MASTER',
  'PROGRESS',
  'ACTIVITY',
  'STAND DOWN',
  'RETURN TO DUTY',
  'NAME',
  'RANK',
  'SPECIALTY',
  'SKILL',
  'LOCATION',
  'MORALE',
  'FATIGUE',
  'FACILITIES',
  'RECRUITMENT',
  'STORES',
  'Level',
  'Est. success',
  'Aircraft Ready',
  'Crew Readiness',
  'Carrier Readiness',
  'Aviation Fuel',
  'Engineering',
  'Operations',
  'Aircraft',
  'Crew',
  'Maintenance',
  'Logistics',
  'Weapons',
  'Medical',
  'Command',
  'TAIL',
  'TYPE',
  'STATUS',
  'DUTY',
  'Less fatigue, less wear, fewer accidents — slower mission progress.',
  'Balanced',
  'Faster progress and more sorties, at the cost of fatigue, wear and accident risk.',
  'Maximum progress. Very high fatigue and wear, high accident risk, bonus prestige if it works.',
  '{system} discrepancy',
  '{system} fault',
  '{system} major fault',
  'Already enrolled in a course',
  'Not available for duty',
  'Already completed',
  'Insufficient credits',
  'No qualified instructor available aboard',
  '1 maintenance task set back by error',
  '{n} maintenance tasks set back by error',
  // Aircrew warnings, also chosen by a ternary on the count.
  '1 airframe is flying short-crewed',
  '{n} airframes are flying short-crewed',
  '1 tasked airframe has no pilot in the seat and will not launch',
  '{n} tasked airframes have no pilot in the seat and will not launch',
  '1 mentoring pair active',
  '{n} mentoring pairs active',
  'Mentoring programme started',
  'Mentoring ended',
  'Standing too low for this airframe',
  'Standing too low for this equipment',
  'No parking left on the deck or in the hangar',
  'The ship holds as many as it can use',
  'Insufficient prestige',
  'The ship is on passage — nothing can be brought aboard until it returns to port',
  'The ship is on station — nothing can be brought aboard until it returns to port',
  'The ship is on passage home — wait until it is alongside',
  // The crew picker's table headers and its trade-filter toggle, both of
  // which reach t() through a variable.
  'FIT',
  'CONDITION',
  'POST NOW',
  'SHOW EVERY TRADE',
  'ONLY MATCHING TRADES',
  // statusDetail() picks these in a ternary, and the mission card's `mk`
  // helper translates its label through a variable.
  'arrives on station tomorrow',
  'on station in {n} days',
  'alongside tomorrow',
  'alongside in {n} days',
  'On station',
  'Passage',
  'Total',
  // Ternary branches and lookup tables in the deployment and its debrief.
  'NEXT',
  'FINISH',
  'Days at sea and alongside',
  // Council: temperaments and opinions.
  // Alerts: ternary titles, and the decision line the journal records.
  'Emergency decision pending',
  'Decisions pending',
  'Decision — {title}: {choice}',
  // Why an alert airframe is not ready (ALERT_PROBLEM_LABELS).
  'not mission capable',
  'in the hangar',
  'no fit crew in the seats',
  'low on fuel',
  'not armed',
  'no launch spot free',
  // Mission mechanics (MECHANIC_LABELS).
  'Contacts to find and identify',
  'Daily raids, forecast the evening before',
  'Evacuees and injured brought aboard',
  'Targeting, then a two-day strike window',
  'Tension that rises on its own',
  'TO DECK ALERT',
  'UP FROM THE HANGAR',
  'DOWN TO THE HANGAR',
  'AUTO-PLAY: ON',
  'AUTO-PLAY: OFF',
  'RUNNING IT',
  'LET THEM RUN IT',
  'REPLACE',
  'Cautious',
  'Measured',
  'Bold',
  'Loyal',
  'Content',
  'Reserved',
  'Wary',
  'Hostile',
  // Watch bill policies, objective states, readiness advice and labels.
  'SURGE',
  'STANDARD',
  '3 WATCHES',
  'Surge: nobody is stood down. Everyone on duty today, paid for in fatigue later.',
  'Standard: the exhausted are stood down to rest, a few at a time.',
  'Three watches: people rest before they are worn out. Fewer hands on duty, sharper ones.',
  'Done',
  'On track',
  'At risk',
  'Missed',
  'Release airframes to the shops on MAINT duty and keep parts stocked.',
  'Put tired departments on three watches, lower the tempo, or let the ship rest alongside.',
  'Clear the backlog: technicians on duty, parts aboard, fewer sorties for a day.',
  'Engineering is worn: three watches for ENG and no maximum tempo.',
  'Operations is stretched: rotate its watches and fill its posts.',
  'Stores are low: buy supplies alongside, or take a replenishment at sea.',
  'Restock ammunition and keep the air department rested.',
  'Sick bay is busy: lower the tempo and risk, keep medical stores up.',
  'Too few fit senior hands: rest your chiefs, promote, or recruit.',
  'Operations completed',
  'Crew injured on duty',
  'Orders not carried out',
  'Orders carried out',
  'Well done',
  'Bravo Zulu',
  'Exceptional command',
  'The operating account has been unsustainable for ten days. Command relieved.',
  'The operating account has been unsustainable for five days. Command relieved.',
  'Carrier readiness has been critical for fourteen days. Command relieved.',
  'Carrier readiness has been critical for seven days. Command relieved.',
  'Deployment accomplished. The Resolute is relieved on station and heads home.',
  'Deployment not accomplished. Fleet expected two successful operations.',
];

export async function collectAll() {
  const content = await collectContentStrings();
  const ui = collectUiStrings();
  for (const s of INDIRECT_UI) ui.add(s);
  return { content, ui, all: new Set([...content, ...ui]) };
}
