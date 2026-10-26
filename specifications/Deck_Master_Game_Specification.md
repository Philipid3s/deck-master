# Carrier Command --- Full Game Specification

## 1. Executive Summary

**Genre:** Turn-based carrier management / simulation / strategy\
**Visual style:** Detailed 2D pixel art, top-down deck-by-deck carrier
view\
**Time model:** 1 turn = 1 in-game day\
**Primary fantasy:** Command a large nuclear-powered aircraft carrier as
a living organization: manage the ship, aircraft, crew, training,
maintenance, logistics, missions and daily crises.

The carrier itself is the primary user interface. The player normally
interacts with the ship by navigating between decks, inspecting rooms,
aircraft, equipment and individual crew members.

There is **no dedicated HR management screen**. A global staff roster is
available for searching/filtering personnel, but selecting a crew member
always returns the player to that person's physical location on the
carrier.

The game combines five major systems:

1.  Carrier operations
2.  Aircraft and mission management
3.  Crew/HR management
4.  Daily events and narrative decisions
5.  Prestige-based long-term progression

------------------------------------------------------------------------

# 2. Design Pillars

## 2.1 The carrier is the interface

The player should feel that they are managing a physical ship rather
than a collection of menus.

Everything important exists somewhere:

-   Aircraft
-   Crew
-   Workshops
-   Engineering systems
-   Operations rooms
-   Medical
-   Supply
-   Training
-   Weapons
-   Living quarters
-   Elevators
-   Corridors
-   Emergency equipment

## 2.2 The carrier is alive

Crew members move around the ship.

Aircraft move between decks.

Maintenance activities occur visually.

Training occurs physically.

Shift changes produce visible movement.

Emergencies cause personnel to respond.

## 2.3 Every decision has trade-offs

There should rarely be an obviously perfect answer.

Examples:

-   Send an exhausted technician to work or allow rest?
-   Approve leave before a major mission?
-   Train a highly skilled technician and temporarily lose their
    productivity?
-   Promote an excellent technician with weak leadership?
-   Push the carrier to high operational tempo?
-   Accept a risky mission for major Prestige?

## 2.4 People matter

Crew are not anonymous numbers.

Important crew members have:

-   Skills
-   Specialties
-   Experience
-   Personality
-   Morale
-   Fatigue
-   Career history
-   Training
-   Rank
-   Position

The player should gradually recognize and remember exceptional crew
members.

## 2.5 Long-term progression

Successful missions generate Prestige.

Prestige unlocks:

-   Better missions
-   Better recruits
-   Advanced equipment
-   Weapons
-   Carrier improvements

The carrier should gradually evolve from an average ship into an elite
command.

------------------------------------------------------------------------

# 3. Reference Carrier

The initial game should be based on a **fictional Nimitz-class-style
nuclear aircraft carrier** inspired by ships such as USS Abraham
Lincoln.

Do not reproduce classified or sensitive real-world details.

Use a fictional ship name throughout the game.

Suggested placeholder:

**USS Resolute**

The game should be architected so the carrier definition can later be
changed through data files.

------------------------------------------------------------------------

# 4. Core Game Loop

``` text
START DAY
    |
    v
Generate 1–3 daily events
    |
    v
Player resolves events
    |
    v
Player manages carrier
    |
    +--> Assign crew
    +--> Move aircraft
    +--> Start maintenance
    +--> Start training
    +--> Promote personnel
    +--> Adjust shifts
    +--> Manage supplies
    +--> Prepare mission
    |
    v
Mission simulation / progress
    |
    v
Resolve daily consequences
    |
    v
Calculate:
    - Crew XP
    - Fatigue
    - Morale
    - Maintenance
    - Carrier readiness
    - Mission progress
    - Credits
    - Prestige
    |
    v
Daily summary
    |
    v
NEXT DAY
```

------------------------------------------------------------------------

# 5. Time System

## 5.1 Turn length

Exactly:

**1 turn = 1 in-game day**

The player may perform actions during the day.

When the player selects **END DAY**, the simulation resolves.

## 5.2 Daily phases

Each day consists of:

### Phase 1 --- Morning

-   New day begins
-   Crew recovery
-   Daily maintenance tick
-   Mission progression
-   New events generated

### Phase 2 --- Event resolution

Generate 1--3 events.

The player must respond.

### Phase 3 --- Management

The player may:

-   Assign personnel
-   Start/stop training
-   Assign work
-   Move aircraft
-   Schedule maintenance
-   Adjust operational tempo
-   Manage logistics
-   Prepare mission operations

### Phase 4 --- Operational resolution

Resolve:

-   Mission progress
-   Aircraft operations
-   Maintenance
-   Crew activity
-   Fatigue
-   Equipment wear

### Phase 5 --- End-of-day

Calculate:

-   XP
-   Promotions eligibility
-   Morale
-   Fatigue
-   Readiness
-   Credits
-   Prestige
-   Event consequences

Display a daily report.

------------------------------------------------------------------------

# 6. Main Resources

## 6.1 Prestige

Prestige is the carrier's strategic reputation.

Prestige is earned through:

-   Successful missions
-   Exceptional mission performance
-   Saving lives
-   Successful crisis response
-   Humanitarian achievements
-   Efficient operations
-   Exceptional aircraft operations

Prestige is lost through:

-   Mission failure
-   Excessive casualties
-   Aircraft losses
-   Major operational failures
-   Serious accidents
-   Poor crisis decisions

Prestige is spent on:

-   Elite recruitment
-   Advanced equipment
-   Weapons
-   Carrier upgrades
-   Unlocking opportunities

Prestige should not be directly equivalent to money.

## 6.2 Credits

Credits represent the operational budget.

Used for:

-   Maintenance
-   Repairs
-   Training
-   Supplies
-   Recruitment
-   Upgrades
-   Operations

