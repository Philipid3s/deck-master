import type { CrewMember, GameState, PostDef } from '../core/types';
import { portraitElement } from '../render/portrait';
import type { GameApi } from './api';
import { Modal } from './modals';
import { getRoom } from '../data/decks';
import { DEPARTMENTS, SPECIALTIES } from '../data/specialties';
import { postDef } from '../data/posts';
import { rank } from '../data/ranks';
import { isAvailable, statusLabel } from '../core/crew';
import { byPostFit, crewInPost, postFit, postStrength } from '../core/posts';
import { append, button, clear, div, note, noteRaw, sectionTitle, span, statRow } from './dom';
import { t, tf } from '../i18n';

/** As many candidates as the panel shows before it stops being a list. */
const LIST_CAP = 60;

/**
 * Manning a post.
 *
 * The counterpart to the post-picker on a crew member: this starts from the
 * function and offers the people, best suited first. Trade fit ranks above
 * ability on purpose — the question the player is answering is "who should
 * hold this job", and a rested hand of the right trade holds it better than a
 * tired expert from another one.
 */
export class CrewPickerModal {
  private modal = new Modal(true);
  private postId = '';
  /** Off by default: the list opens as the people who fit the trade. */
  private showEveryone = false;

  constructor(private api: GameApi) {}

  get root(): HTMLDivElement {
    return this.modal.root;
  }

  open(postId: string): void {
    this.postId = postId;
    this.showEveryone = false;
    this.modal.open(`${t('ASSIGN PERSONNEL')} — ${t(postDef(postId).name)}`);
    this.render();
  }

  private render(): void {
    const state = this.api.state();
    const post = postDef(this.postId);
    clear(this.modal.body);
    clear(this.modal.foot);

    const held = crewInPost(state, post.id);
    const fit = postStrength(state, post.id);
    append(this.modal.body, sectionTitle('THE POST'));
    append(
      this.modal.body,
      statRow('Department', t(DEPARTMENTS[post.department].name)),
      statRow('Trade', post.specialties.map((s) => t(SPECIALTIES[s].name)).join(' · ')),
      statRow(
        'Spaces covered',
        post.rooms
          .map((id) => `${t(getRoom(id).short)} (D${String(getRoom(id).deck).padStart(2, '0')})`)
          .join(' · '),
      ),
      post.billets === null
        ? statRow('Appointed', `${held.length}`)
        : statRow(
            'Appointed',
            `${held.length} / ${post.billets}`,
            fit < post.billets ? 'warn' : 'good',
          ),
    );
    if (post.billets !== null && fit < post.billets) {
      append(
        this.modal.body,
        note(
          'This post is short of its established strength, so the work it covers goes slower than the ship expects.',
        ),
      );
    }
    append(
      this.modal.body,
      note(
        'A post covers every space its job reaches. Its people are moved to whichever of those spaces has work waiting, so nobody has to be placed compartment by compartment.',
      ),
    );

    const candidates = this.candidates(state, post);
    append(
      this.modal.body,
      sectionTitle(`${t('AVAILABLE PERSONNEL')} — ${candidates.length}`),
      note(
        'Ranked by how well suited they are to this post: the trade it calls for first, then skill, then how much use they would actually be today. Click someone to appoint them.',
      ),
    );

    if (candidates.length === 0) {
      append(
        this.modal.body,
        note('Nobody is available to appoint. Everyone fit already holds this post.'),
      );
    } else {
      append(this.modal.body, this.table(post, candidates));
      if (candidates.length > LIST_CAP) {
        append(
          this.modal.body,
          noteRaw(
            tf('+{n} more, further down the ranking — narrow it with the roster instead.', {
              n: candidates.length - LIST_CAP,
            }),
          ),
        );
      }
    }

    const actions = div('btn-row');
    append(
      actions,
      button(this.showEveryone ? 'ONLY MATCHING TRADES' : 'SHOW EVERY TRADE', '', () => {
        this.showEveryone = !this.showEveryone;
        this.render();
      }),
      button('VIEW ROSTER', '', () => {
        this.modal.close();
        this.api.openRoster({ department: post.department });
      }),
      button('DONE', '', () => this.modal.close()),
    );
    append(this.modal.foot, actions);
  }

  /**
   * Everyone who could be appointed, best fit first. People who already hold
   * the post are left out, and by default so is anyone with no trade or
   * department connection to it at all.
   */
  private candidates(state: GameState, post: PostDef): CrewMember[] {
    return state.crew
      .filter(
        (c) =>
          isAvailable(c) &&
          c.postId !== post.id &&
          (this.showEveryone || postFit(c, post).tier > 0),
      )
      .sort(byPostFit(post));
  }

  private table(post: PostDef, candidates: CrewMember[]): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'roster';

    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    for (const label of ['FIT', 'NAME', 'RANK', 'SPECIALTY', 'SKILL', 'CONDITION', 'POST NOW']) {
      const th = document.createElement('th');
      th.textContent = t(label);
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const c of candidates.slice(0, LIST_CAP)) {
      tbody.appendChild(this.row(post, c));
    }
    table.appendChild(tbody);
    return table;
  }

  private row(post: PostDef, c: CrewMember): HTMLTableRowElement {
    const fit = postFit(c, post);
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    const td = (child: Node | string): HTMLTableCellElement => {
      const cell = document.createElement('td');
      if (typeof child === 'string') cell.textContent = child;
      else cell.appendChild(child);
      tr.appendChild(cell);
      return cell;
    };

    // Fit tier, as a word rather than a number: the player is choosing people,
    // not reading a score.
    const label =
      fit.tier === 3
        ? t('TRADE')
        : fit.tier === 2
          ? t('SECOND TRADE')
          : fit.tier === 1
            ? t('DEPARTMENT')
            : t('OUTSIDE TRADE');
    const chip = span('pill', label);
    if (fit.tier === 3) {
      chip.style.borderColor = 'var(--good)';
      chip.style.color = 'var(--good)';
    } else if (fit.tier === 0) {
      chip.style.opacity = '0.55';
    }
    td(chip);

    const name = span('name with-portrait');
    name.append(portraitElement(c, 1, 'portrait portrait-row'), document.createTextNode(c.name));
    if (c.promotable) name.appendChild(span('badge gold', t('PROMOTE')));
    td(name);

    td(rank(c.rank).code);
    td(t(SPECIALTIES[c.primary].short));
    td(String(Math.round(fit.skill)));

    // One column for condition: output already folds in fatigue and morale.
    const condition = span(
      '',
      `${Math.round(fit.output * 100)}% · ${t(statusLabel(c), 'status')}`,
    );
    if (c.fatigue > 70) condition.style.color = 'var(--alert)';
    else if (c.fatigue > 45) condition.style.color = 'var(--warn)';
    td(condition);

    td(t(postDef(c.postId).short));

    tr.addEventListener('click', () => {
      this.api.appoint(c.id, post.id);
      this.render();
    });
    return tr;
  }
}
