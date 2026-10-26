# Deck Master - USS Resolute

A turn-based aircraft carrier command simulation. One turn is one in-game day.
The ship itself is the interface: you navigate decks, inspect spaces, click on
people, and decide. There is no HR screen â€” personnel management happens where
the personnel physically are.

Built from `specifications/Deck_Master_Game_Specification.md` and
`specifications/pixel art decks.png`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + production bundle into dist/
npm test           # simulation test suite (vitest)
npm run verify     # headless playthrough + screenshots into shots/
npm run balance    # objective cover each mission achieves, for tuning
npm run balance:deployment   # what naive and careful players achieve in 30 days
```

Open `/dev/art.html` on the dev server for an art sheet of every airframe
sprite, spread and folded, at 1Ã— and 4Ã—.

`npm run verify` needs the preview server running (`npm run preview`). It drives
the real UI in Chromium â€” starts a campaign, walks the decks, opens a room, jumps
to a crew member from the roster, accepts a mission, answers events and plays
eight days â€” and fails on any console error.

## Controls

| Input | Action |
| --- | --- |
| Drag | Pan the deck |
| Wheel | Zoom toward the cursor |
| Shift+Wheel, â†‘ / â†“ | Change deck |
| `1`â€“`8` | Jump to a deck |
| Click | Inspect a room, person or aircraft |
| `F` | Fit the whole deck in view |
| `A` | Air tasking order |
| `S` / `M` | Staff roster / mission board |
| `C` | The commanding officer's council |
| `J` | The journal: alerts and the ship's log |
| `Esc` | Close the open dialog, or the context panel |
| `Enter` | End the day |

## Two campaigns

**Deployment â€” 30 days** is the way in, and what the title screen offers
first. The orders are fixed: complete two operations with Success or better
inside thirty days. Three more objectives â€” prestige 175, crew morale 70%,
readiness 60%, judged on the last day â€” each earn a star. The orders panel
in the sidebar shows the clock and every objective live; the deployment ends
with a debrief, and a good one can carry on as an open career with the same
ship. Sustained failure is judged faster than in a career (five days
insolvent, seven days critical).

The thresholds come from `npm run balance:deployment`, which plays the
deployment headless across twelve seeds with four players. Recent figures:

| Player | Wins | Stars |
| --- | --- | --- |
| Touches nothing (standard watch bill, auto-tasking, sails at once) | 2/12 | 0.1 |
| `SURGE=1`: nobody ever rests (the old default) | 0/12 | 0 |
| `ROTATION=1`: one decision, three watches everywhere | 12/12 | 1.5 |
| `CAREFUL=1`: three watches, work-ups on passage, recovery alongside | 12/12 | 1.6 |
| `DELEGATE=1`: every domain handed to the council, nothing else | 5/12 | 0.9 |

The orders separate the passive player from the one who manages fatigue;
the third star needs better than any of the bots.

**Open career** is the original sandbox: no horizon, ending only at
Legendary standing or on sustained failure.

A first deployment opens with a **guided first day** (`ui/tutorial.ts`):
eight coach marks over the real game, each waiting until the player has
actually done the thing â€” inspect an aircraft, go below, answer the day's
decisions, take an operation, set the tasking, end the day. Shown once per
browser, skippable at every step.

## The turn

One turn is one in-game day, and **nothing advances on its own** â€” there is no
clock, no timer and no real-time pressure anywhere. The top bar shows the day
and whether decisions are outstanding, not a time of day. Crew walking around
the deck is presentation only: it animates toward wherever the last resolved
day put them and never touches game state. `endDay()` is the sole place the
campaign moves. You can leave the game open indefinitely and return to exactly
the state you left.

### The council

The player is the commanding officer. Around the table sit ten department
heads â€” a separate corps of senior officers, not the ship's company
(`core/council.ts`, `ui/councilModal.ts`, key `C`):

| Seat | Standing effect | Left to run the domain, theyâ€¦ |
| --- | --- | --- |
| Executive Officer | fewer accidents, better morale | set the watch bill; answer personnel and command decisions |
| Air Boss | sortie capacity | set the tempo; answer flight deck decisions |
| Commander, Air Wing (CAG) | less aircrew fatigue from flying | write the air tasking order, fly work-ups on passage |
| Operations Officer | mission progress | choose and accept operations by value per day |
| Navigator | less fatigue on passage | answer weather decisions |
| Warfare Officer | operational risk shed daily | answer mission-risk decisions |
| Chief Engineer | repair rate | answer mechanical decisions |
| Supply Officer | stores consumption | restock alongside within a cash reserve |
| Information Warfare | the council's advice accuracy, mission progress | answer intelligence decisions |
| Command Master Chief | crew morale | answer morale, medical and personnel decisions |

- **Competence** sets the standing effect (`councilEffects.ts`): an average
  officer is neutral, a gifted one up to the full effect, a vacant seat a
  penalty. Kept free of imports so the simulation can read it without a cycle.
- **Advice.** On each decision card the seats responsible recommend a
  choice and say why. A competent officer usually picks what is genuinely
  best for the ship; otherwise they pick what their seat and temperament
  favour â€” the Supply Officer the cheap option, a cautious XO the safe one.
  Deterministic for the day.
- **Opinion** of the captain rises when their advice is taken and the ship
  succeeds, falls â€” more each time in a row â€” when it is ignored. Below âˆ’40
  an officer works at 60% effect. The portrait's expression shows it.
- **Delegation** saves the clicks and costs the control: left alone, an
  officer misjudges some days (nearly two in five for an average officer,
  rarely for a gifted one). A fully delegated ship wins about half its
  deployments; an engaged captain wins nearly all of them.
- Officers join or leave only alongside, from candidates refreshed at each
  return to port.

Officers have their own 48x48 portraits: the combination cover with gold on
the visor for commanders and captains, ribbons and warfare devices, leather
flight jackets and aviator glasses for the aviators, a backlight in the
department's colour.

### Operations that play their own way

Every mission still advances on the tasking order, but most carry a
mechanic of their own (`core/operations.ts`), run once a day on station:

| Mechanic | Missions | What it asks for |
| --- | --- | --- |
| Contacts | patrol, ELINT | recon finds contacts and identifies them; each identified one adds progress, four or more unidentified add risk |
| Threat | convoy, air defence | a raid every day, forecast the evening before (NONE → MAJOR); CAP aloft plus the deck alert must meet it, and raiders through cost risk and progress |
| Casualties | relief, evacuation | lift brings evacuees and injured aboard; food and medical stores pay, and an empty sick bay slows everything |
| Window | strike | recon builds a targeting picture (the day counts at ×0.35) until a two-day window opens (×1.6) |
| Escalation | crisis | tension climbs on its own; CAP, ASW and recon presence bring it down; ≥ 90 is a flashpoint, ≤ 20 de-escalation |

Each mechanic has its own events (unidentified contact, fishing fleet, raid
warning, leaker, mass casualty arrival, the target moves, shadowed,
flashpoint), conditioned on the mechanic's figures and able to move them
(`{ t: 'mech' }` effects). Every operation has one bonus objective, shown on
the board and the sidebar, paying +25% credits and +30% prestige on a
successful outcome. The sidebar, the mission board, the tasking panel
("TODAY'S OPERATION") and the alerts menu (raid expected, strike window
open, contacts piling up, tension rising) all read the same figures.

On a deployment the fleet assigns work beyond the ship's standing (minimum
prestige lowered by 150, `effectiveMinPrestige`), so the board is no longer
the same three entry operations for thirty days.

### Support duties and the MQ-25

Four duties give each airframe a job of its own, on top of strike, CAP,
recon and lift (`supportValue` and friends in `core/tasking.ts`):

| Duty | Flown by | Effect |
| --- | --- | --- |
| Aerial refuelling (TANKER) | Super Hornets (not the F-35C), MQ-25 best | multiplies strike, CAP and recon sorties, up to +25% |
| Electronic escort (EW ESCORT) | Growler | multiplies strike sorties, up to +30%, and takes risk off strikes |
| Anti-submarine warfare (ASW) | MH-60R (the S barely) | counts on patrol, convoy and crisis; with none flown there, progress ×0.85 and +3 risk a day |
| Plane guard / SAR | MH-60S best | with one up, flying aircrew are no likelier to be hurt than anyone else (×1.0 instead of ×1.5) |

Support works through the other sorties rather than as progress of its own,
and every support sortie takes a deck cycle, so it is a trade. Types can
override their role on a duty (`duties` on the type, read through
`typeSuitability`). The automatic order puts an ASW hunter up first where a
submarine is part of the threat, then lays on plane guard, escort and tanker
once the mission is covered, as far as the deck allows.

The **MQ-25A Stingray** (prestige 100) is the Navy's unmanned tanker:
nobody aboard, so it is always "crewed", flies at exactly its type's worth
and never touches the aircrew rota.

The alerts menu and the journal flag what the wing cannot do for the
operation in hand: a key task with no capable, crewed airframe ("Convoy
Protection needs Anti-Submarine Warfare"), support with nothing to fly it,
and a wing whose best possible order — worked out on a copy of the state —
still falls short of what the operation needs.

### Deck alert

Deck alert means ready to launch at five minutes, and the simulation holds
it to that (`alertBoard` in `core/tasking.ts`). An airframe tasked to alert
only stands it if it is mission capable, up on the flight deck, crewed with
a fit commander, fuelled to 60% and — fighters and jammers — armed to 50%.
There are four launch spots (the two bow catapults and two behind them);
qualified airframes beyond that stand by. Each ready alert airframe takes
1.2 points of risk off the operation every day; every two hold a catapult
and cost a deck cycle, and alert crews pick up a little fatigue from a day
strapped in. The tasking panel shows ready/spots and, per airframe, why one
is not ready (in the hangar, not armed, low on fuel, no crew, no spot).

Idle airframes now stand down rather than sitting a notional alert.
Tasking an airframe to alert brings it up from the hangar if a spot is free,
and the automatic order lays on a real alert from what is left after the
mission is covered. Any move between hangar and flight deck plays on the
forward elevator: the well opens, the airframe rises with its wings folded,
spreads them in the light and taxis to its spot (or the reverse).

### Flight operations

When the day ends, the day's flying is replayed on the flight deck before
the summary (`render/flightShow.ts`). It plays back what actually happened:
`endDay` records every sortie — airframe, duty, where it was spotted, and
whether it came back with a fault (`report.flights`). Jets taxi onto the two
bow catapults in turn, hold at the blast deflector and go off the bow in a
cloud of steam; helicopters lift straight off their spots; then up to three
aircraft come back up the angled deck and catch a wire, the ones with a
fault first, trailing smoke. Each carries a label (`#101 · STRIKE`) and a
banner sums up the air tasking order. Synthesised catapult and trap sounds.