Credits are earned from:

-   Mission rewards
-   Periodic command funding
-   Successful operations
-   Special events

## 6.3 Crew capacity

The carrier has a maximum crew capacity.

Crew capacity is affected by:

-   Accommodation
-   Medical capacity
-   Food capacity
-   Carrier upgrades

## 6.4 Supplies

Track at minimum:

-   Food
-   Medical supplies
-   Spare parts
-   Aviation fuel
-   General supplies
-   Ammunition

------------------------------------------------------------------------

# 7. Prestige Tiers

Prestige represents the carrier's reputation.

        Prestige Tier
  -------------- ---------------
           0--99 Unknown
        100--249 Respected
        250--499 Established
        500--999 Distinguished
    1,000--1,999 Elite
          2,000+ Legendary

Prestige tiers unlock increasingly valuable opportunities.

Example:

### Unknown

-   Basic missions
-   Standard recruits
-   Basic equipment

### Respected

-   More mission choices
-   Better recruits

### Established

-   Experienced personnel
-   Advanced training

### Distinguished

-   Elite specialists
-   Advanced equipment

### Elite

-   High-value missions
-   Rare recruits
-   Advanced weapons

### Legendary

-   Special missions
-   Exceptional recruitment
-   Unique upgrades

------------------------------------------------------------------------

# 8. Carrier Readiness

Carrier Readiness is a major derived statistic.

Range:

**0--100**

Suggested components:

-   Aircraft readiness
-   Crew availability
-   Engineering readiness
-   Operations readiness
-   Weapons readiness
-   Logistics
-   Medical readiness
-   Maintenance capacity
-   Command effectiveness

Readiness must not be a simple average.

Critical failures should have disproportionate effects.

Example:

``` text
Aircraft readiness: 94
Crew readiness: 91
Logistics: 88
Operations: 85
Engineering: 43

Overall readiness: approximately 65
```

The low Engineering score significantly limits carrier capability.

------------------------------------------------------------------------

# 9. Operational Tempo

The player chooses the carrier's operational tempo.

## Low

Effects:

-   Reduced fatigue
-   Reduced equipment wear
-   Reduced accident probability
-   Slower mission progress

## Normal

Balanced.

## High

Effects:

-   Faster mission progress
-   More aircraft operations
-   Higher fatigue
-   Higher maintenance requirements
-   Increased accident probability

## Maximum

Effects:

-   Maximum mission progress
-   Very high fatigue
-   High equipment wear
-   High accident probability
-   Potential bonus Prestige if successful

Operational tempo is evaluated daily.

------------------------------------------------------------------------

# 10. Carrier Organization

The carrier is divided into departments.

``` text
COMMAND
AIR DEPARTMENT
DECK DEPARTMENT
AIRCRAFT MAINTENANCE
ENGINEERING
REACTOR
OPERATIONS
WEAPONS
NAVIGATION
SUPPLY
MEDICAL
DAMAGE CONTROL
ADMINISTRATION
```

Each department contains divisions and work areas.

------------------------------------------------------------------------

# 11. Physical Carrier Structure

The carrier should be represented as a stack of top-down maps.

Recommended initial playable structure:

1.  Flight Deck
2.  Hangar Deck
3.  Aviation Operations
4.  Aircraft Maintenance / Support
5.  Command / Operations
6.  Crew / Living
7.  Medical / Administration / Supply
8.  Engineering
9.  Reactor / Propulsion
10. Lower machinery / storage

The exact number may be adjusted during implementation.

Each deck is a separate 2D map.

------------------------------------------------------------------------

# 12. Deck Navigation

The player can:

-   Scroll mouse wheel
-   Press Up/Down
-   Click deck on miniature carrier map

The current deck is highlighted.

Example:

``` text
DECK 06
   ^
   |
DECK 05  <- CURRENT
   |
DECK 04
```

Elevators and stairs are physical connections between maps.

Clicking an elevator can optionally show:

-   Current deck
-   Available destinations
-   Elevator status
-   Current queue
-   Aircraft/personnel using it

------------------------------------------------------------------------

# 13. Main Game View

The main screen is the top-down pixel-art view of the current deck.

Required UI:

``` text
+-----------------------------------------------------------+
| USS RESOLUTE        DAY 127     14:32      NORMAL         |
+-----------------------------------------------------------+
|                                                           |
|                                                           |
|              CURRENT DECK PIXEL MAP                       |
|                                                           |
|                                                           |
|                                         +-------------+   |
|                                         | CARRIER MAP |   |
|                                         |             |   |
|                                         | DECK 10     |   |
|                                         | DECK 09     |   |
|                                         | DECK 08     |   |
|                                         | DECK 07     |   |
|                                         | DECK 06 <   |   |
|                                         | DECK 05     |   |
|                                         | ...         |   |
|                                         +-------------+   |
|                                                           |
+-----------------------------------------------------------+
| Aircraft | Crew | Readiness | Prestige | Credits | STAFF |
+-----------------------------------------------------------+
```

------------------------------------------------------------------------

# 14. Miniature Carrier Map

The miniature carrier map is permanently visible.

It must:

-   Show all decks
-   Show current deck
-   Show alerts
-   Show deck status
-   Allow direct navigation

Suggested status colors:

-   Green = normal
-   Yellow = warning
-   Red = emergency
-   Blue = current location
-   White/grey = inactive

The miniature map should represent the carrier's approximate physical
shape rather than simply displaying a vertical list.

------------------------------------------------------------------------

# 15. Rooms

Every important room is an interactive entity.

Room types include:

### Flight operations

-   Flight control
-   Ready rooms
-   Air operations
-   Briefing rooms

### Aircraft

-   Hangar
-   Maintenance shops
-   Aircraft parking
-   Aircraft elevators

