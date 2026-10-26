import { clamp, Rng } from './rng';
import type { AttrId, CrewMember, GameState, SpecialtyId } from './types';
import { trainingCourse, TRAINING_COURSES } from '../data/training';
import { grow, isAvailable, skillOf, ATTR_LABELS } from './crew';

export interface EnrolCheck {
  ok: boolean;
  reasons: string[];
}

/** Can this crew member start this course today? */
export function canEnrol(state: GameState, crew: CrewMember, courseId: string): EnrolCheck {
  const course = trainingCourse(courseId);
  const reasons: string[] = [];

  if (crew.trainingId) reasons.push('Already enrolled in a course');
  if (!isAvailable(crew)) reasons.push('Not available for duty');
  if (crew.completedTraining.includes(courseId)) reasons.push('Already completed');
  if (state.credits < courseCost(state, courseId)) reasons.push('Insufficient credits');

  if (course.requires) {
    for (const [attr, min] of Object.entries(course.requires) as [AttrId, number][]) {
      if (crew.attrs[attr] < min) {
        reasons.push(`${ATTR_LABELS[attr]} ${Math.round(crew.attrs[attr])} / ${min} required`);
      }
    }
  }

  if (course.requiresInstructor && !hasQualifiedInstructor(state, crew)) {
    reasons.push('No qualified instructor available aboard');
  }

  return { ok: reasons.length === 0, reasons };
}

/** An instructor is anyone else aboard holding the instructor qualification. */
export function hasQualifiedInstructor(state: GameState, student: CrewMember): boolean {
  return state.crew.some(
    (c) =>
      c.id !== student.id &&
      c.completedTraining.includes('lead-mentor') &&
      isAvailable(c),
  );
}

/** Training Center upgrades shorten every course (spec section 62). */
export function courseDays(state: GameState, courseId: string): number {
  const course = trainingCourse(courseId);
  const level = state.rooms['d3-training']?.level ?? 1;
  const speedup = [0, 0.10, 0.20, 0.30, 0.45][level - 1] ?? 0;
  return Math.max(2, Math.round(course.days * (1 - speedup)));
}

export function courseCost(state: GameState, courseId: string): number {
  void state;
  return trainingCourse(courseId).cost;
}

export function enrol(state: GameState, crew: CrewMember, courseId: string): boolean {
  const check = canEnrol(state, crew, courseId);
  if (!check.ok) return false;
  const cost = courseCost(state, courseId);
  state.credits -= cost;
  crew.trainingId = courseId;
  crew.trainingDaysLeft = courseDays(state, courseId);
  crew.status = 'training';
  crew.taskNote = {
    key: 'Course: {course}',
    tvars: { course: trainingCourse(courseId).name },
  };
  crew.career.push({
    day: state.day,
    key: 'Began {course}',
    tvars: { course: trainingCourse(courseId).name },
  });
  return true;
}

/**
 * Advance every enrolled student by one day and apply gains on completion.
 * Gains are rolled inside the course's declared band and then damped by the
 * progression curve, so training a 90-skill technician is nearly pointless.
 */
export function advanceTraining(
  state: GameState,
  rng: Rng,
): { completed: { crew: string; course: string }[]; inTraining: number } {
  const completed: { crew: string; course: string }[] = [];
  let inTraining = 0;

  for (const crew of state.crew) {
    if (!crew.trainingId) continue;
    inTraining++;
    crew.trainingDaysLeft--;
    crew.fatigue = clamp(crew.fatigue + 1.5, 0, 100);

    if (crew.trainingDaysLeft > 0) continue;

    const course = trainingCourse(crew.trainingId);

    // Morale and stress resistance modulate how much a student takes in.
    const receptiveness = clamp(
      0.6 + (crew.morale / 100) * 0.5 + (crew.traits.adaptability / 100) * 0.25,
      0.5,
      1.35,
    );

    if (course.skillGain) {
      const spec: SpecialtyId =
        course.skillGain.specialty === 'primary' ? crew.primary : course.skillGain.specialty;
      const raw = rng.range(course.skillGain.min, course.skillGain.max) * receptiveness;
      crew.skills[spec] = grow(skillOf(crew, spec), raw);
    }
    if (course.attrGain) {
      for (const [attr, band] of Object.entries(course.attrGain) as [AttrId, [number, number]][]) {
        const raw = rng.range(band[0], band[1]) * receptiveness;
        crew.attrs[attr] = grow(crew.attrs[attr], raw);
      }
    }

    crew.completedTraining.push(course.id);
    crew.trainingId = null;
    crew.status = 'working';
    crew.morale = clamp(crew.morale + 5, 0, 100);
    crew.career.push({
      day: state.day,
      key: 'Completed {course}',
      tvars: { course: course.name },
    });
    completed.push({ crew: crew.name, course: course.name });
  }

  return { completed, inTraining };
}

/** Courses worth showing for a given crew member, best fit first. */
export function suggestedCourses(crew: CrewMember): string[] {
  return TRAINING_COURSES.filter((c) => !crew.completedTraining.includes(c.id))
    .sort((a, b) => {
      const relevance = (id: string) => {
        const course = trainingCourse(id);
        if (course.skillGain?.specialty === 'primary') return 3;
        if (course.skillGain?.specialty === crew.primary) return 4;
        if (course.category === 'basic') return 2;
        if (course.category === 'leadership') return crew.rank >= 2 ? 3 : 0;
        return 1;
      };
      const diff = relevance(b.id) - relevance(a.id);
      if (diff !== 0) return diff;
      return a.days - b.days;
    })
    .map((c) => c.id);
}

// ---------------------------------------------------------------------------
// Mentoring (spec section 31)
// ---------------------------------------------------------------------------

export function canMentor(mentor: CrewMember): boolean {
  return (
    mentor.attrs.leadership >= 45 &&
    mentor.attrs.experience >= 50 &&
    isAvailable(mentor) &&
    !mentor.trainingId
  );
}

/** Senior crew pass skill to juniors in the same room, at a cost to their own output. */
export function runMentoring(state: GameState): number {
  let pairs = 0;
  for (const mentor of state.crew) {
    if (!mentor.mentorOf) continue;
    const student = state.crew.find((c) => c.id === mentor.mentorOf);
    if (!student || !isAvailable(student) || !canMentor(mentor)) continue;

    const transfer =
      clamp((mentor.attrs.leadership + mentor.attrs.experience) / 200, 0.2, 1) *
      clamp((skillOf(mentor, student.primary) - skillOf(student, student.primary)) / 40, 0, 1.4);

    if (transfer <= 0) continue;
    student.skills[student.primary] = grow(skillOf(student, student.primary), transfer * 1.2);
    student.attrs.experience = grow(student.attrs.experience, transfer * 0.9);
    student.morale = clamp(student.morale + 0.6, 0, 100);
    mentor.fatigue = clamp(mentor.fatigue + 1.8, 0, 100);
    mentor.status = 'mentoring';
    pairs++;
  }
  return pairs;
}

/** Juniors in the same room as the mentor, sorted by how much they'd gain. */
export function mentoringCandidates(state: GameState, mentor: CrewMember): CrewMember[] {
  return state.crew
    .filter(
      (c) =>
        c.id !== mentor.id &&
        c.rank < mentor.rank &&
        skillOf(c, c.primary) < skillOf(mentor, c.primary) - 8 &&
        isAvailable(c),
    )
    .sort((a, b) => skillOf(a, a.primary) - skillOf(b, b.primary));
}
