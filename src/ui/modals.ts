import type { AttrId, CrewMember, DailyReport, GameState, SupplyId } from '../core/types';
import { mechanicRows, mechanicSummary } from './operationsView';
import { portraitElement } from '../render/portrait';
import type { GameApi } from './api';
import { getRoom } from '../data/decks';
import { DEPARTMENTS, DEPT_IDS, SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { TRAINING_COURSES, trainingCourse } from '../data/training';
import { missionDef } from '../data/missions';
import { Rng } from '../core/rng';
import { FLYING_DUTIES } from '../core/types';
import { DUTIES_BY_ID, typeSuitability } from '../data/aircraft';
import {
  AIRCRAFT_CAPACITY,
  aircraftCapacityUsed,
  aircraftCatalogue,
  equipmentCatalogue,
  orderAircraft,
  orderEquipment,
  pendingDeliveries,
} from '../core/procurement';
import { shortName } from '../data/names';
import { artElement } from '../render/aircraftArt';
import {
  ATTR_LABELS,
  checkPromotion,
  positionParts,
  primarySkill,
  skillOf,
  statusLabel,
} from '../core/crew';
import { postFit, postStrength, postsByFit } from '../core/posts';
import { postDef } from '../data/posts';
import { canEnrol, courseCost, courseDays, suggestedCourses } from '../core/training';
import { checkRequirements, OUTCOME_LABELS, successProbability } from '../core/missions';
import {
  allUpgradeStatuses,
  crewCapacity,
  prestigeTier,
  purchaseSupply,
  purchaseUpgrade,
  recruit,
  SUPPLY_LABELS,
  supplyUnitCost,
} from '../core/economy';
import { COMPONENT_ADVICE, COMPONENT_LABELS, readinessLabel, weakestLink } from '../core/readiness';
import { STATUS_LABELS, isInPort, missionTotalDays } from '../core/status';
import {
  append,
  attrRow,
  bar,
  button,
  clear,
  deltaClass,
  div,
  formatCredits,
  note,
  noteRaw,
  formatDelta,
  pill,
  sectionTitle,
  span,
  statRow,
} from './dom';
import { t, tf, tnote } from '../i18n';

/** Shared modal shell: dim overlay, framed panel, escapable. */
export class Modal {
  readonly root: HTMLDivElement;
  private titleNode: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly foot: HTMLDivElement;
  private onCloseCb: (() => void) | null = null;

  constructor(wide = false) {
    this.root = div('overlay hidden');
    const modal = div(`modal${wide ? ' wide' : ''}`);
    const head = div('modal-head');
    this.titleNode = div('mt', '');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-x';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());
    append(head, this.titleNode, closeBtn);

    this.body = div('modal-body');
    this.foot = div('modal-foot');
    append(modal, head, this.body, this.foot);
    append(this.root, modal);

    // Click the dim area to dismiss.
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(title: string, onClose?: () => void): void {
    this.titleNode.textContent = t(title);
    this.onCloseCb = onClose ?? null;
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
    clear(this.body);
    clear(this.foot);
    const cb = this.onCloseCb;
    this.onCloseCb = null;
    cb?.();
  }
}

// ===========================================================================
// Staff roster (spec sections 35 and 87)
// ===========================================================================

type SortKey = 'name' | 'rank' | 'specialty' | 'status' | 'skill' | 'fatigue' | 'morale';

export class RosterModal {
  private modal = new Modal(true);
  private search = '';
  private deptFilter = 'ALL';
  private statusFilter = 'ALL';
  private roomFilter: string | null = null;
  private sortKey: SortKey = 'name';
  private sortDesc = false;

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  get isOpen(): boolean {
    return this.modal.isOpen;
  }

  close(): void {
    this.modal.close();
  }

  open(filter?: { roomId?: string; department?: string }): void {
    this.roomFilter = filter?.roomId ?? null;
    if (filter?.department) this.deptFilter = filter.department;
    const state = this.api.state();
    this.modal.open(`${t('STAFF')} — ${state.crew.length}`);
    this.render();
  }

  private matches(c: CrewMember): boolean {
    if (this.roomFilter && c.assignmentRoomId !== this.roomFilter) return false;
    if (this.deptFilter !== 'ALL' && c.department !== this.deptFilter) return false;
    if (this.statusFilter !== 'ALL' && statusLabel(c) !== this.statusFilter) return false;
    if (this.search) {
      const q = this.search.toLowerCase();
      // Search both languages so a French player can still type "avionics".
      const spec = SPECIALTIES[c.primary];
      const hay =
        `${c.name} ${spec.name} ${t(spec.name)} ${spec.short} ${t(spec.short)} ` +
        `${rank(c.rank).code}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  private sorted(crew: CrewMember[]): CrewMember[] {
    const dir = this.sortDesc ? -1 : 1;
    const key = this.sortKey;
    return crew.slice().sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'rank':
          cmp = a.rank - b.rank;
          break;
        case 'specialty':
          cmp = SPECIALTIES[a.primary].short.localeCompare(SPECIALTIES[b.primary].short);
          break;
        case 'status':
          cmp = statusLabel(a).localeCompare(statusLabel(b));
          break;
        case 'skill':
          cmp = primarySkill(a) - primarySkill(b);
          break;
        case 'fatigue':
          cmp = a.fatigue - b.fatigue;
          break;
        case 'morale':
          cmp = a.morale - b.morale;
          break;
      }
      return cmp * dir;
    });
  }

  private setSort(key: SortKey): void {
    if (this.sortKey === key) this.sortDesc = !this.sortDesc;
    else {
      this.sortKey = key;
      // Numeric columns are most useful highest-first.
      this.sortDesc = key === 'skill' || key === 'fatigue' || key === 'rank';
    }
    this.render();
  }

  render(): void {
    const state = this.api.state();
    clear(this.modal.body);
    clear(this.modal.foot);

    // Filters
    const filters = div('filters');

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = t('Search name, rank or specialty');
    searchInput.value = this.search;
    searchInput.style.minWidth = '230px';
    searchInput.addEventListener('input', () => {
      this.search = searchInput.value;
      this.renderTable();
    });

    const deptSelect = document.createElement('select');
    {
      const allOpt = document.createElement('option');
      allOpt.value = 'ALL';
      allOpt.textContent = t('ALL DEPARTMENTS');
      if (this.deptFilter === 'ALL') allOpt.selected = true;
      deptSelect.appendChild(allOpt);
      for (const id of DEPT_IDS) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = t(DEPARTMENTS[id].name);
        if (id === this.deptFilter) o.selected = true;
        deptSelect.appendChild(o);
      }
    }
    deptSelect.addEventListener('change', () => {
      this.deptFilter = deptSelect.value;
      this.renderTable();
    });

    const statusSelect = document.createElement('select');
    const statuses = ['ALL', 'WORKING', 'RESTING', 'TRAINING', 'INJURED', 'SICK', 'ON LEAVE', 'MENTORING'];
    for (const opt of statuses) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt === 'ALL' ? t('ALL STATUSES') : t(opt, 'status');
      if (opt === this.statusFilter) o.selected = true;
      statusSelect.appendChild(o);
    }
    statusSelect.addEventListener('change', () => {
      this.statusFilter = statusSelect.value;
      this.renderTable();
    });

    append(filters, searchInput, deptSelect, statusSelect);

    if (this.roomFilter) {
      const room = getRoom(this.roomFilter);
      const chip = button(`${t('ROOM')}: ${t(room.short)} ×`, '', () => {
        this.roomFilter = null;
        this.render();
      });
      append(filters, chip);
    }

    const promotable = state.crew.filter((c) => c.promotable).length;
    if (promotable > 0) {
      const chip = button(tf('{n} ELIGIBLE FOR PROMOTION', { n: promotable }), '', () => {
        this.search = '';
        this.deptFilter = 'ALL';
        this.statusFilter = 'ALL';
        this.roomFilter = null;
        this.sortKey = 'skill';
        this.sortDesc = true;
        this.onlyPromotable = !this.onlyPromotable;
        this.render();
      });
      append(filters, chip);
    }

    append(this.modal.body, filters);

    this.tableHost = div();
    append(this.modal.body, this.tableHost);
    this.renderTable();

    append(
      this.modal.foot,
      note('Selecting a crew member closes the roster and moves the camera to where they physically are.'),
    );
  }

  private onlyPromotable = false;
  private tableHost: HTMLDivElement = div();

  private renderTable(): void {
    const state = this.api.state();
    clear(this.tableHost);

    let crew = state.crew.filter((c) => this.matches(c));
    if (this.onlyPromotable) crew = crew.filter((c) => c.promotable);
    crew = this.sorted(crew);

    const table = document.createElement('table');
    table.className = 'roster';

    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    const cols: [string, SortKey][] = [
      ['NAME', 'name'],
      ['RANK', 'rank'],
      ['SPECIALTY', 'specialty'],
      ['SKILL', 'skill'],
      ['STATUS', 'status'],
      ['MORALE', 'morale'],
      ['FATIGUE', 'fatigue'],
    ];
    for (const [label, key] of cols) {
      const th = document.createElement('th');
      th.textContent = t(label) + (this.sortKey === key ? (this.sortDesc ? ' ▼' : ' ▲') : '');
      th.addEventListener('click', () => this.setSort(key));
      hrow.appendChild(th);
    }
    const thLoc = document.createElement('th');
    thLoc.textContent = t('POST');
    hrow.appendChild(thLoc);
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const c of crew.slice(0, 400)) {
      const tr = document.createElement('tr');
      const room = getRoom(c.assignmentRoomId);
      const status = statusLabel(c);

      const cells: (string | HTMLElement)[] = [];
      const nameCell = document.createElement('span');
      nameCell.className = 'with-portrait';
      nameCell.append(portraitElement(c, 1, 'portrait portrait-row'), document.createTextNode(shortName(c.name)));
      if (c.promotable) {
        nameCell.appendChild(span('badge gold', t('PROMOTE')));
      }
      cells.push(nameCell);
      cells.push(rank(c.rank).code);
      cells.push(t(SPECIALTIES[c.primary].short));
      cells.push(String(Math.round(primarySkill(c))));

      const statusCell = span(
        `st-${status.toLowerCase().replace(' ', '')}`,
        t(status, 'status'),
      );
      cells.push(statusCell);
      cells.push(`${Math.round(c.morale)}%`);
      cells.push(`${Math.round(c.fatigue)}%`);
      // The post is the appointment; the space is where it has put them today.
      const postCell = span('name', t(postDef(c.postId).short));
      postCell.appendChild(
        span('meta', ` D${String(room.deck).padStart(2, '0')} ${t(room.short)}`),
      );
      cells.push(postCell);

      for (const cell of cells) {
        const td = document.createElement('td');
        if (typeof cell === 'string') td.textContent = cell;
        else td.appendChild(cell);
        tr.appendChild(td);
      }

      tr.addEventListener('click', () => {
        this.modal.close();
        this.api.focusCrew(c.id);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    if (crew.length === 0) {
      append(this.tableHost, note('No personnel match these filters.'));
    } else {
      append(this.tableHost, table);
      if (crew.length > 400) {
        append(
          this.tableHost,
          noteRaw(tf('Showing 400 of {n}. Narrow the filters to see more.', { n: crew.length })),
        );
      }
    }
  }
}

// ===========================================================================
// Mission board (spec sections 41-44)
// ===========================================================================

export class MissionModal {
  private modal = new Modal(true);

  constructor(private api: GameApi, private onAccept: (id: string) => void) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  close(): void {
    this.modal.close();
  }

  open(): void {
    this.modal.open('MISSION BOARD');
    this.render();
  }

  render(): void {
    const state = this.api.state();
    clear(this.modal.body);
    clear(this.modal.foot);

    if (state.mission) {
      const def = missionDef(state.mission.defId);
      append(this.modal.body, sectionTitle('ACTIVE MISSION'));
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(def.title)), span('stars', '★'.repeat(def.difficulty)));
      append(card, ct, div('desc', t(def.description)));

      const progressRow = div('attr-row');
      append(
        progressRow,
        span('attr-label', 'Progress'),
        bar(state.mission.progress),
        span('attr-value', `${Math.round(state.mission.progress)}`),
      );
      append(card, progressRow);
      append(
        card,
        statRow('Carrier status', t(STATUS_LABELS[state.status], 'carrierstatus')),
        statRow('Days on station', `${state.mission.daysElapsed} / ${def.days}`),
        statRow(
          'Accumulated risk',
          `+${Math.round(state.mission.riskModifier)}`,
          state.mission.riskModifier > 20 ? 'bad' : state.mission.riskModifier > 0 ? 'warn' : 'good',
        ),
        ...mechanicRows(state),
      );

      append(card, sectionTitle('OBJECTIVES'));
      for (const o of def.objectives) append(card, noteRaw(`· ${t(o)}`));

      if (state.mission.log.length > 0) {
        append(card, sectionTitle('MISSION LOG'));
        const list = div('list');
        for (const entry of state.mission.log.slice(-8).reverse()) {
          const row = div('row');
          append(
            row,
            span('name', tnote(entry.note)),
            span('meta', tf('Day {n}', { n: entry.day })),
          );
          append(list, row);
        }
        append(card, list);
      }
      append(this.modal.body, card);
      append(this.modal.foot, note('A new mission can be accepted once this one resolves.'));
      return;
    }

    append(this.modal.body, sectionTitle('AVAILABLE OPERATIONS'));
    const inPort = isInPort(state);
    if (!inPort) {
      const banner = div('at-sea-banner');
      banner.textContent = t(
        'The ship is at sea. A new mission can only be accepted once it is alongside.',
      );
      append(this.modal.body, banner);
    }
    const tier = prestigeTier(state.prestige);
    append(
      this.modal.body,
      noteRaw(
        tf('Standing: {tier} ({n} prestige) — {unlocks}', {
          tier: t(tier.name),
          n: state.prestige,
          unlocks: t(tier.unlocks),
        }),
      ),
    );

    const cards = div('cards');
    for (const id of state.missionOffers) {
      const def = missionDef(id);
      const checks = checkRequirements(state, def);
      const unmet = checks.filter((c) => !c.met);
      const prob = successProbability(state, def);

      const card = div('card selectable');
      const ct = div('ct');
      append(
        ct,
        span('n', t(def.title)),
        pill(t(def.category.toUpperCase(), 'missioncat')),
        span('stars', '★'.repeat(def.difficulty) + '☆'.repeat(5 - def.difficulty)),
      );
      append(card, ct, div('desc', t(def.description)), mechanicSummary(def));

      // Requirements
      const reqs = div('reqs');
      for (const c of checks) {
        const r = div(`req ${c.met ? 'met' : 'unmet'}`);
        append(
          r,
          span('rl', t(c.label)),
          span('rv', `${Math.round(c.actual)} / ${c.required}`),
        );
        append(reqs, r);
      }
      append(card, reqs);

      if (def.recommended.length > 0) {
        append(
          card,
          noteRaw(
            tf('Recommended: {list}', { list: def.recommended.map((x) => t(x)).join(' · ') }),
          ),
        );
      }

      const rewards = div('rewards');
      const mk = (label: string, value: string) => {
        const d = div();
        d.appendChild(document.createTextNode(`${t(label)} `));
        const b = document.createElement('b');
        b.textContent = value;
        d.appendChild(b);
        return d;
      };
      append(
        rewards,
        mk('On station', tf('{n} days', { n: def.days })),
        mk('Passage', tf('{n} days each way', { n: def.transitDays })),
        mk('Total', tf('{n} days', { n: missionTotalDays(def.id) })),
        mk('Credits', formatCredits(def.rewardCredits)),
        mk('Prestige', `+${def.rewardPrestige}`),
        mk('Est. success', `${Math.round(prob * 100)}%`),
      );
      append(card, rewards);

      if (unmet.length > 0) {
        append(
          card,
          noteRaw(
            unmet.length === 1
              ? t(
                  '1 requirement unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.',
                )
              : tf(
                  '{n} requirements unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.',
                  { n: unmet.length },
                ),
          ),
        );
      }

      const actions = div('btn-row');
      const accept = button('ACCEPT MISSION', unmet.length === 0 ? 'primary' : 'danger', () => {
        this.onAccept(def.id);
        this.modal.close();
      });
      accept.disabled = !inPort;
      append(actions, accept);
      append(card, actions);
      if (!inPort) {
        append(card, note('A mission can only be accepted alongside in port.'));
      }
      append(cards, card);
    }
    append(this.modal.body, cards);

    if (state.missionHistory.length > 0) {
      append(this.modal.body, sectionTitle('MISSION HISTORY'));
      const list = div('list');
      for (const h of state.missionHistory.slice(0, 12)) {
        const row = div('row');
        const good = h.outcome === 'outstanding' || h.outcome === 'success';
        append(
          row,
          span('name', t(h.title)),
          span(
            'meta',
            `${t(OUTCOME_LABELS[h.outcome])} · ${good ? '+' : ''}${h.prestige} ${t('prestige')} · ${tf('Day {n}', { n: h.endedDay })}`,
          ),
        );
        append(list, row);
      }
      append(this.modal.body, list);
    }
  }
}

// ===========================================================================
// Dockyard — upgrades, recruitment and stores
// ===========================================================================

export class DockyardModal {
  private modal = new Modal(true);
  private tab: 'upgrades' | 'aircraft' | 'equipment' | 'recruit' | 'stores' = 'upgrades';

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  close(): void {
    this.modal.close();
  }

  open(): void {
    this.modal.open('CARRIER DEVELOPMENT');
    this.render();
  }

  render(): void {
    const state = this.api.state();
    clear(this.modal.body);
    clear(this.modal.foot);

    const tabs = div('filters');
    const mkTab = (key: typeof this.tab, label: string) => {
      const b = button(label, this.tab === key ? 'primary' : '', () => {
        this.tab = key;
        this.render();
      });
      return b;
    };
    append(
      tabs,
      mkTab('upgrades', 'FACILITIES'),
      mkTab('aircraft', 'AIRCRAFT'),
      mkTab('equipment', 'EQUIPMENT'),
      mkTab('recruit', 'RECRUITMENT'),
      mkTab('stores', 'STORES'),
    );
    append(this.modal.body, tabs);

    // Nothing comes aboard at sea, so say so before the player tries.
    if (!isInPort(state)) {
      const banner = div('at-sea-banner');
      const b = document.createElement('b');
      b.textContent = t(STATUS_LABELS[state.status], 'carrierstatus');
      banner.appendChild(b);
      banner.appendChild(
        document.createTextNode(
          ` — ${t('nothing can be brought aboard until the ship is alongside. Orders already placed will wait in port.')}`,
        ),
      );
      append(this.modal.body, banner);
    }

    append(
      this.modal.body,
      noteRaw(
        tf('Credits {credits}   ·   Prestige {n} ({tier})', {
          credits: formatCredits(state.credits),
          n: state.prestige,
          tier: t(prestigeTier(state.prestige).name),
        }),
      ),
    );

    this.renderDeliveries(state);

    if (this.tab === 'upgrades') this.renderUpgrades(state);
    else if (this.tab === 'aircraft') this.renderAircraft(state);
    else if (this.tab === 'equipment') this.renderEquipment(state);
    else if (this.tab === 'recruit') this.renderRecruit(state);
    else this.renderStores(state);
  }

  /** Orders in transit, shown on every tab so spending stays visible. */
  private renderDeliveries(state: GameState): void {
    const pending = pendingDeliveries(state);
    if (pending.length === 0) return;

    append(this.modal.body, sectionTitle(`${t('ON ORDER')} — ${pending.length}`));
    const list = div('list');
    for (const d of pending) {
      const row = div('row');
      append(
        row,
        span('name', t(d.name)),
        span(
          'meta',
          d.daysLeft === 0
            ? t('arrives tomorrow')
            : tf('arrives in {n} days', { n: d.daysLeft }),
        ),
      );
      append(list, row);
    }
    append(this.modal.body, list);
  }

  private renderAircraft(state: GameState): void {
    const used = aircraftCapacityUsed(state);
    append(this.modal.body, sectionTitle('AIRFRAME PROCUREMENT'));
    append(
      this.modal.body,
      noteRaw(
        tf('Parking {used} / {max}. Airframes arrive after a delivery lead time, so buy for the campaign you expect rather than today’s problem.', {
          used,
          max: AIRCRAFT_CAPACITY,
        }),
      ),
    );

    const cards = div('cards');
    cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    for (const entry of aircraftCatalogue(state)) {
      const { def, owned, onOrder, locked, check } = entry;
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', def.name), pill(t(def.role.toUpperCase(), 'role')));
      if (owned > 0) ct.appendChild(span('badge', tf('{n} IN WING', { n: owned })));
      if (onOrder > 0) ct.appendChild(span('badge gold', tf('{n} ON ORDER', { n: onOrder })));
      append(card, ct);
      append(card, artElement(def.id, 'plan-art small'));

      append(
        card,
        statRow('Sortie value', def.sortieValue.toFixed(2)),
        statRow('Aircrew', String(def.crewRequired)),
        statRow('Fuel per sortie', def.fuelBurn.toFixed(1)),
        statRow('Delivery', tf('{n} days', { n: def.leadDays })),
        statRow(
          'Cost',
          def.costPrestige > 0
            ? `${formatCredits(def.costCredits)} + ${def.costPrestige} ${t('prestige')}`
            : formatCredits(def.costCredits),
        ),
      );

      // Which duties this airframe is actually good for.
      const good = FLYING_DUTIES.filter((d) => typeSuitability(def.id, d) >= 0.8);
      if (good.length > 0) {
        append(
          card,
          noteRaw(
            tf('Best on: {list}', {
              list: good.map((d) => t(DUTIES_BY_ID[d].short, 'duty')).join(' · '),
            }),
          ),
        );
      }

      const actions = div('btn-row');
      const b = button('ORDER', check.ok ? 'primary' : '', () => {
        if (orderAircraft(state, def.id)) {
          this.api.toast(tf('{type} ordered', { type: def.name }));
          this.api.refresh();
          this.render();
        }
      });
      b.disabled = !check.ok;
      append(actions, b);
      append(card, actions);

      if (locked) {
        append(
          card,
          noteRaw(tf('Requires {n} prestige to access', { n: def.minPrestige })),
        );
      } else if (!check.ok) {
        for (const reason of check.reasons) append(card, noteRaw(`· ${t(reason)}`));
      }
      append(cards, card);
    }
    append(this.modal.body, cards);
  }

  private renderEquipment(state: GameState): void {
    append(this.modal.body, sectionTitle('EQUIPMENT'));
    append(
      this.modal.body,
      note(
        'Equipment is bought in quantity and each item feeds one system directly. Unlike a facility upgrade, you can see exactly what it does.',
      ),
    );

    const cards = div('cards');
    cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    for (const entry of equipmentCatalogue(state)) {
      const { def, owned, onOrder, locked, check } = entry;
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(def.name)), pill(t(def.category.toUpperCase(), 'eqcat')));
      append(ct, span('stat-value', `${owned} / ${def.max}`));
      append(card, ct, div('desc', t(def.description)));

      const row = div('attr-row');
      append(
        row,
        span('attr-label', t('Held')),
        bar(owned, undefined, def.max),
        span('attr-value', String(owned)),
      );
      append(card, row);

      append(
        card,
        statRow('Each one', t(def.effectText), 'gold'),
        statRow('Delivery', tf('{n} days', { n: def.leadDays })),
        statRow(
          'Cost',
          def.costPrestige > 0
            ? `${formatCredits(def.costCredits)} + ${def.costPrestige} ${t('prestige')}`
            : formatCredits(def.costCredits),
        ),
      );
      if (onOrder > 0) {
        append(card, statRow('On order', String(onOrder), 'gold'));
      }

      const actions = div('btn-row');
      const b = button('ORDER', check.ok ? 'primary' : '', () => {
        if (orderEquipment(state, def.id)) {
          this.api.toast(tf('{item} ordered', { item: t(def.name) }));
          this.api.refresh();
          this.render();
        }
      });
      b.disabled = !check.ok;
      append(actions, b);
      append(card, actions);

      if (locked) {
        append(card, noteRaw(tf('Requires {n} prestige to access', { n: def.minPrestige })));
      } else if (!check.ok) {
        for (const reason of check.reasons) append(card, noteRaw(`· ${t(reason)}`));
      }
      append(cards, card);
    }
    append(this.modal.body, cards);
  }

  private renderUpgrades(state: GameState): void {
    append(this.modal.body, sectionTitle('FACILITY UPGRADES'));
    append(
      this.modal.body,
      note('Upgrades cost both credits and prestige — spending reputation is a real trade against unlocking better missions.'),
    );
    const cards = div('cards');
    for (const u of allUpgradeStatuses(state)) {
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(u.name)), span('pill', tf('LEVEL {a} / {b}', { a: u.level, b: u.maxLevel })));
      append(card, ct, div('desc', t(u.description)));

      const lvlRow = div('attr-row');
      append(
        lvlRow,
        span('attr-label', 'Level'),
        bar(u.level, undefined, u.maxLevel),
        span('attr-value', String(u.level)),
      );
      append(card, lvlRow);

      if (u.nextEffect) {
        append(card, statRow('Next level', t(u.nextEffect), 'gold'));
        append(
          card,
          statRow(
            'Cost',
            `${formatCredits(u.costCredits!)} + ${u.costPrestige} ${t('prestige')}`,
          ),
        );
        const actions = div('btn-row');
        const b = button('UPGRADE', u.affordable ? 'primary' : '', () => {
          if (purchaseUpgrade(state, u.id)) {
            this.api.toast(
              tf('{name} upgraded to level {level}', { name: t(u.name), level: u.level + 1 }),
            );
            this.api.refresh();
            this.render();
          }
        });
        b.disabled = !u.affordable;
        append(actions, b);
        append(card, actions);
      } else {
        append(card, note('Fully upgraded.'));
      }
      append(cards, card);
    }
    append(this.modal.body, cards);
  }

  private renderRecruit(state: GameState): void {
    append(this.modal.body, sectionTitle('RECRUITMENT OFFERS'));
    append(
      this.modal.body,
      noteRaw(
        tf(
          'Crew {n} / {max}. Candidate quality is gated by prestige — a Legendary carrier attracts people an unknown one never sees. New candidates arrive every five days.',
          { n: state.crew.length, max: crewCapacity(state) },
        ),
      ),
    );

    if (state.candidates.length === 0) {
      append(this.modal.body, note('No candidates are currently available.'));
      return;
    }

    const cards = div('cards');
    for (const cand of state.candidates) {
      const card = div('card');
      const ct = div('ct');
      append(
        ct,
        span('n', cand.name),
        span('pill', rank(cand.rank).code),
        pill(SPECIALTIES[cand.primary].name),
      );
      append(card, ct);

      for (const [key, label] of [
        ['technical', 'Technical'],
        ['discipline', 'Discipline'],
        ['leadership', 'Leadership'],
        ['stamina', 'Stamina'],
        ['experience', 'Experience'],
      ] as const) {
        append(card, attrRow(label, cand.attrs[key]));
      }
      append(
        card,
        attrRow(
          tf('{spec} skill', { spec: t(SPECIALTIES[cand.primary].short) }),
          cand.skills[cand.primary] ?? 0,
          SPECIALTIES[cand.primary].color,
        ),
      );

      append(
        card,
        statRow(
          'Cost',
          `${cand.costPrestige} ${t('prestige')} + ${formatCredits(cand.costCredits)}`,
        ),
      );

      const affordable =
        state.prestige >= cand.costPrestige &&
        state.credits >= cand.costCredits &&
        state.crew.length < crewCapacity(state);

      const actions = div('btn-row');
      const b = button('RECRUIT', affordable ? 'primary' : '', () => {
        if (recruit(state, new Rng(state.seed + state.day * 31 + cand.name.length), cand.id)) {
          this.api.toast(tf('{name} has reported aboard', { name: cand.name }));
          this.api.refresh();
          this.render();
        }
      });
      b.disabled = !affordable;
      append(actions, b);
      append(card, actions);
      append(cards, card);
    }
    append(this.modal.body, cards);
  }

  private renderStores(state: GameState): void {
    append(this.modal.body, sectionTitle('REPLENISHMENT'));
    append(
      this.modal.body,
      note('Buying stores at sea is expensive. Running out mid-mission is worse.'),
    );
    const cards = div('cards');
    for (const key of Object.keys(state.supplies) as SupplyId[]) {
      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(SUPPLY_LABELS[key])));
      append(card, ct);

      const row = div('attr-row');
      append(
        row,
        span('attr-label', 'Level'),
        bar(state.supplies[key]),
        span('attr-value', String(Math.round(state.supplies[key]))),
      );
      append(card, row);
      append(
        card,
        statRow('Unit cost', tf('{cost} per point', { cost: formatCredits(supplyUnitCost(key)) })),
      );

      const actions = div('btn-row');
      for (const amount of [10, 25, 50]) {
        const cost = amount * supplyUnitCost(key);
        const b = button(`+${amount}  ${formatCredits(cost)}`, '', () => {
          if (purchaseSupply(state, key, amount)) {
            this.api.refresh();
            this.render();
          } else {
            this.api.toast(t('Cannot purchase — insufficient credits or already full'));
          }
        });
        b.disabled =
          state.credits < cost || state.supplies[key] >= state.suppliesMax[key] - 0.5;
        append(actions, b);
      }
      append(card, actions);
      append(cards, card);
    }
    append(this.modal.body, cards);
  }
}

// ===========================================================================
// Daily summary (spec section 88)
// ===========================================================================

export class SummaryModal {
  private modal = new Modal();

  constructor(private onContinue: () => void) {}

  /** Hide without continuing, e.g. while the day's flying is replayed. */
  suspend(): void {
    this.modal.root.classList.add('hidden');
  }

  resume(): void {
    this.modal.root.classList.remove('hidden');
  }

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(report: DailyReport, state: GameState, extras: HTMLElement[] = []): void {
    this.modal.open(tf('DAY {n} COMPLETE', { n: report.day }), () => this.onContinue());
    clear(this.modal.body);
    clear(this.modal.foot);

    // A phase change is the most consequential thing that can happen in a
    // day, so it leads the summary.
    if (report.statusAfter !== report.statusBefore) {
      const banner = div(
        `outcome-banner ${report.statusAfter === 'port' ? 'good' : ''}`.trim(),
        `${t(STATUS_LABELS[report.statusBefore], 'carrierstatus')}  →  ${t(
          STATUS_LABELS[report.statusAfter],
          'carrierstatus',
        )}`,
      );
      append(this.modal.body, banner);
    }

    if (report.missionOutcome) {
      const good = report.missionOutcome === 'outstanding' || report.missionOutcome === 'success';
      const banner = div(
        `outcome-banner ${good ? 'good' : 'bad'}`,
        t(OUTCOME_LABELS[report.missionOutcome]),
      );
      append(this.modal.body, banner);
    }

    const grid = div('summary-grid');

    // Mission
    const mission = div('summary-block');
    append(mission, div('sb-title', t('MISSION')));
    if (report.missionTitle) {
      append(
        mission,
        statRow('Operation', t(report.missionTitle)),
        statRow(
          'Progress',
          `${formatDelta(report.missionProgressDelta, 1)}%`,
          deltaClass(report.missionProgressDelta),
        ),
        statRow('Total', `${Math.round(report.missionProgress)}%`),
      );
    } else {
      append(mission, note('No active mission.'));
    }
    append(grid, mission);

    // Aircraft
    const air = div('summary-block');
    append(air, div('sb-title', t('AIRCRAFT')));
    append(
      air,
      statRow('Launched', String(report.sortiesLaunched)),
      statRow('Recovered', String(report.sortiesRecovered)),
      statRow('Maintenance completed', String(report.maintenanceCompleted)),
      statRow(
        'New work orders',
        String(report.workOrdersOpened),
        report.workOrdersOpened > 2 ? 'warn' : '',
      ),
    );
    if (report.tasking.required > 0) {
      append(
        air,
        statRow(
          'Objective cover',
          `${Math.round(report.tasking.ratio * 100)}%`,
          report.tasking.ratio >= 1 ? 'good' : report.tasking.ratio >= 0.6 ? 'warn' : 'bad',
        ),
      );
    }
    if (report.tasking.grounded > 0) {
      append(air, statRow('Grounded', String(report.tasking.grounded)));
    }
    append(grid, air);

    // Crew
    const crew = div('summary-block');
    append(crew, div('sb-title', t('CREW')));
    append(
      crew,
      statRow('In training', String(report.trainedToday)),
      statRow('Courses completed', String(report.trainingCompleted.length)),
      statRow('Newly promotable', String(report.promotions.length)),
      statRow('Morale', formatDelta(report.moraleDelta, 1), deltaClass(report.moraleDelta)),
      statRow('Fatigue', formatDelta(report.fatigueDelta, 1), deltaClass(-report.fatigueDelta)),
    );
    append(grid, crew);

    // Carrier
    const carrier = div('summary-block');
    append(carrier, div('sb-title', t('CARRIER')));
    append(
      carrier,
      statRow(
        'Readiness',
        `${Math.round(report.readinessBefore)}% → ${Math.round(report.readinessAfter)}%`,
        deltaClass(report.readinessAfter - report.readinessBefore),
      ),
      statRow('Assessment', t(readinessLabel(report.readinessAfter), 'readiness')),
    );
    append(grid, carrier);

    // Resources
    const res = div('summary-block');
    append(res, div('sb-title', t('RESOURCES')));
    append(
      res,
      statRow(
        'Credits',
        `${report.creditsDelta >= 0 ? '+' : ''}${formatCredits(report.creditsDelta)}`,
        deltaClass(report.creditsDelta),
      ),
      statRow('Balance', formatCredits(state.credits), state.credits < 0 ? 'bad' : ''),
      statRow('Prestige', formatDelta(report.prestigeDelta), deltaClass(report.prestigeDelta)),
      statRow('Standing', t(prestigeTier(state.prestige).name), 'gold'),
    );
    append(grid, res);

    append(this.modal.body, grid);

    // Why readiness moved: the two or three things that did it, each with
    // its concrete cause, then the weakest link and what to do about it.
    // Readiness is the number everything hangs on; it should never move
    // without the player being told why.
    const drivers = report.readinessDrivers ?? [];
    const weakest = weakestLink(state);
    const why = div('summary-why');
    append(why, div('sb-title', t('WHY READINESS MOVED')));
    if (drivers.length === 0) {
      append(why, note('Readiness held steady today.'));
    }
    for (const d of drivers) {
      const row = div(`why-row ${d.impact < 0 ? 'bad' : 'good'}`);
      append(
        row,
        span('why-impact', formatDelta(d.impact, 1)),
        span('why-comp', t(COMPONENT_LABELS[d.component])),
        span('why-cause', tnote(d.cause)),
      );
      append(why, row);
    }
    const weak = div('why-weakest');
    append(
      weak,
      span('why-comp', `${t('Weakest link')}: ${t(COMPONENT_LABELS[weakest.component])} ${Math.round(weakest.value)}%`),
      span('why-cause', t(COMPONENT_ADVICE[weakest.component])),
    );
    append(why, weak);
    append(this.modal.body, why);

    // Casualties get their own emphasis.
    if (report.casualties.length > 0) {
      append(this.modal.body, sectionTitle('CASUALTIES'));
      append(
        this.modal.body,
        note(report.casualties.join(', ')),
      );
    }

    if (report.trainingCompleted.length > 0) {
      append(this.modal.body, sectionTitle('TRAINING COMPLETED'));
      for (const entry of report.trainingCompleted) {
        append(this.modal.body, noteRaw(`· ${entry.crew} — ${t(entry.course)}`));
      }
    }

    if (report.promotions.length > 0) {
      append(this.modal.body, sectionTitle('NOW ELIGIBLE FOR PROMOTION'));
      append(this.modal.body, note(report.promotions.join(', ')));
    }

    if (report.notes.length > 0) {
      const notes = div('summary-notes');
      append(notes, div('sb-title', t('DAY LOG')));
      for (const entry of report.notes) {
        // Classify on the English key so the colour coding is language
        // independent, then render the translated line.
        const bad = /injur|critical|below|error|set back|damaged|Unresolved|FAILURE/i.test(entry.key);
        const good = /funding|SUCCESS|completed/i.test(entry.key);
        append(notes, div(`n${bad ? ' bad' : good ? ' good' : ''}`, tnote(entry)));
      }
      append(this.modal.body, notes);
    }

    const cont = button(tf('BEGIN DAY {n}', { n: report.day + 1 }), 'primary', () =>
      this.modal.close(),
    );
    append(this.modal.foot, ...extras, cont);
    cont.focus();
  }
}

// ===========================================================================
// Pickers — assignment and training
// ===========================================================================

/**
 * Appointing one person to a post.
 *
 * The mirror of the crew picker: posts ranked by how well this person suits
 * them, so the obvious appointment is at the top and an unusual one is still
 * possible further down.
 */
export class PostPickerModal {
  private modal = new Modal(true);

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(crewId: string): void {
    const state = this.api.state();
    const crew = state.crew.find((c) => c.id === crewId);
    if (!crew) return;

    this.modal.open(`${t('APPOINT')} — ${crew.name}`);
    clear(this.modal.body);
    clear(this.modal.foot);

    append(
      this.modal.body,
      noteRaw(
        `${t(SPECIALTIES[crew.primary].name)}. ${t('A post is a function, not a compartment: its people work in every space the job covers, and the ship moves them to whichever of those has work waiting. Posts calling for their trade are listed first.')}`,
      ),
    );

    const list = div('list');
    for (const post of postsByFit(crew)) {
      const fit = postFit(crew, post);
      const strength = postStrength(state, post.id);
      const row = div('row clickable');

      const name = span('name', `${t(post.name)} · ${t(DEPARTMENTS[post.department].short)}`);
      if (fit.tier === 3) name.appendChild(span('badge gold', t('TRADE')));
      else if (fit.tier === 2) name.appendChild(span('badge', t('SECOND TRADE')));
      if (post.id === crew.postId) name.appendChild(span('badge', t('CURRENT')));
      append(row, name);

      // Manning tells the player where the ship is actually short-handed.
      const manning =
        post.billets === null
          ? `${strength}`
          : `${strength} / ${post.billets}`;
      const meta = span('meta', `${manning} · ${post.rooms.length} ${t('spaces')}`);
      if (post.billets !== null && strength < post.billets) meta.style.color = 'var(--warn)';
      append(row, meta);

      row.addEventListener('click', () => {
        this.api.appoint(crew.id, post.id);
        this.modal.close();
      });
      append(list, row);
    }
    append(this.modal.body, list);
  }
}

export class TrainingPickerModal {
  private modal = new Modal(true);

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(crewId: string): void {
    const state = this.api.state();
    const crew = state.crew.find((c) => c.id === crewId);
    if (!crew) return;

    this.modal.open(`${t('TRAINING')} — ${crew.name}`);
    clear(this.modal.body);
    clear(this.modal.foot);

    const check = checkPromotion(crew);
    const pos = positionParts(crew);
    append(
      this.modal.body,
      noteRaw(
        `${rank(crew.rank).code} ${tf(pos.key, { spec: t(pos.spec) })}. ${t('Enrolled crew are unavailable for duty for the whole course — that lost productivity is the real cost, not the credits.')}`,
      ),
    );
    if (check.gate && check.gate.training.length > 0) {
      const missing = check.gate.training.filter((t) => !crew.completedTraining.includes(t));
      if (missing.length > 0) {
        append(
          this.modal.body,
          noteRaw(
            tf('Required for {gate}: {list}', {
              gate: t(check.gate.label),
              list: missing.map((m) => t(trainingCourse(m).name)).join(', '),
            }),
          ),
        );
      }
    }

    const order = suggestedCourses(crew);
    const courses = TRAINING_COURSES.slice().sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );

    const cards = div('cards');
    for (const course of courses) {
      const done = crew.completedTraining.includes(course.id);
      const enrol = canEnrol(state, crew, course.id);
      const days = courseDays(state, course.id);
      const cost = courseCost(state, course.id);

      const card = div('card');
      const ct = div('ct');
      append(ct, span('n', t(course.name)), pill(t(course.category.toUpperCase(), 'coursecat')));
      if (done) ct.appendChild(span('badge gold', t('COMPLETED')));
      append(card, ct, div('desc', t(course.description)));

      append(
        card,
        statRow(
          'Duration',
          tf('{n} days', { n: days }) +
            (days !== course.days ? ` ${tf('(was {n})', { n: course.days })}` : ''),
        ),
        statRow('Cost', formatCredits(cost)),
      );
      if (course.skillGain) {
        const specName =
          course.skillGain.specialty === 'primary'
            ? SPECIALTIES[crew.primary].short
            : SPECIALTIES[course.skillGain.specialty].short;
        const current =
          course.skillGain.specialty === 'primary'
            ? primarySkill(crew)
            : skillOf(crew, course.skillGain.specialty);
        append(
          card,
          statRow(
            tf('{spec} skill', { spec: t(specName) }),
            `${Math.round(current)} → +${course.skillGain.min}–${course.skillGain.max}`,
            'gold',
          ),
        );
      }
      if (course.attrGain) {
        const parts = Object.entries(course.attrGain).map(
          ([k, v]) =>
            `${t(ATTR_LABELS[k as AttrId])} +${(v as [number, number])[0]}–${(v as [number, number])[1]}`,
        );
        append(card, statRow('Attributes', parts.join(', ')));
      }
      if (course.requiresInstructor) {
        append(card, note('Requires a qualified instructor aboard.'));
      }

      const actions = div('btn-row');
      const b = button('ENROL', enrol.ok ? 'primary' : '', () => {
        this.api.enrolCrew(crew.id, course.id);
        this.modal.close();
      });
      b.disabled = !enrol.ok;
      append(actions, b);
      append(card, actions);

      if (!enrol.ok && !done) {
        for (const reason of enrol.reasons) {
          append(card, noteRaw(`· ${t(reason)}`));
        }
      }
      append(cards, card);
    }
    append(this.modal.body, cards);
  }
}