### Engineering

-   Engineering control
-   Machinery
-   Electrical
-   Reactor control

### Operations

-   CIC
-   Radar
-   Communications
-   Intelligence
-   Electronic warfare

### Weapons

-   Weapons preparation
-   Ammunition storage
-   Weapons handling areas

### Crew

-   Berthing
-   Mess
-   Recreation
-   Training rooms

### Support

-   Medical
-   Supply
-   Administration

------------------------------------------------------------------------

# 16. Room Interaction

Hovering over a room shows:

``` text
ENGINE SHOP

Personnel: 6 / 7
Workload: 82%
Efficiency: 87%
Active jobs: 4
Equipment condition: 91%
```

Clicking opens a contextual room panel.

No global management screen is required.

The panel may contain:

-   Current activity
-   Personnel
-   Work orders
-   Equipment
-   Capacity
-   Efficiency
-   Alerts
-   Available actions

------------------------------------------------------------------------

# 17. Interactive Objects

Objects may include:

-   Aircraft
-   Vehicles
-   Elevators
-   Machinery
-   Radar consoles
-   Communication equipment
-   Training equipment
-   Weapons
-   Storage
-   Emergency equipment

Each object has:

-   Position
-   State
-   Condition
-   Interactions
-   Associated department

------------------------------------------------------------------------

# 18. Crew Visualization

Crew members exist physically on the map.

They move between:

-   Quarters
-   Work areas
-   Training
-   Mess
-   Medical
-   Command
-   Emergency locations
-   Elevators
-   Corridors

Crew activity should be represented using simple pixel animations.

Examples:

``` text
Crew walking:
🧑 -> -> 🧑

Maintenance:
🧑‍🔧 🔧 ✈

Training:
🧑‍🏫
 / | \
🧑 🧑 🧑

Emergency:
🚨
🧑‍🚒 -> -> 🔥
```

------------------------------------------------------------------------

# 19. Activity Density

Every deck should have an activity level.

Range:

**0--100%**

Activity is based on:

-   Crew movement
-   Maintenance
-   Aircraft operations
-   Training
-   Emergencies
-   Logistics

High activity should be visually apparent.

The UI can display:

``` text
ACTIVITY
████████░░ 82%
```

------------------------------------------------------------------------

# 20. Crew System

Crew members are individually simulated.

Each crew member has:

-   Unique ID
-   Name
-   Rank
-   Position
-   Primary specialty
-   Secondary specialty
-   Core attributes
-   Personality traits
-   Experience
-   Skills
-   Training
-   Morale
-   Fatigue
-   Health/status
-   Career history
-   Current assignment
-   Current location

------------------------------------------------------------------------

# 21. Core Crew Attributes

Use seven core attributes.

## Technical Skill

Ability to perform specialist tasks.

## Discipline

Ability to follow procedures reliably.

## Speed

Task completion speed.

## Stamina

Ability to maintain performance during long operations.

## Leadership

Ability to supervise and manage others.

## Stress Resistance

Ability to maintain performance under pressure.

## Experience

Accumulated practical knowledge.

All attributes range from:

**0--100**

------------------------------------------------------------------------

# 22. Personality Traits

Optional hidden or partially visible traits:

-   Ambition
-   Teamwork
-   Risk tolerance
-   Adaptability
-   Loyalty

Range:

**0--100**

Personality should influence:

-   Promotion preference
-   Training response
-   Morale
-   Team performance
-   Event outcomes
-   Career development

------------------------------------------------------------------------

# 23. Specialty System

Each crew member has:

-   Primary specialty
-   Secondary specialty

Examples:

-   Aircraft Engine Technician
-   Avionics Technician
-   Airframe Technician
-   Weapons Technician
-   Radar Operator
-   Air Controller
-   Reactor Operator
-   Electrical Technician
-   Mechanical Technician
-   Propulsion Technician
-   Damage Control Technician
-   Medic
-   Supply Specialist
-   Communications Specialist
-   Aircraft Director
-   Tractor Operator
-   Flight Operations Specialist

Skills are separate from general attributes.

Example:

``` text
Aircraft Engine: 81
Hydraulics: 62
Avionics: 18
```

------------------------------------------------------------------------

# 24. Rank and Position

Rank and job position are separate.

Example:

``` text
Rank:
Petty Officer First Class

Position:
Senior Avionics Technician
```

Another:

``` text
Rank:
Chief Petty Officer

Position:
Avionics Division Supervisor
```

Promotion does not automatically mean a change of specialty.

------------------------------------------------------------------------

# 25. Crew Progression

Crew gain experience from:

-   Daily work
-   Missions
-   Emergencies
-   Training
-   Mentoring
-   Successful operations

Skill progression should be slower at high levels.

Suggested progression:

``` text
0–30: fast
30–60: moderate
60–80: slow
80–95: very slow
95+: exceptional
```

------------------------------------------------------------------------

# 26. Fatigue

Fatigue is temporary.

Range:

**0--100**

0 = fully rested.

100 = exhausted.

Fatigue increases from:

-   Long shifts
-   High operational tempo
-   Emergencies
-   Missions
-   Night work
-   Consecutive work days

Fatigue decreases through:

-   Rest
-   Leave
-   Low tempo

High fatigue causes:

-   Lower speed
-   Lower technical effectiveness
-   Lower stress resistance
-   Higher mistake probability
-   Lower morale

------------------------------------------------------------------------

# 27. Morale

Range:

**0--100**

Affected by:

### Positive

-   Promotion
-   Recognition
-   Successful missions
-   Good leadership
-   Training
-   Rest
-   Adequate supplies

### Negative

-   Excessive fatigue
-   Casualties
-   Mission failures
-   Poor leadership
-   Denied leave
-   Long deployment
-   Repeated emergencies