Click the deck, or press Enter, Space or Escape, to skip. The banner can turn
auto-play off; the daily summary has WATCH FLIGHT OPS to replay the day
and an AUTO-PLAY toggle. Presentation only: nothing in it touches the state.

### Alerts and the journal

A single button at the top of the carrier view ("7 TO ATTEND TO", coloured by
the worst thing waiting) drops down everything that needs the captain. Each
pending decision is listed on its own, and clicking it brings its card
forward. The alerts follow, red urgent, amber warning, blue information,
each with a count: orders at risk, airframes out of service (damaged, in the
shops, waiting for parts), work stalled for parts, airframes short of
aircrew, posts short-handed, an operation below its requirements or
operations on the board the ship cannot yet take, an overdrawn account,
critical readiness, a tasking order that falls short, the ship alongside
without orders, worn-out departments, low stores, spaces in critical
condition, a vacant council seat, disaffected officers, crew due for
promotion. Click any line to go where it is decided or fixed. Alerts are
derived from the state (`core/alerts.ts`), so they vanish the moment their
cause is dealt with, and stay quiet about a domain the council is running.

The JOURNAL button in the top bar (`J`) opens the ship's log: every day's
notifications and every decision taken, newest first, kept in the save
(`state.journal`, last 240 entries). A badge counts what arrived since the
journal was last read.

