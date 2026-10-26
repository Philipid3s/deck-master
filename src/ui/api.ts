import type { GameState, Tempo } from '../core/types';
import type { DeckView, HitTarget } from '../render/deckView';

/**
 * The surface the panels use to talk to the game controller. Keeping it as
 * an interface avoids circular imports between `app.ts` and the panels.
 */
export interface GameApi {
  state(): GameState;
  view(): DeckView;

  /** Redraw the HUD, sidebar and whichever context panel is open. */
  refresh(): void;

  openContext(target: HitTarget): void;
  closeContext(): void;

  focusCrew(crewId: string): void;
  focusRoom(roomId: string): void;

  /** Appoint someone to a post — the function, not the compartment. */
  appoint(crewId: string, postId: string): void;
  toggleRest(crewId: string): void;
  enrolCrew(crewId: string, courseId: string): void;
  promoteCrew(crewId: string): void;
  setMentor(mentorId: string, studentId: string | null): void;
  moveAircraft(aircraftId: string, toDeck: 1 | 2): void;

  /** Aircrew: who is in which seat of which airframe. */
  assignAircrew(aircraftId: string, seat: number, crewId: string): void;
  clearAircrewSeat(aircraftId: string, seat: number): void;
  autoCrewWing(): void;

  openRoster(filter?: { roomId?: string; department?: string }): void;
  openMissions(): void;
  /** The commanding officer's council. */
  openCouncil(): void;
  openDockyard(): void;
  /** Pick a post for a person. */
  openPostPicker(crewId: string): void;
  /** The other direction: pick people for a post. */
  openCrewPicker(postId: string): void;
  openTrainingPicker(crewId: string): void;
  openAircrewPicker(aircraftId: string): void;

  setTempo(tempo: Tempo): void;
  endDay(): void;
  answerEvent(index: number, choiceIndex: number): void;

  toast(message: string): void;
}