Morale affects:

-   Productivity
-   Retention
-   Training effectiveness
-   Event outcomes
-   Team cooperation

------------------------------------------------------------------------

# 28. Health

Crew can have states:

-   Healthy
-   Fatigued
-   Sick
-   Injured
-   Hospitalized
-   Unavailable

Health can affect availability and performance.

Medical facilities restore crew availability.

------------------------------------------------------------------------

# 29. Training System

Training is performed physically at training facilities.

Training categories:

## Basic

-   Safety
-   Firefighting
-   Damage control
-   First aid
-   Ship procedures

## Specialty

-   Engine maintenance
-   Avionics
-   Radar
-   Weapons
-   Reactor systems
-   Aircraft handling

## Advanced

-   Advanced avionics
-   Senior maintenance
-   Advanced damage control
-   Flight deck supervision
-   Combat systems

## Leadership

-   Team management
-   Crisis management
-   Planning
-   Decision making
-   Mentoring

------------------------------------------------------------------------

# 30. Training Costs

Every training course has:

-   Duration
-   Credit cost
-   Instructor requirement
-   Facility requirement
-   Crew availability impact
-   Expected skill gain

Example:

``` text
Advanced Avionics

Duration: 14 days
Cost: 18,000 Credits
Instructor: Required
Skill gain: +3 to +8
```

Training personnel are unavailable for normal duties unless the course
explicitly supports part-time training.

------------------------------------------------------------------------

# 31. Mentoring

Experienced personnel can mentor junior crew.

Mentoring:

-   Improves junior experience/skills
-   Uses senior crew time
-   Requires sufficient Leadership and Experience
-   Can increase senior fatigue slightly

Example:

``` text
Senior technician
Experience 94
Leadership 86

        |
        v

Junior technician
Experience 12
Technical 51
```

Mentoring should create long-term personnel development.

------------------------------------------------------------------------

# 32. Promotion

Promotion is not based solely on XP.

Requirements can include:

-   Experience
-   Specialty skill
-   Discipline
-   Leadership
-   Required training
-   Career performance
-   No major disciplinary problems

Example:

### Junior Specialist → Experienced Specialist

-   Experience \>= 30
-   Specialty \>= 45
-   Discipline \>= 50

### Experienced Specialist → Supervisor

-   Experience \>= 50
-   Specialty \>= 60
-   Leadership \>= 40
-   Leadership training completed

### Supervisor → Chief

-   Experience \>= 70
-   Specialty \>= 70
-   Leadership \>= 60
-   Mentoring qualification

------------------------------------------------------------------------

# 33. Promotion Trade-off

A highly skilled specialist with poor leadership should not
automatically be promoted.

Example:

``` text
Technical: 94
Leadership: 32
```

Keeping the person as a specialist may be better.

Promoting them may:

-   Improve department coordination slightly
-   Remove them from technical production
-   Reduce team management quality

This is an intentional gameplay mechanic.

------------------------------------------------------------------------

# 34. Career History

Important personnel have a career timeline.

Example:

``` text
2026  Joined service
2027  Technical school
2028  Assigned to carrier
2029  Promoted
2030  Advanced training
2031  Mission deployment
2032  Instructor qualification
2033  Promoted
```

Career history affects reputation and future events.

------------------------------------------------------------------------

# 35. Staff Roster

There is no dedicated HR screen.

A global staff roster is available through the bottom UI.

The roster supports:

-   Search
-   Specialty filter
-   Rank filter
-   Status filter
-   Department filter
-   Skill sorting
-   Fatigue sorting
-   Morale sorting

Example:

``` text
STAFF — 4,821

Search: ___________

Filters:
[ALL] [SPECIALTY] [RANK] [STATUS] [DEPARTMENT]

NAME          RANK   SPECIALTY     STATUS
J. Miller     E-6    Avionics      WORKING
S. Davis      E-5    Engine        TRAINING
R. Wilson     E-4    Weapons       WORKING
A. Johnson    E-3    Radar         RESTING
M. Carter     E-5    Aircraft      INJURED
```

Selecting a person closes the roster and moves the camera to that
person's physical location.

------------------------------------------------------------------------

# 36. Contextual Personnel Panel

When clicking a crew member:

``` text
JOHN MILLER

E-5
Avionics
Deck 06 — Avionics Shop

Technical       84
Discipline      91
Speed           72
Stamina         78
Leadership      63
Stress Resist.  81
Experience      71

Morale          86%
Fatigue         24%

Current task:
F-35 avionics inspection

[TRAIN]
[ASSIGN]
[PROMOTE]
```

Actions remain contextual.

------------------------------------------------------------------------

# 37. Aircraft System

Each aircraft is an individual entity.

Attributes:

-   Aircraft ID
-   Type
-   Squadron
-   Condition
-   Fuel
-   Weapons load
-   Maintenance status
-   Crew assignment
-   Mission assignment
-   Location
-   Flight hours
-   Damage

Aircraft states:

-   Stored
-   Maintenance
-   Ready
-   Taxiing
-   Launching
-   Airborne
-   Recovering
-   Damaged
-   Unavailable

------------------------------------------------------------------------

# 38. Air Wing

The air wing is represented using fictional squadrons inspired by
carrier aviation.

Possible aircraft categories:

-   Fighter / strike
-   Electronic warfare
-   Early warning
-   Maritime helicopter
-   Utility helicopter
-   Logistics / transport

Aircraft types should be data-driven so they can be expanded.

------------------------------------------------------------------------

# 39. Aircraft Readiness

Each aircraft has a readiness value.

Readiness is affected by:

-   Maintenance
-   Damage
-   Fuel
-   Weapons
-   Crew availability
-   Spare parts

Aircraft can require several specialties simultaneously.

