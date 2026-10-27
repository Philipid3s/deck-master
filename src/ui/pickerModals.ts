import type { AttrId } from '../core/types';
import type { GameApi } from './api';
import { DEPARTMENTS, SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { TRAINING_COURSES, trainingCourse } from '../data/training';
import { ATTR_LABELS, checkPromotion, positionParts, primarySkill, skillOf } from '../core/crew';
import { postFit, postStrength, postsByFit } from '../core/posts';
import { canEnrol, courseCost, courseDays, suggestedCourses } from '../core/training';
import {
  append,
  button,
  clear,
  div,
  formatCredits,
  note,
  noteRaw,
  pill,
  span,
  statRow,
} from './dom';
import { t, tf } from '../i18n';
import { Modal } from './modal';

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