### The watch bill

Fatigue is the dominant negative term in the simulation, so resting people is
the decision that most decides a deployment. It is taken per department, in
the WATCH BILL panel, not one person at a time (`core/watch.ts`):

| Policy | Stood down at | Back at | Most resting at once |
| --- | --- | --- | --- |
| Surge | never | 18% | â€” |
| Standard (default) | 82% fatigue | 30% | 15% of the department |
| Three watches | 52% fatigue | 24% | 40% of the department |

The change of watch runs at the end of each day, after the day's fatigue has
landed, so the player sees tomorrow's rota and can still override anyone by
hand. Changing a policy applies at once. The most tired go first.

### The mission cycle

The carrier has an operational status, and it decides what you are allowed to
do today:

```
port  ->  outbound  ->  on station  ->  inbound  ->  port
```

Accepting a mission commits the ship: it sails, and the status bar under the
top bar changes colour and reports which leg it is on and how long is left.
Each mission declares `transitDays` (each way) and `days` (the work in the
operating area), so the shortest operation is three days â€” one out, one on
station, one home. `missionTotalDays()` is what the mission board displays.

On passage the routine is lighter (70% of the tempo's fatigue, and the
operation's own strain only starts on station), so the transit is the chance
to get a tired ship back on its feet. Auto-tasking rests the wing in transit
rather than flying sorties that count for nothing. The alternative is
WORK-UPS ON PASSAGE: training sorties on the way out rehearse the operation,
each banking 0.5 progress for the first day on station, up to 12 â€” about two
full days of flying, paid for in aircrew fatigue and airframe hours. Work-ups
spare the operation's **key assets** — the few airframes able to fly a duty
it leans on (weight 0.5+), when there are four or fewer, such as the three
helicopters carrying a relief operation (`keyAssets` in `core/tasking.ts`) —
so their crews arrive rested; tasking them to training anyway raises a
warning in the tasking panel and the alerts menu, and the passage banner
names them. Four
events only happen on passage, including a replenishment at sea, the one way
to take on stores away from port.

Three rules follow from this, and they are the point of the feature:

- **The mission only advances on station.** Sorties flown during the passage
  count for nothing (`aircraftContribution` returns 0 off station). Transit is
  time you pay for.
- **Nothing comes aboard at sea.** Aircraft, equipment, stores, upgrades and
  recruitment are all refused unless the ship is alongside, and an order that
  falls due mid-deployment waits in port until the ship returns. A mission can
  only be accepted alongside, so you commit with the wing you have.
- **Port is the recovery phase.** Alongside, fatigue recovery is 1.6Ã— and
  maintenance runs 1.35Ã— faster with shore support. Coming alongside also
  reopens the mission board.

The status appears in four places: the coloured bar under the top bar with
phase pips, a row in the ship status panel, a banner across the Development
and Missions panels when at sea, and a leading banner in the daily summary on
the day a phase changes.

Note the phase order inside `endDay()`: the homeward leg is advanced *before*
the mission block, so the day a return transit is ordered is not also the day
it completes. Moving it after makes a one-day passage home cost nothing.

### Posts, not compartments

People are appointed to a **post** â€” the function they hold â€” and the ship
decides which of that post's compartments each of them works in today.

The distinction is not cosmetic. A trade covers several spaces: avionics work
happens in the avionics shop *and* in a maintenance bay, engine work in the
engine shop, a bay and the machine shop. Meanwhile every work order of a given
kind lands in exactly one room (`SYSTEM_ROOM` in `core/aircraft.ts`) and
`runMaintenance` gives a shop's orders to the people standing in that shop. So
when assignment was per-compartment, **61-68% of the maintenance trades sat in
a room their trade's orders never reached** and contributed nothing to
maintenance, for the whole campaign, with nothing in the UI to say so. That is
measured across seeds, and it is the bug the post model removes.

A post (`data/posts.ts`) is a trade, the compartments its job reaches, and its
established strength:

```
post-avionics   Avionics Maintenance   MAINT   avionics
                d2-avionics Â· d2-maint1        9 billets
```

`stationCrew()` runs at the start of each turn and places every person in one
of their post's spaces, weighting each space by the labour still outstanding
there â€” so a trade concentrates on its backlog and spreads out when there is
none. It is deliberately deterministic, so a campaign still replays from its
seed. `assignmentRoomId` survives as *where someone is today*, derived rather
than chosen, which keeps the deck view, room activity and the event system
working unchanged.

Two consequences worth knowing:

- **The establishment is stated once.** `CREW_COMPOSITION` is derived from the
  posts' billets, so the company's size and the posts cannot drift apart.
  `postManning()` reports strength against billets, which is how the UI knows
  a post is short-handed.
- **Overflow beats idling.** A post's spare people fall back to its home
  space even past that space's nominal capacity: an extra pair of hands on the
  backlog is worth more than a technician standing idle next door. Occupancy
  is clamped when it feeds room activity, so this cannot be exploited.

The squadrons are posts too, but carry no billets of their own â€” they are
established by the embarked air wing's seats rather than by the ship.

Appointment works from either end, ranked by the same measure (`postFit()`,
trade before ability): the crew panel offers posts for a person, and a room
panel lists the posts whose job reaches that space so you can man one from
there.

### The air tasking order

The central decision of each turn is what the air wing does that day. Every
airframe holds one duty â€” strike, CAP, recon, lift, training, deck alert,
maintenance or stood down â€” and mission progress is computed from that tasking,
not from a readiness score.

Each mission declares which duties count toward it and how much. Disaster
relief is carried by lift, so the Seahawks move it and fighters contribute
nothing; electronic intelligence is carried by recon, where the E-2D is worth
more than a fighter. An airframe only contributes if it is tasked to a duty the
mission rewards, is suited to that duty, is actually mission capable, and has a
crew in it.

Two ceilings apply on top:

- **Deck capacity.** Deck and Air departments turn the sorties, so their
  effective output â€” and the operational tempo â€” cap how many aircraft can
  launch regardless of how many sit ready. Aircrew are excluded from this
  count: pilots fly aircraft, they do not move them.
- **Suitability.** A transport on CAP contributes nothing at all.
- **Crew.** An airframe with no fit pilot in the seat does not launch, and the
  crew that is in it scales what the sortie is worth.

The panel (`A`, or `TASKING`) shows objective cover as a percentage: above 100%
the mission finishes early, below it progress slows in proportion. `AUTO-ASSIGN`
lays on a workable order; the interesting play is departing from it â€” holding
airframes on alert to shave accumulated risk, releasing tired ones to the shops,
or flying training sorties on a quiet day to build the crew.

`npm run balance` prints the cover a healthy ship achieves for every mission. A
test enforces that no mission is beyond what a well-tasked ship can physically
launch â€” a requirement the wing cannot reach is a wall, not a difficulty curve.

### Named aircrew

Every airframe has `crewRequired` seats and every seat holds a named person
(`core/aircrew.ts`). Seat 0 is the aircraft commander and must be a pilot; the
rest are mission crew, flown by the `aircrew` trade or by another pilot. The
seat array is always exactly as long as the type has seats, with `''` for a
vacancy, so a seat index means the same thing to the simulation and the UI.

Three consequences, and they are the point:

- **Who flies changes the result.** `crewFactor()` turns the crew's
  effectiveness into a multiplier on the sortie, centred so that a capable,
  rested crew is exactly Ã—1.00 and the swing is roughly âˆ’35%/+20%. The
  commander carries most of the weight â€” a single-seat Super Hornet is all
  pilot â€” and mission crew share the rest, so a Hawkeye flying with three of
  its five seats empty is markedly less use than a full one.
- **No pilot, no sortie.** An airframe with an empty or unfit commander seat
  does not launch, does not occupy a deck cycle, and contributes nothing. This
  is stricter than `isAvailable()`: `isFitToFly()` also excludes a crew member
  who has been stood down to rest, which is exactly the lever the player pulls
  to rotate a tired squadron.
- **Repeated tasking wears crews out.** Flying costs its crew far more fatigue
  than a day in a shop, and `consecutiveFlyingDays` compounds it, so a wing
  surged for a week stops performing. A tired crew is also 1.5Ã— more likely to
  hurt itself. The squadrons are generated with an 18% spare margin over the
  seats so rotation is a real option rather than a choice between flying tired
  people and grounding airframes.

The wing is funded as its own command: 85% of aircrew pay arrives as a weekly
allowance, so embarking squadrons does not simply double the ship's wage bill.

`TASKING` shows the commander, manned seats and the multiplier for every
airframe; clicking that cell opens the crew chart, where each seat can be
filled from the list of eligible people with their skill, fatigue and how many
days running they have flown. `AUTO-ASSIGN` fills only *empty* seats, so a
crew posted by hand survives it; `AUTO-CREW` is the explicit re-seat of the
whole wing.

### Why readiness moved

Every daily summary names the two or three readiness components that moved
most, by how many points of overall readiness, with the concrete cause
behind each ("Crew fatigue 58%, morale 61%, 4 away"). Each impact is the
change in overall readiness had only that component moved, so the
worst-component term is counted exactly (`explainReadiness` in
`core/readiness.ts`). The summary and the SHIP STATUS panel also name the
weakest link â€” 40% of overall readiness â€” and what fixes it.

## Buying things

`DEVELOPMENT` has five tabs. Two rules make spending a decision rather than a
shop:

- **Nothing arrives instantly.** Every order carries a lead time of 2â€“8 days,
  so a purchase is a bet on where the campaign will be next week â€” you cannot
  buy your way out of today's problem. Orders in transit show on every tab.
- **Prestige gates the catalogue**, so reputation opens access to better
  airframes rather than only paying for them.

**Aircraft** â€” eight airframe types, modelled on what a current US carrier air
wing flies. The embarked wing is F/A-18E and F/A-18F Super Hornets (VFA-14,
VFA-151 and VFA-41), EA-18G Growlers (VAQ-133), E-2D Advanced Hawkeyes
(VAW-117) and MH-60R/MH-60S Seahawks (HSM-71, HSC-14), with side numbers
following the real convention â€” 100s and 300s for the strike fighter
squadrons, 500s Growlers, 600s Hawkeyes, 610s HSC, 700s HSM.

Two types are gated behind standing rather than money: the CMV-22B Osprey at
250, which is the airframe that makes humanitarian and evacuation taskings
comfortable, and the F-35C Lightning II at 500 â€” a Marine detachment is
assigned to carriers that have earned one, and like everything else it can
only be taken on alongside. Each card shows sortie value, aircrew, fuel burn
and which duties the type is actually good for, so the purchase connects
directly to the tasking order. Parking is
physical: the ship holds what the flight deck and hangar can spot
(`AIRCRAFT_CAPACITY`, 26), counting orders in transit. If an airframe somehow
arrives with nowhere to go, the order is refunded rather than silently lost.

**Equipment** â€” ten items bought in quantity, each feeding exactly one
simulation term so the effect is legible:

| Item | Feeds |
| --- | --- |
| Tow tractors | `sortieCapacity` â€” +1 sortie per day each |
| Ground support / tool sets | `maintenanceSpeed` |
| Spare module pool | `partsEfficiency` â€” stretches stores |
| Flight deck safety equipment | `accidentRisk` |
| Firefighting & rescue | `emergencyDamage` |
| Improved berthing fittings | `restRate` |
| Precision munitions, datalink | `missionRisk` |
| Corrosion control | `aircraftWear` |

One effect per item is deliberate: a player can reason about what a purchase
buys. Effects are additive and read through `equipmentBonus()`, clamped at each
call site so stacked purchases cannot break a system. Tests assert each one
measurably changes the simulation.

Note that `equipmentBonus` lives in `core/equipmentEffects.ts`, not
`core/procurement.ts` â€” the simulation modules consume the lookups, while
procurement needs the parking layout from `core/aircraft.ts` at module scope.
Merging them reintroduces an import cycle that crashes on load order.

## Languages

The whole game plays in English or French â€” menus, room names, ranks, mission
briefings and every event. The `EN | FR` toggle sits in the top bar and on the
title screen; switching is instant and re-labels the campaign you are already
playing, including history already recorded. First visit follows the browser's
language, then remembers the choice.

Translation lives in `src/i18n/`:

- **English source strings are the keys.** There is no English table to keep in
  sync, and an untranslated string renders as English rather than a raw key.
- `fr.ts` holds the French. A `context|String` entry beats the bare one, which
  is how "Engine" the aircraft system and "Engine" the trade get different
  French words.
- The simulation records **what happened**, not a finished sentence: log lines,
  career entries and event bodies are stored as `{ key, vars, tvars }` and
  rendered at display time. That is why switching language also re-labels a
  crew member's career history and today's event cards.
- `tests/i18n.test.ts` walks the data modules and fails if any room, mission,
  course or event is missing French text â€” so adding content in English only
  breaks the build rather than shipping a half-translated screen. It also
  checks that every `{placeholder}` survives translation.

`npm run i18n:strings` prints every translatable string as JSON.

## Architecture

```
src/
  core/        Engine-agnostic simulation. No DOM, no Math.random().
    rng.ts         Seeded, stream-based randomness
    types.ts       All state shapes; GameState is plain JSON
    crew.ts        Attributes, effectiveness, progression, promotion
    posts.ts       Appointment to a function, fitness, daily stationing
    aircrew.ts     Named aircrew in seats, crew quality, flying fatigue
    aircraft.ts    Airframes, work orders, maintenance, flight ops
    readiness.ts   Department efficiency and carrier readiness
    missions.ts    Requirements, progress, outcome
    status.ts      The port -> outbound -> on station -> inbound cycle
    deployment.ts  The 30-day deployment: orders, objectives, grading
    watch.ts       The watch bill: department rest rotations
    council.ts     The CO's council: seats, advice, opinion, delegation
    councilEffects.ts  Seat effects, kept free of import cycles
    tasking.ts     The daily air tasking order and objective cover
    procurement.ts Ordering aircraft and equipment, delivery lead times
    equipmentEffects.ts  Equipment lookups, kept free of import cycles
    events.ts      Event selection, subjects, chains
    effects.ts     Declarative consequence interpreter
    training.ts    Courses, enrolment, mentoring
    economy.ts     Credits, prestige tiers, upgrades, recruitment
    simulation.ts  endDay() â€” the whole authoritative turn
    save.ts        Serialise / restore
  data/        Content. Add here, not to core.
    decks.ts       8 decks, ~150 rooms, transcribed from the concept art
    events.ts      Daily events and their chains
    missions.ts    Operations and facility upgrades
    training.ts    Course catalogue
    equipment.ts   Purchasable equipment catalogue
    posts.ts       The ship's posts: trade, spaces covered, billets
    specialties.ts / ranks.ts / aircraft.ts / names.ts
  render/      Canvas presentation only
    deckView.ts    Camera, deck renderer, live crew movement, hit testing
    miniMap.ts     The CARRIER OVERVIEW panel
    deckArt.ts     Pixel-art deck layers, furniture, flight deck, sea
    pixelArt.ts    Airframe blueprints, rasterised and shaded
    sprites.ts     Crew sprites
    aircraftArt.ts Airframe pictures for the panels
    flightShow.ts  The day's flying, replayed on the flight deck
    portrait.ts    Crew and officer photographs
    palette.ts     Colours sampled from the concept art
  ui/          Hand-built DOM, no framework
    audio.ts       Synthesised ambience and one-shots
    tutorial.ts    The guided first day
    deployment.ts  Orders panel and debrief
    watchBill.ts   The watch bill panel
    councilModal.ts  The council page
```

### Two rules worth keeping

**The simulation is authoritative and runs once per day.** Crew walking around
the deck is presentation. `endDay()` in `core/simulation.ts` is the only place
game state advances. That is what makes a campaign reproducible: the same seed
plus the same decisions replays exactly, which the test suite asserts.

**Nothing in `core/` may call `Math.random()`.** Every draw comes from
`Rng.stream(seed, day, label)`. A new random call with an ad-hoc seed will
silently break replay determinism.

## Design notes

Some decisions in here are load-bearing and easy to undo by accident.

**Readiness is not an average.** `computeReadiness` blends the weighted mean of
nine components with the single worst component, 60/40. One collapsed
department therefore drags the whole ship down â€” the specification's own worked
example (94/91/88/85/43 â†’ ~65) falls out of this formula, and a test pins it.

**Leadership is rolled independently of technical skill.** This is what makes
promotion a real decision rather than a reward: a 94-technical / 32-leadership
petty officer is worth more on the tools than running a division, and promoting
them removes them from production. The promotion gates check leadership, so such
a person genuinely stalls.

**Progression slows hard at the top.** `growthFactor` drops from 1.0 below 30 to
0.035 above 95. An exceptional crew member is the product of many weeks, which
is why you end up remembering them.

**Fatigue is the dominant negative term.** An exhausted expert produces less
than a rested average hand, and `mistakeChance` scales with the square of
fatigue. Running maximum tempo works, and then you pay for it.

**No event choice is strictly correct.** Each option trades something the player
wants for something else they want. Events can schedule follow-ups, so a corner
cut in week one arrives as an inquiry in week three.

**The mission cycle gates everything.** `isInPort()` guards every purchase and
delivery; `isOnStation()` guards mission progress. Removing either guard turns
transit into free time and makes deployment a formality.

**Mission progress comes from the tasking order, not from readiness.**
`advanceMission` multiplies by `computeTasking(state).ratio`; readiness and crew
availability now shape how well that tasking performs rather than substituting
for it. Reverting to a readiness-only formula would make the daily decision
cosmetic.

**Work-order ids come from `state.workOrderSeq`, not a module counter.** A
module-level counter breaks across a save/load cycle and between campaigns in
the same session. There is a regression test for this.

## Art

Everything is pixel art at one density: **one art pixel per world pixel**,
eight per tile. Decks, furniture, airframes and crew share it, so the ship
reads as one picture. Whole-number zoom steps keep pixels square; below 1:1
the renderer smooths instead of dropping pixels.

- **Decks** (`render/deckArt.ts`) are painted once per deck into an
  offscreen canvas and blitted: hull plating, bulkheads, doors onto the
  passageway, and furniture chosen per compartment â€” racks in berthing,
  serving lines in the galley, turbines in the machinery spaces, reactors,
  magazines, tanks. The flight deck is painted as a flight deck: angled
  landing area, four arresting wires, foul line, bow catapults with jet
  blast deflectors, the island and its shadow, the hull number. Game state
  (a room in poor condition, a busy space) is an overlay, so the art never
  needs rebuilding mid-campaign. Console lamps blink and radars turn live.
- **The sea.** The flight deck sits on animated water: a wake and bow wave
  under way, a pier with mooring lines alongside. Interior decks stay a
  cutaway on the dark page, with the decks above and below ghosted.
- **Airframes** (`render/pixelArt.ts`) are blueprints in metres, rasterised
  and shaded by rule â€” light from the top-left, one-pixel outline, contact
  shadows â€” with a folded-wing variant for the hangar and squadron colours
  on the fins. All eight types have art; the panels show the same sprite at
  an integer scale.
- **Crew** wear their trade's jersey on the flight deck (yellow directors,
  blue handlers, red ordnance, purple fuel, brown plane captains, green
  maintenance, white safety); below decks the vest shows what they are
  doing.