Example:

``` text
Aircraft #302

Engine       100%
Avionics      72%
Airframe      91%
Fuel          40%
Weapons       100%

STATUS: NOT READY
```

------------------------------------------------------------------------

# 40. Aircraft Maintenance

Maintenance work orders require:

-   Specific specialty
-   Personnel
-   Equipment
-   Spare parts
-   Time

Example:

``` text
F-35 #302
Avionics fault

Required:
1 Avionics technician
2 hours
1 spare component
```

Higher skill reduces required time and failure probability.

------------------------------------------------------------------------

# 41. Mission System

The player must choose missions.

Missions may last multiple days.

Each mission has:

-   Type
-   Description
-   Duration
-   Objectives
-   Difficulty
-   Risk
-   Requirements
-   Recommended capabilities
-   Potential Prestige
-   Credit reward
-   Potential casualties/damage
-   Mission-specific events

------------------------------------------------------------------------

# 42. Mission Styles

Initial mission categories:

## Humanitarian

-   Disaster relief
-   Evacuation
-   Medical assistance
-   Logistics support

## Maritime Security

-   Patrol
-   Convoy protection
-   Surveillance
-   Anti-piracy

## Air Operations

-   Combat air patrol
-   Air defense
-   Strike
-   Training exercise

## Fleet Support

-   Escort
-   Fleet protection
-   Replenishment
-   Reconnaissance

## Intelligence

-   Surveillance
-   Reconnaissance
-   Electronic intelligence

## Combat

-   Defensive operation
-   Offensive operation
-   High-risk strike
-   Emergency response

## Crisis

Dynamic emergency missions.

------------------------------------------------------------------------

# 43. Mission Requirements

Each mission specifies minimum requirements.

Example:

``` text
LONG-RANGE PATROL

Requirements:

Aircraft Ready >= 30
Fuel >= 60%
Crew Readiness >= 70%
Engineering >= 75%
Operations >= 70%

Recommended:

Early warning aircraft
Electronic warfare capability
Experienced pilots
```

The player can accept missions even when requirements are not met if
game rules permit, but risk should increase significantly.

------------------------------------------------------------------------

# 44. Mission Difficulty

Use:

**1--5 stars**

1 = routine

2 = low risk

3 = challenging

4 = high risk

5 = extreme

Difficulty affects:

-   Event severity
-   Failure probability
-   Resource consumption
-   Potential casualties
-   Prestige reward

------------------------------------------------------------------------

# 45. Mission Progress

Mission progress is:

**0--100%**

Each day contributes progress based on:

-   Aircraft readiness
-   Crew readiness
-   Carrier readiness
-   Mission requirements
-   Operational tempo
-   Player decisions
-   Random events

Mission progress should not be purely deterministic.

------------------------------------------------------------------------

# 46. Mission Outcome

At completion:

### Outstanding Success

-   Large Prestige bonus
-   Large Credits reward
-   Morale increase
-   XP increase
-   Possible special unlock

### Success

-   Prestige gain
-   Credits
-   XP

### Partial Success

-   Small Prestige gain
-   Reduced Credits
-   Some negative consequences

### Failure

-   Prestige loss
-   Potential equipment damage
-   Crew casualties
-   Morale reduction

### Catastrophic Failure

-   Major Prestige loss
-   Major damage
-   Significant casualties
-   Potential campaign consequences

------------------------------------------------------------------------

# 47. Daily Event System

Every day generate:

**1--3 events**

Events are the game's story engine.

Categories:

-   Personnel
-   Training
-   Mechanical
-   Aircraft
-   Medical
-   Morale
-   Operational
-   Mission
-   Weather
-   Logistics
-   Command
-   Emergency
-   Narrative

------------------------------------------------------------------------

# 48. Event Structure

Each event contains:

``` text
Event ID
Title
Description
Category
Priority
Conditions
Choices[]
Consequences
Follow-up events
```

Each choice may affect:

-   Crew
-   Morale
-   Fatigue
-   Credits
-   Prestige
-   Aircraft
-   Carrier readiness
-   Mission progress
-   Supplies
-   Future events

------------------------------------------------------------------------

# 49. Events Should Have Chains

Events should be able to create future events.

Example:

``` text
Day 17
Aircraft accident
    |
    +--> 2 crew injured
    |
    +--> Maintenance capacity -15%
    |
    +--> Morale -4
    |
    v
Day 20
Investigation Report
    |
    +--> Player decision
    |
    v
Day 25
Possible follow-up
```

This creates emergent campaign stories.

------------------------------------------------------------------------

# 50. Events Should Not Have Obvious Answers

Example:

``` text
Senior technician requests 5 days leave.

APPROVE
- Fatigue -20
- Technician unavailable 5 days
- Morale +8

DENY
- Technician remains available
- Fatigue +15
- Morale -5

COMPROMISE
- 3 days leave
- Smaller morale benefit
```

The correct decision depends on the player's circumstances.

------------------------------------------------------------------------

# 51. Daily Event UI

Events should appear as cards or overlays over the carrier view.

``` text
EVENT

SEVERE WEATHER APPROACHING

A storm is expected to reach the operating area.

[CONTINUE OPERATIONS]
[REDUCE FLIGHT OPERATIONS]
[CANCEL TODAY'S OPERATIONS]
```

The carrier remains visible behind the event.

------------------------------------------------------------------------

# 52. Department Mechanics

Each department has:

-   Personnel count
-   Required personnel
-   Workload
-   Efficiency
-   Readiness
-   Morale
-   Fatigue
-   Equipment condition

Department efficiency depends on:

``` text
Personnel availability
x
Average relevant skill
x
Leadership
x
Morale
x
Fatigue modifier
x
Equipment condition
```

Use soft caps to avoid extreme values.

