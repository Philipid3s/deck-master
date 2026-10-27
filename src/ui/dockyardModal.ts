import type { GameState, SupplyId } from '../core/types';
import type { GameApi } from './api';
import { SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
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
import { artElement } from '../render/aircraftArt';
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
import { STATUS_LABELS, isInPort } from '../core/status';
import {
  append,
  attrRow,
  bar,
  button,
  clear,
  div,
  formatCredits,
  note,
  noteRaw,
  pill,
  sectionTitle,
  span,
  statRow,
} from './dom';
import { t, tf } from '../i18n';
import { Modal } from './modal';

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