- **Personnel photographs** (`render/portrait.ts`): every crew member has a
  32x32 file photo generated from their id, so a face never changes
  between sessions. Uniform follows the job (khaki for chiefs and officers
  with collar devices, flight suits for aircrew, jersey and cranial for the
  deck trades, coveralls otherwise). The expression is live: rested and
  happy, hooded eyes when exhausted, a frown when morale is low, a dressing
  when injured. Shown in the crew file, the roster, the pickers and on
  event cards, where it links to the file.

The earlier hand-drawn illustrations in `pixel-art/` and `public/aircraft/`
are no longer used by the game.

## Sound

`ui/audio.ts` synthesises the ship with Web Audio â€” no sample files. The
bed follows the camera: wind and sea on the flight deck, stronger under
way; ventilation and machinery hum below, louder the deeper the deck. Over
it: catapult launches while the wing flies on station, the ship's bell at
the end of each day, the bosun's call at the start of the next, a klaxon
when a day opens with an emergency, a tick on every button. The SOUND
toggle in the top bar persists. Presentation only, like the walking crew.

## Not yet built

- Damage-control emergencies as physical crew movement to an incident
- Elevator queues and aircraft transit as animated state
- Officer careers, transfers and retirement over multi-year campaigns
- More than one carrier definition (the data layer supports it; there is one)