------------------------------------------------------------------------

# 53. Damage Control

Damage Control is a major emergency system.

Teams respond to:

-   Fires
-   Flooding
-   Electrical failures
-   Structural damage
-   Aircraft accidents
-   Machinery failures

Emergency response requires physical crew movement.

Example:

``` text
FIRE — DECK 06

🔥🔥🔥

Damage Control Team
     |
     v
🧑‍🚒 -> -> -> FIRE

Medical Team
     |
     v
🧑‍⚕️ -> -> -> AREA
```

Response time should depend on:

-   Distance
-   Crew availability
-   Fatigue
-   Training
-   Leadership
-   Equipment condition

------------------------------------------------------------------------

# 54. Logistics

Supply is a continuous system.

Track:

-   Food
-   Medical
-   Spare parts
-   Aviation fuel
-   General supplies
-   Ammunition

Consumption depends on:

-   Crew population
-   Operational tempo
-   Aircraft activity
-   Mission
-   Damage

Low supplies create events and penalties.

------------------------------------------------------------------------

# 55. Engineering

Engineering includes:

-   Propulsion
-   Electrical generation
-   Machinery
-   Cooling
-   Pumps
-   Auxiliary systems

Engineering readiness affects the whole ship.

Engineering failures may:

-   Reduce carrier speed
-   Reduce aircraft operations
-   Reduce radar capability
-   Disable elevators
-   Reduce available power

------------------------------------------------------------------------

# 56. Reactor

The carrier is nuclear-powered.

For gameplay, model reactor operations abstractly.

Do not attempt detailed real-world reactor simulation.

Variables:

-   Reactor readiness
-   Operator availability
-   Maintenance
-   Safety
-   Power availability

Reactor problems are rare but high-impact events.

------------------------------------------------------------------------

# 57. Operations / CIC

Operations manages:

-   Radar
-   Air control
-   Intelligence
-   Communications
-   Electronic warfare
-   Weather

Operations effectiveness affects:

-   Threat detection
-   Mission success
-   Aircraft coordination
-   Event outcomes

------------------------------------------------------------------------

# 58. Weapons

Weapons management includes:

-   Ship defensive weapons
-   Aircraft weapons
-   Ammunition inventory
-   Weapons handling
-   Maintenance

Weapons readiness affects mission capability.

------------------------------------------------------------------------

# 59. Medical

Medical facilities manage:

-   Sick crew
-   Injured crew
-   Emergencies
-   Recovery
-   Medical supplies

Medical capacity affects casualty consequences.

------------------------------------------------------------------------

# 60. Navigation / Bridge

Bridge functions:

-   Navigation
-   Heading
-   Speed
-   Communications
-   Formation

For initial gameplay, navigation can remain relatively abstract.

------------------------------------------------------------------------

# 61. Carrier Upgrades

Prestige and Credits can be spent on upgrades.

Examples:

### Training Center

Improves training speed.

### Advanced Workshops

Improves maintenance efficiency.

### Medical Expansion

Increases medical capacity.

### Crew Quarters

Increases crew capacity and morale.

### Recreation Facilities

Improves morale recovery.

### Logistics Expansion

Increases storage.

### Operations Upgrade

Improves detection and mission effectiveness.

### Engineering Upgrade

Improves machinery reliability.

### Damage Control Upgrade

Improves emergency response.

------------------------------------------------------------------------

# 62. Upgrade Levels

Each facility can have:

**Level 1--5**

Example:

``` text
AVIONICS WORKSHOP

Level 1
Efficiency: 100%

Level 2
Maintenance speed +10%

Level 3
Maintenance speed +20%

Level 4
Maintenance speed +30%

Level 5
Maintenance speed +45%
```

Upgrades require:

-   Prestige
-   Credits
-   Time

------------------------------------------------------------------------

# 63. Recruitment

Recruitment is primarily driven by Prestige.

Recruitment generates candidate offers.

Candidates have:

-   Rank
-   Specialty
-   Attributes
-   Experience
-   Personality
-   Recruitment cost

Example:

``` text
RECRUITMENT OFFER

Sarah Wilson
E-5
Avionics

Technical       91
Discipline      84
Leadership      68
Stamina         79
Experience      72

Cost:
91 Prestige
```

Rare candidates should appear less frequently.

------------------------------------------------------------------------

# 64. Prestige as Opportunity

Prestige should unlock access to better:

-   Missions
-   Candidates
-   Equipment
-   Upgrades
-   Special opportunities

Prestige is therefore both:

1.  A progression score
2.  A strategic currency

Avoid allowing the player to spend all Prestige without consequence.

------------------------------------------------------------------------

# 65. Event and Mission Interaction

Events should dynamically consider current mission state.

Example:

``` text
Mission:
Humanitarian Evacuation

Mission progress:
62%

Event:
Storm approaching

Choice:
Continue

Result:
Mission progress +8
Aircraft damage risk increased
Crew fatigue +5
```

Mission events should be context-aware.

------------------------------------------------------------------------

# 66. Difficulty Scaling

Difficulty should increase through:

-   More demanding missions
-   Stronger event consequences
-   More complex personnel problems
-   Higher operational tempo requirements
-   Increased equipment wear
-   More difficult resource constraints

Do not simply multiply enemy strength.

The game should become harder because the **carrier's operational
problems become more complex**.

------------------------------------------------------------------------

# 67. Long-Term Campaign

Recommended campaign duration:

**1--5 in-game years**

The player should experience:

-   Crew careers
-   Promotions
-   Retirements/transfers
-   New recruits
-   Mission history
-   Carrier improvements
-   Prestige growth
-   Increasing mission difficulty
-   Major narrative events

------------------------------------------------------------------------

# 68. Victory Conditions

Possible victory goals:

### Career Victory

