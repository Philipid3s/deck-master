import type { Aircraft, CrewMember, RoomDef } from '../core/types';
import { portraitElement } from '../render/portrait';
import type { HitTarget } from '../render/deckView';
import type { GameApi } from './api';
import { getRoom } from '../data/decks';
import { DEPARTMENTS, SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { trainingCourse } from '../data/training';
import { aircraftType } from '../data/aircraft';
import {
  ATTR_IDS,
  ATTR_LABELS,
  TRAIT_IDS,
  TRAIT_LABELS,
  checkPromotion,
  crewInRoom,
  effectiveness,
  positionParts,
  primarySkill,
  skillOf,
  statusLabel,
} from '../core/crew';
import {
  aircraftReadiness,
  aircraftStatusText,
  limitingSystem,
  workOrderNote,
} from '../core/aircraft';
import {
  aircrewOf,
  assignedAircraft,
  crewFactor,
  isAircrew,
  isFitToFly,
  seatCount,
  seatOccupant,
  seatSpecialty,
} from '../core/aircrew';

import { postDef, postsForRoom } from '../data/posts';
import { crewInPost, postManning, postStrength } from '../core/posts';
import { artElement } from '../render/aircraftArt';
import { canMentor, mentoringCandidates } from '../core/training';
import { statusColor } from '../core/readiness';
import {
  append,
  attrRow,
  bar,
  button,
  clear,
  div,
  note,
  noteRaw,
  pill,
  sectionTitle,
  span,
  statRow,
} from './dom';
import { formatNumber, t, tf, tnote } from '../i18n';

/**
 * The contextual panel (spec sections 16, 36 and 86). There is deliberately
 * no global management screen: every action reaches the player through the
 * thing it acts on — a room, a person, an aircraft.
 */
export class ContextPanel {
  readonly root: HTMLDivElement;
  private head: HTMLDivElement;
  private body: HTMLDivElement;
  private target: HitTarget = null;

  constructor(private api: GameApi) {
    this.root = div('context');
    this.head = div('context-head');
    this.body = div('context-body');
    append(this.root, this.head, this.body);
  }

  get isOpen(): boolean {
    return this.root.classList.contains('open');
  }

  get current(): HitTarget {
    return this.target;
  }

  close(): void {
    this.root.classList.remove('open');
    this.target = null;
  }

  show(target: HitTarget): void {
    this.target = target;
    if (!target) {
      this.close();
      return;
    }
    this.root.classList.add('open');
    this.render();
  }

  /** Re-render in place — used after any action changes the state. */
  render(): void {
    if (!this.target) return;
    clear(this.head);
    clear(this.body);

    switch (this.target.kind) {
      case 'room':
        this.renderRoom(getRoom(this.target.id));
        break;
      case 'crew': {
        const crew = this.api.state().crew.find((c) => c.id === (this.target as { id: string }).id);
        if (crew) this.renderCrew(crew);
        else this.close();
        break;
      }
      case 'aircraft': {
        const a = this.api
          .state()
          .aircraft.find((x) => x.id === (this.target as { id: string }).id);
        if (a) this.renderAircraft(a);
        else this.close();
        break;
      }
    }
  }

  private buildHead(t1: string, t2: string, t3: string, photo?: HTMLElement): void {
    if (photo) append(this.head, photo);
    const titles = div('titles');
    append(titles, div('t1', t1), div('t2', t2), div('t3', t3));
    const close = document.createElement('button');
    close.className = 'close-x';
    close.textContent = '×';
    close.title = 'Close (Esc)';
    close.addEventListener('click', () => this.api.closeContext());
    append(this.head, titles, close);
  }

  // -----------------------------------------------------------------------
  // Room
  // -----------------------------------------------------------------------

  private renderRoom(room: RoomDef): void {
    const state = this.api.state();
    const rs = state.rooms[room.id]!;
    const occupants = crewInRoom(state, room.id);
    const orders = state.workOrders.filter((w) => w.roomId === room.id);
    const dept = DEPARTMENTS[room.department];

    this.buildHead(
      t(room.name),
      `${tf('DECK {n}', { n: String(room.deck).padStart(2, '0') })} — ${t(dept.name)}`,
      room.specialties.length > 0
        ? room.specialties.map((s) => t(SPECIALTIES[s].short)).join(' · ')
        : t(room.kind.toUpperCase(), 'roomkind'),
    );

    append(this.body, sectionTitle('STATUS'));
    append(
      this.body,
      statRow('Personnel', `${occupants.length} / ${room.capacity}`),
      statRow('Workload', `${Math.round(rs.workload)}%`, rs.workload > 100 ? 'bad' : ''),
      statRow('Efficiency', `${Math.round(rs.efficiency)}%`),
      statRow('Activity', `${Math.round(rs.activity)}%`),
      statRow(
        'Equipment condition',
        `${Math.round(rs.condition)}%`,
        rs.condition < 45 ? 'bad' : rs.condition < 70 ? 'warn' : 'good',
      ),
    );
    if (rs.level > 1) {
      append(this.body, statRow('Facility level', `${rs.level} / 5`, 'gold'));
    }

    const activityBar = div('attr-row');
    append(
      activityBar,
      span('attr-label', t('ACTIVITY')),
      bar(rs.activity, statusColor(rs.activity)),
      span('attr-value', `${Math.round(rs.activity)}`),
    );
    append(this.body, activityBar);

    // Work orders queued in this shop.
    if (orders.length > 0) {
      append(this.body, sectionTitle(`${t('WORK ORDERS')} — ${orders.length}`));
      const list = div('list');
      for (const o of orders) {
        const a = state.aircraft.find((x) => x.id === o.aircraftId);
        const row = div('row clickable');
        const pct = Math.round((o.labourDone / o.labourRequired) * 100);
        append(
          row,
          span('name', `${tnote(workOrderNote(o))} — ${a?.tail ?? '?'}`),
          span('meta', o.partsDrawn ? `${pct}%` : `${pct}% · ${t('NO PARTS')}`),
        );
        row.addEventListener('click', () => {
          if (a) this.api.openContext({ kind: 'aircraft', id: a.id });
        });
        append(list, row);
      }
      append(this.body, list);
    }

    // Who is in here.
    append(this.body, sectionTitle(`${t('PERSONNEL')} — ${occupants.length}`));
    if (occupants.length === 0) {
      append(this.body, note('No one is assigned to this space.'));
    } else {
      const list = div('list');
      for (const c of occupants.slice(0, 24)) {
        const row = div('row clickable');
        const name = span('name', c.name);
        if (c.promotable) name.appendChild(span('badge gold', t('PROMOTE')));
        append(
          row,
          name,
          span('meta', `${rank(c.rank).code} · ${t(statusLabel(c), 'status')}`),
        );
        row.addEventListener('click', () => this.api.focusCrew(c.id));
        append(list, row);
      }
      append(this.body, list);
      if (occupants.length > 24) {
        append(
          this.body,
          noteRaw(tf('+{n} more — open the roster to see all.', { n: occupants.length - 24 })),
        );
      }
    }

    // Manning is done by post, not by compartment: people are appointed to a
    // function and the ship decides which of its spaces they work in. So the
    // room panel points at the posts whose job reaches here.
    const posts = postsForRoom(room.id);
    if (posts.length > 0) {
      append(this.body, sectionTitle('MANNED BY'));
      const list = div('list');
      for (const post of posts) {
        const row = div('row clickable');
        const strength = postStrength(state, post.id);
        const name = span('name', t(post.name));
        const manning = postManning(state, post.id);
        if (manning !== null && manning < 1) name.appendChild(span('badge', t('SHORT-HANDED')));
        const here = crewInPost(state, post.id).filter(
          (c) => c.assignmentRoomId === room.id,
        ).length;
        append(
          row,
          name,
          span(
            'meta',
            post.billets === null
              ? tf('{here} here of {total}', { here, total: strength })
              : tf('{here} here of {total} / {billets}', {
                  here,
                  total: strength,
                  billets: post.billets,
                }),
          ),
        );
        row.addEventListener('click', () => this.api.openCrewPicker(post.id));
        append(list, row);
      }
      append(this.body, list);
      append(
        this.body,
        note(
          'Personnel are appointed to a post, which covers every space its job reaches. Click a post to man it; the ship moves its people to whichever of its spaces has work waiting.',
        ),
      );
    }

    const actions = div('btn-row');
    append(
      actions,
      posts.length > 0
        ? button('ASSIGN PERSONNEL', 'primary', () => this.api.openCrewPicker(posts[0]!.id))
        : null,
      button('VIEW ROSTER', '', () => this.api.openRoster({ roomId: room.id })),
      button('CENTRE VIEW', '', () => this.api.focusRoom(room.id)),
    );
    append(this.body, actions);
  }

  // -----------------------------------------------------------------------
  // Crew
  // -----------------------------------------------------------------------

  private renderCrew(crew: CrewMember): void {
    const state = this.api.state();
    const room = getRoom(crew.assignmentRoomId);
    const spec = SPECIALTIES[crew.primary];
    const r = rank(crew.rank);

    const pos = positionParts(crew);
    const post = postDef(crew.postId);
    this.buildHead(
      crew.name,
      `${r.code} — ${tf(pos.key, { spec: t(pos.spec) })}`,
      `${t(post.name)} — ${tf('DECK {n}', { n: String(room.deck).padStart(2, '0') })} ${t(room.short)}`,
      portraitElement(crew, 2, 'portrait portrait-file'),
    );

    // Condition first: it is what the player acts on.
    append(this.body, sectionTitle('CONDITION'));
    const moraleRow = div('attr-row');
    append(
      moraleRow,
      span('attr-label', 'Morale'),
      bar(crew.morale, statusColor(crew.morale)),
      span('attr-value', `${Math.round(crew.morale)}`),
    );
    const fatigueRow = div('attr-row');
    append(
      fatigueRow,
      span('attr-label', 'Fatigue'),
      bar(crew.fatigue, statusColor(100 - crew.fatigue)),
      span('attr-value', `${Math.round(crew.fatigue)}`),
    );
    append(this.body, moraleRow, fatigueRow);
    append(
      this.body,
      statRow(
        'Status',
        t(statusLabel(crew), 'status') +
          (crew.awayDays > 0 ? ` (${Math.ceil(crew.awayDays)}${t('d')})` : ''),
        crew.health !== 'healthy' ? 'bad' : '',
      ),
      statRow('Post', t(post.name)),
      statRow('Working in', `${t(room.name)} (${t(room.short)})`),
      statRow('Current task', tnote(crew.taskNote)),
      statRow('Output today', `${(effectiveness(crew) * 100).toFixed(0)}%`),
      statRow('Days aboard', String(crew.daysAboard)),
      statRow(
        'Consecutive duty days',
        String(crew.consecutiveWorkDays),
        crew.consecutiveWorkDays > 10 ? 'warn' : '',
      ),
    );

    // Aircrew live by a different clock: what they fly and how hard.
    if (isAircrew(crew)) {
      const mount = assignedAircraft(this.api.state(), crew.id);
      append(this.body, sectionTitle('FLYING'));
      if (mount) {
        const seat = mount.crewIds.indexOf(crew.id);
        const row = div('row clickable');
        append(
          row,
          span('name', `${aircraftType(mount.typeId).name} #${mount.tail}`),
          span(
            'meta',
            seat === 0 ? t('COMMANDER') : tf('MISSION CREW {n}', { n: seat }),
          ),
        );
        row.addEventListener('click', () =>
          this.api.openContext({ kind: 'aircraft', id: mount.id }),
        );
        append(this.body, row);
      } else {
        append(this.body, statRow('Assigned airframe', t('None — not on the flight schedule')));
      }
      append(
        this.body,
        statRow('Sorties flown', String(crew.sortiesFlown)),
        statRow(
          'Consecutive flying days',
          String(crew.consecutiveFlyingDays),
          crew.consecutiveFlyingDays >= 6 ? 'bad' : crew.consecutiveFlyingDays >= 4 ? 'warn' : '',
        ),
      );
      if (crew.consecutiveFlyingDays >= 5) {
        append(
          this.body,
          note(
            'Aircrew flown day after day tire faster than anyone else aboard, and a tired crew is both worth less in the air and more likely to break something. Standing them down costs sorties today and saves the wing next week.',
          ),
        );
      }
    }

    // Attributes
    append(this.body, sectionTitle('ATTRIBUTES'));
    for (const attr of ATTR_IDS) {
      append(this.body, attrRow(ATTR_LABELS[attr], crew.attrs[attr]));
    }

    // Skills
    append(this.body, sectionTitle('SKILLS'));
    const skills = Object.entries(crew.skills) as [keyof typeof SPECIALTIES, number][];
    skills.sort((a, b) => b[1] - a[1]);
    for (const [id, value] of skills) {
      const isPrimary = id === crew.primary;
      append(
        this.body,
        attrRow(
          t(SPECIALTIES[id].short) + (isPrimary ? ' *' : ''),
          value,
          isPrimary ? SPECIALTIES[id].color : undefined,
        ),
      );
    }
    append(this.body, noteRaw(tf('Primary: {spec}', { spec: t(spec.name) })));

    // Traits
    append(this.body, sectionTitle('PERSONALITY'));
    for (const trait of TRAIT_IDS) {
      append(this.body, attrRow(TRAIT_LABELS[trait], crew.traits[trait]));
    }

    // Promotion
    append(this.body, sectionTitle('ADVANCEMENT'));
    const check = checkPromotion(crew);
    if (check.gate) {
      append(this.body, note(check.gate.label));
      if (check.eligible) {
        append(this.body, note('All requirements met.'));
      } else {
        for (const u of check.unmet) {
          append(this.body, noteRaw(`· ${tnote(u)}`));
        }
      }
      // The trade-off, stated plainly (spec section 33).
      if (crew.attrs.leadership < 45 && primarySkill(crew) > 70) {
        append(
          this.body,
          note(
            'Note: an exceptional technician with weak leadership may be worth more on the tools than running a division.',
          ),
        );
      }
    } else {
      append(this.body, note('Highest rank aboard.'));
    }

    // Training
    append(this.body, sectionTitle('TRAINING'));
    if (crew.trainingId) {
      const course = trainingCourse(crew.trainingId);
      append(
        this.body,
        statRow('Course', t(course.name)),
        statRow('Days remaining', String(crew.trainingDaysLeft), 'warn'),
      );
    } else {
      append(this.body, note('Not enrolled.'));
    }
    if (crew.completedTraining.length > 0) {
      append(
        this.body,
        noteRaw(
          tf('Completed: {list}', {
            list: crew.completedTraining.map((id) => t(trainingCourse(id).name)).join(', '),
          }),
        ),
      );
    }

    // Mentoring
    if (canMentor(crew)) {
      append(this.body, sectionTitle('MENTORING'));
      const students = mentoringCandidates(state, crew).slice(0, 6);
      if (crew.mentorOf) {
        const student = state.crew.find((c) => c.id === crew.mentorOf);
        append(this.body, statRow('Mentoring', student?.name ?? '—', 'gold'));
        append(
          this.body,
          button('STOP MENTORING', 'wide', () => this.api.setMentor(crew.id, null)),
        );
      } else if (students.length === 0) {
        append(this.body, note('No suitable junior crew to mentor.'));
      } else {
        append(
          this.body,
          note('Passing skill down costs this person some of their own output.'),
        );
        const list = div('list');
        for (const s of students) {
          const row = div('row clickable');
          append(
            row,
            span('name', s.name),
            span('meta', `${t(SPECIALTIES[s.primary].short)} ${Math.round(skillOf(s, s.primary))}`),
          );
          row.addEventListener('click', () => this.api.setMentor(crew.id, s.id));
          append(list, row);
        }
        append(this.body, list);
      }
    }

    // Career history
    append(this.body, sectionTitle('CAREER'));
    const career = div('list');
    for (const entry of crew.career.slice(-10).reverse()) {
      const row = div('row');
      append(
        row,
        span('name', tnote(entry)),
        span(
          'meta',
          entry.day < 0 ? tf('{n}d ago', { n: -entry.day }) : tf('Day {n}', { n: entry.day }),
        ),
      );
      append(career, row);
    }
    append(this.body, career);

    // Actions
    const actions = div('btn-row');
    const trainBtn = button('TRAIN', '', () => this.api.openTrainingPicker(crew.id));
    trainBtn.disabled = crew.trainingId !== null || crew.health !== 'healthy';

    const assignBtn = button('APPOINT', '', () => this.api.openPostPicker(crew.id));
    assignBtn.disabled = crew.health !== 'healthy' || crew.status === 'training';

    const promoteBtn = button('PROMOTE', check.eligible ? 'primary' : '', () =>
      this.api.promoteCrew(crew.id),
    );
    promoteBtn.disabled = !check.eligible;

    const restLabel = crew.status === 'resting' ? 'RETURN TO DUTY' : 'STAND DOWN';
    const restBtn = button(restLabel, '', () => this.api.toggleRest(crew.id));
    restBtn.disabled = crew.health !== 'healthy' || crew.status === 'training' || crew.status === 'leave';

    append(actions, trainBtn, assignBtn, promoteBtn, restBtn);
    append(this.body, actions);
  }

  // -----------------------------------------------------------------------
  // Aircraft
  // -----------------------------------------------------------------------

  private renderAircraft(a: Aircraft): void {
    const state = this.api.state();
    const type = aircraftType(a.typeId);
    const orders = state.workOrders.filter((w) => w.aircraftId === a.id);
    const readiness = aircraftReadiness(a);

    this.buildHead(
      `${type.name}  #${a.tail}`,
      a.squadron,
      `${tf('DECK {n}', { n: String(a.deck).padStart(2, '0') })} — ${
        a.deck === 1 ? t('Flight Deck') : t('Hangar Deck')
      }`,
    );

    append(this.body, artElement(a.typeId));

    const statusText = aircraftStatusText(a);
    append(this.body, sectionTitle('STATUS'));
    append(
      this.body,
      statRow(
        'Status',
        t(statusText, 'aircraft'),
        statusText === 'READY' ? 'good' : statusText === 'DAMAGED' ? 'bad' : 'warn',
      ),
      statRow('Overall readiness', `${Math.round(readiness)}%`),
      statRow('Flight hours', formatNumber(a.flightHours)),
    );
    const limiting = limitingSystem(a);
    if (limiting) {
      append(this.body, statRow('Limited by', t(limiting, 'system'), 'bad'));
    }

    append(this.body, sectionTitle('SYSTEMS'));
    append(
      this.body,
      attrRow('Engine', a.systems.engine, statusColor(a.systems.engine)),
      attrRow('Avionics', a.systems.avionics, statusColor(a.systems.avionics)),
      attrRow('Airframe', a.systems.airframe, statusColor(a.systems.airframe)),
      attrRow('Fuel', a.fuel, statusColor(a.fuel)),
      attrRow('Weapons', a.weapons, statusColor(a.weapons)),
    );
    append(
      this.body,
      note(
        'An aircraft is only mission capable when every critical system is above its threshold — a healthy airframe cannot cover for dead avionics.',
      ),
    );

    // Who flies it. Above the maintenance state, because on any day the ship
    // is flying this is the more consequential of the two.
    const seats = seatCount(a);
    append(this.body, sectionTitle(`${t('AIRCREW')} — ${seats} ${t('seats')}`));
    const factor = crewFactor(state, a);
    append(
      this.body,
      statRow(
        'Crew effect',
        factor > 0 ? `×${factor.toFixed(2)}` : t('NO PILOT'),
        factor >= 1 ? 'good' : factor > 0 ? 'warn' : 'bad',
      ),
      statRow(
        'Seats manned',
        `${aircrewOf(state, a).filter(isFitToFly).length} / ${seats}`,
      ),
    );

    const crewList = div('list');
    for (let seat = 0; seat < seats; seat++) {
      const occupant = seatOccupant(state, a, seat);
      const row = div('row clickable');
      const label = seat === 0 ? t('COMMANDER') : tf('MISSION CREW {n}', { n: seat });
      if (occupant) {
        const name = span('name', `${rank(occupant.rank).code} ${occupant.name}`);
        if (!isFitToFly(occupant)) {
          name.appendChild(span('badge', t(statusLabel(occupant), 'status')));
        }
        append(
          row,
          name,
          span(
            'meta',
            `${label} · ${t('FATIGUE')} ${Math.round(occupant.fatigue)}%`,
          ),
        );
        row.addEventListener('click', () => this.api.focusCrew(occupant.id));
      } else {
        append(
          row,
          span('name', `${label} — ${t('VACANT')}`),
          span('meta', t(SPECIALTIES[seatSpecialty(seat)].short)),
        );
        row.addEventListener('click', () => this.api.openAircrewPicker(a.id));
      }
      append(crewList, row);
    }
    append(this.body, crewList);

    const crewActions = div('btn-row');
    append(
      crewActions,
      button('ASSIGN AIRCREW', '', () => this.api.openAircrewPicker(a.id)),
    );
    append(this.body, crewActions);

    if (orders.length > 0) {
      append(this.body, sectionTitle(`${t('OPEN WORK ORDERS')} — ${orders.length}`));
      const list = div('list');
      for (const o of orders) {
        const row = div('row clickable');
        const pct = Math.round((o.labourDone / o.labourRequired) * 100);
        append(
          row,
          span('name', tnote(workOrderNote(o))),
          span(
            'meta',
            `${pct}% · ${t(SPECIALTIES[o.specialty].short)}${
              o.partsDrawn ? '' : ` · ${t('AWAITING PARTS')}`
            }`,
          ),
        );
        row.addEventListener('click', () => this.api.focusRoom(o.roomId));
        append(list, row);
      }
      append(this.body, list);
      append(
        this.body,
        note(
          'Work advances when qualified technicians are assigned to the shop holding the order. Click an order to jump to that shop.',
        ),
      );
    } else {
      append(this.body, sectionTitle('MAINTENANCE'));
      append(this.body, note('No open work orders.'));
    }

    const actions = div('btn-row');
    const toHangar = button('MOVE TO HANGAR', '', () => this.api.moveAircraft(a.id, 2));
    toHangar.disabled = a.deck === 2;
    const toFlight = button('MOVE TO FLIGHT DECK', '', () => this.api.moveAircraft(a.id, 1));
    toFlight.disabled = a.deck === 1;
    append(actions, toHangar, toFlight);
    append(this.body, actions);
    append(
      this.body,
      note('Aircraft in the hangar have their wings folded and cannot launch until respotted.'),
    );

    const caps = div('btn-row');
    append(
      caps,
      pill(t(type.role.toUpperCase(), 'role')),
      span('pill', tf('AIRCREW {n}', { n: type.crewRequired })),
      span('pill', tf('FUEL {n}/SORTIE', { n: type.fuelBurn })),
    );
    append(this.body, caps);
  }
}
