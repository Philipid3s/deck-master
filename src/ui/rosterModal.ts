import type { CrewMember } from '../core/types';
import { portraitElement } from '../render/portrait';
import type { GameApi } from './api';
import { getRoom } from '../data/decks';
import { DEPARTMENTS, DEPT_IDS, SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { shortName } from '../data/names';
import { primarySkill, statusLabel } from '../core/crew';
import { postDef } from '../data/posts';
import { append, button, clear, div, note, noteRaw, span } from './dom';
import { t, tf } from '../i18n';
import { Modal } from './modal';

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