Reach Legendary Prestige.

### Operational Victory

Complete a certain number of high-risk missions.

### Reputation Victory

Achieve a target Prestige while maintaining low casualties.

### Perfect Command

Complete campaign with:

-   High Prestige
-   High readiness
-   High morale
-   Low casualties
-   Strong crew development

Multiple victory conditions can coexist.

------------------------------------------------------------------------

# 69. Failure Conditions

The campaign can fail if:

-   Prestige falls below a critical threshold
-   Carrier becomes critically damaged
-   Operational readiness remains critically low
-   Financial resources become unsustainable
-   Mission failures accumulate
-   Major command crisis occurs

Avoid instant game-over from a single bad decision unless explicitly
designed as a rare catastrophic event.

------------------------------------------------------------------------

# 70. Save System

Save game state must include:

## Campaign

-   Current day
-   Prestige
-   Credits
-   Difficulty
-   Mission
-   Mission progress
-   Campaign history

## Carrier

-   Deck states
-   Room states
-   Facility upgrades
-   Equipment condition
-   Supplies
-   Readiness

## Aircraft

-   Aircraft list
-   Location
-   Condition
-   Maintenance
-   Crew assignments

## Crew

-   Personnel list
-   Attributes
-   Skills
-   Training
-   Rank
-   Position
-   Morale
-   Fatigue
-   Health
-   Career history
-   Current location

## Events

-   Active events
-   Event history
-   Pending follow-up events

------------------------------------------------------------------------

# 71. Data-Driven Architecture

Most game content should be stored as data rather than hard-coded.

Recommended resources/data:

``` text
data/
  carriers/
  decks/
  rooms/
  crew/
  specialties/
  ranks/
  training/
  aircraft/
  missions/
  events/
  upgrades/
  equipment/
```

This will allow rapid content expansion.

------------------------------------------------------------------------

# 72. Suggested Godot Architecture

Target:

**Godot 4.x**

Suggested high-level structure:

``` text
Game
├── GameState
├── TimeManager
├── CarrierManager
├── CrewManager
├── AircraftManager
├── MissionManager
├── EventManager
├── EconomyManager
├── TrainingManager
├── SimulationManager
└── SaveManager
```

Autoloads should be kept limited to genuinely global systems.

------------------------------------------------------------------------

# 73. Main Scenes

Suggested scenes:

``` text
Main
├── CarrierView
│   ├── DeckMap
│   ├── CrewLayer
│   ├── AircraftLayer
│   ├── EffectsLayer
│   └── InteractionLayer
│
├── CarrierMiniMap
├── TopHUD
├── BottomBar
├── ContextPanel
├── EventPanel
├── StaffRoster
└── DailySummary
```

------------------------------------------------------------------------

# 74. Deck Scene

Each deck should be a reusable scene/resource.

Suggested:

``` text
Deck
├── TileMap
├── RoomNodes
├── ObjectNodes
├── CrewSpawnPoints
├── ElevatorNodes
├── StairNodes
├── Navigation
└── ActivityManager
```

------------------------------------------------------------------------

# 75. Crew Entity

Each crew member should have:

``` text
CrewMember
- id
- name
- rank
- department
- position
- primary_specialty
- secondary_specialty
- attributes
- personality
- skills
- experience
- morale
- fatigue
- health
- location
- current_task
- training
- career_history
```

------------------------------------------------------------------------

# 76. Room Entity

Each room should have:

``` text
Room
- id
- deck_id
- type
- position
- size
- department
- capacity
- equipment
- personnel_ids
- workload
- condition
- activity_level
```

------------------------------------------------------------------------

# 77. Mission Entity

``` text
Mission
- id
- type
- title
- description
- duration
- difficulty
- objectives
- requirements
- recommendations
- rewards
- risks
- progress
- state
- event_pool
```

------------------------------------------------------------------------

# 78. Event Entity

``` text
Event
- id
- title
- description
- category
- conditions
- weight
- choices
- consequences
- follow_up_events
```

Events should support conditional consequences.

Example:

``` text
IF fatigue > 80
    increase accident probability

IF morale < 40
    increase crew conflict events

IF mission_progress > 70
    unlock mission-specific event
```

------------------------------------------------------------------------

# 79. Simulation Rules

Simulation should run once per day.

Avoid real-time simulation for core gameplay.

Real-time movement is purely visual.

The authoritative game state changes during the daily resolution.

This keeps the game deterministic and easier to debug.

------------------------------------------------------------------------

# 80. Randomness

Use seeded randomness for campaign reproducibility.

Campaign has a random seed.

Daily events use deterministic random generation based on:

``` text
campaign_seed
current_day
event_sequence
```

This allows debugging and replay/testing.

------------------------------------------------------------------------

# 81. Event Selection Algorithm

Each day:

1.  Build eligible event pool.
2.  Evaluate conditions.
3.  Calculate event weights.
4.  Select 1--3 events.
5.  Avoid excessive repetition.
6.  Prioritize active story chains.
7.  Present events to player.
8.  Apply consequences after selection.

Events should have cooldowns.

------------------------------------------------------------------------

# 82. Important Simulation Principle

Never let randomness completely override preparation.

Player preparation should strongly influence probability.

Example:

Bad preparation:

``` text
Mission success probability: 55%
```

Good preparation:

``` text
Mission success probability: 90%
```

But even a 90% mission can encounter complications.

This preserves uncertainty without making strategy meaningless.

------------------------------------------------------------------------

# 83. Pixel-Art Visual Requirements

Target visual style:

-   Simple but detailed pixel art
-   Top-down
-   Readable rooms
-   Clearly identifiable objects
-   Small animated crew
-   Limited animation complexity
-   Strong silhouettes
-   Consistent scale

The game should prioritize **readability over visual realism**.

------------------------------------------------------------------------

# 84. Visual Information Hierarchy

The player should be able to distinguish at a glance:

### Ship structure

Walls, rooms, corridors, elevators.

### Important objects

Aircraft, machinery, consoles, storage.

### Personnel

Crew sprites with specialty-coded visual elements where useful.

### Activity

Movement, animation, flashing indicators.

### Problems

Smoke, fire, alarms, warning icons.

------------------------------------------------------------------------

# 85. Interaction Philosophy

Avoid excessive modal menus.

Preferred interaction:

``` text
LOOK
 ↓
HOVER
 ↓
CONTEXTUAL INFO
 ↓
CLICK
 ↓
CONTEXTUAL ACTIONS
```

Example:

``` text
Player sees aircraft
       ↓
Hover
       ↓
Aircraft status
       ↓
Click
       ↓
Aircraft panel
       ↓
Repair / Inspect / Assign / Move
```

------------------------------------------------------------------------

# 86. No Dedicated HR Screen

Explicit rule:

**Do not create a traditional HR management screen.**

The staff roster is permitted because it is a practical index of
personnel.

Personnel management itself remains contextual and physical.

------------------------------------------------------------------------

# 87. Staff Roster Navigation

Example:

``` text
STAFF
  ↓
Search "Miller"
  ↓
John Miller
  ↓
Click
  ↓
Camera jumps to Deck 06
  ↓
John is highlighted
  ↓
Personnel panel opens
```

------------------------------------------------------------------------

# 88. Daily Summary

At the end of each turn:

``` text
DAY 127 COMPLETE

MISSION
Progress             +8%

AIRCRAFT
Launched              12
Recovered             12
Maintenance completed  7

CREW
Trained                3
Promotions             1
Morale                +2
Fatigue               +4

CARRIER
Readiness             86% -> 84%

RESOURCES
Credits               +12,000
Prestige               +12

[BEGIN DAY 128]
```

------------------------------------------------------------------------

# 89. First Playable Prototype

The first prototype should NOT implement the entire carrier.

Build a vertical slice.

## Prototype content

### Carrier

3 decks:

1.  Flight Deck
2.  Hangar
3.  Operations

### Crew

20--30 individual crew.

### Aircraft

5 aircraft.

### Departments

-   Air Operations
-   Maintenance
-   Deck
-   Operations

### Events

10--15 events.

### Mission

3 mission types.

### Training

3 courses.

### Promotion

2 promotion levels.

### Resources

-   Prestige
-   Credits
-   Readiness

### UI

-   Top-down deck view
-   Deck navigation
-   Mini-map
-   Clickable rooms
-   Clickable crew
-   Staff roster
-   Event panel
-   Daily summary

------------------------------------------------------------------------

# 90. Prototype Success Criteria

The prototype is successful when the player can:

1.  Navigate between decks.
2.  See crew physically moving.
3.  Click a room.
4.  Inspect room status.
5.  Click a crew member.
6.  Inspect crew stats.
7.  Assign a crew member.
8.  Start training.
9.  Promote an eligible crew member.
10. Select a mission.
11. Receive daily events.
12. Make event decisions.
13. End the day.
14. See consequences.
15. Earn/spend Prestige.
16. Complete a mission.
17. Improve the carrier.

------------------------------------------------------------------------

# 91. Recommended Development Order

## Milestone 1 --- Carrier visualization

-   Deck maps
-   Camera
-   Deck navigation
-   Mini-map
-   Rooms
-   Interactive objects

## Milestone 2 --- Crew

-   Crew data
-   Crew sprites
-   Movement
-   Assignments
-   Personnel panel

## Milestone 3 --- Daily simulation

-   Day counter
-   End-day processing
-   Fatigue
-   Morale
-   Readiness

## Milestone 4 --- Events

-   Event system
-   Choices
-   Consequences
-   Follow-up events

## Milestone 5 --- Missions

-   Mission selection
-   Requirements
-   Progress
-   Outcome
-   Rewards

## Milestone 6 --- HR

-   Training
-   Skills
-   Promotions
-   Mentoring
-   Career history
-   Staff roster

## Milestone 7 --- Economy

-   Credits
-   Prestige
-   Recruitment
-   Upgrades

## Milestone 8 --- Content

-   More decks
-   More aircraft
-   More departments
-   More missions
-   More events
-   More upgrades

------------------------------------------------------------------------

# 92. Core Design Rule for the Coding Agent

When implementing any new system, preserve this principle:

> **If the system represents something that physically exists on the
> carrier, it should have a physical representation in the carrier view
> whenever practical.**

Examples:

-   Training → crew goes to training room
-   Maintenance → crew works beside aircraft
-   Emergency → crew moves to emergency
-   Medical treatment → injured crew moves to medical
-   Aircraft movement → aircraft changes physical location
-   Staff assignment → crew member physically changes work area

Menus should expose information and accelerate management, but should
not replace the physical carrier simulation.

------------------------------------------------------------------------

# 93. Final Product Vision

The finished game should feel like:

> **A living pixel-art aircraft carrier that the player commands one day
> at a time.**

The player watches the ship operate, discovers problems through events
and visual activity, makes difficult decisions, develops individual crew
members, prepares missions, takes risks, earns Prestige and gradually
transforms the carrier into an elite command.

The game should create memorable stories such as:

> "Chief Miller was our best avionics technician. I promoted him too
> early, and the division suffered."

or:

> "We pushed maximum operational tempo for three days to complete the
> evacuation. We succeeded, gained enormous Prestige, but returned with
> exhausted crews and six aircraft requiring maintenance."

or:

> "A junior technician discovered a critical fault during a routine
> inspection. Because we had invested in his training, a major accident
> was avoided."

Those emergent stories are a primary design goal.
