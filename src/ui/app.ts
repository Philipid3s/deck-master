import type { DailyReport, GameState, Tempo } from '../core/types';
import { AlertDropdown, JournalPanel } from './journal';
import { writeJournal, type AlertAction } from '../core/alerts';
import { CouncilModal } from './councilModal';
import { ensureCouncil, recordDecision } from '../core/council';
import type { GameApi } from './api';
import { DeckView, type HitTarget } from '../render/deckView';
import { MiniMap } from '../render/miniMap';
import { DECKS } from '../data/decks';
import { rank } from '../data/ranks';
import { endDay, setRest } from '../core/simulation';
import { appointToPost } from '../core/posts';
import { postDef } from '../data/posts';
import { resolveEvent } from '../core/events';
import { enrol } from '../core/training';
import { promote } from '../core/crew';
import { startMission } from '../core/missions';
import { relocateAircraft } from '../core/aircraft';
import { Rng } from '../core/rng';
import { newCampaign } from '../core/newGame';
import { autosave, saveGame } from '../core/save';
import { ContextPanel } from './contextPanel';
import { TaskingModal } from './taskingModal';
import { AircrewPickerModal } from './aircrewModal';
import { CrewPickerModal } from './crewPickerModal';
import { assignAircrew, autoCrew, clearSeat } from '../core/aircrew';
import { computeTasking } from '../core/tasking';
import { EventCards } from './eventCards';
import { DockyardModal } from './dockyardModal';
import { MissionModal } from './missionModal';
import { RosterModal } from './rosterModal';
import { SummaryModal } from './summaryModal';
import { PostPickerModal, TrainingPickerModal } from './pickerModals';
import { append, button, clear, div, span } from './dom';
import { LOCALES, LOCALE_NAMES, getLocale, onLocaleChange, setLocale, t, tf, tnote } from '../i18n';
import { shipAudio } from './audio';
import { DebriefModal, renderDeploymentPanel } from './deployment';
import { Tutorial, tutorialSeen } from './tutorial';
import { renderWatchBill } from './watchBill';
import { applyWatchBill, setWatchPolicy, WATCH_POLICY_LABELS } from '../core/watch';
import { DEPLOYMENT_DAYS, isDeployment } from '../core/deployment';
import { eventDef } from '../data/events';
import { showTitleScreen } from './titleScreen';
import { downloadSave, saveFileName } from './saveFile';
import {
  renderBottomMetrics,
  renderDeckCaption,
  renderLegend,
  renderReadout,
  renderStatusBar,
} from './shipStatus';
import { renderHoverTooltip } from './hoverTooltip';
import { flightOpsAuto, flightOpsBanner, setFlightOpsAuto } from './flightOps';

const TEMPOS: Tempo[] = ['low', 'normal', 'high', 'maximum'];

export class App implements GameApi {
  private gameState: GameState;
  private deckView!: DeckView;
  private miniMap!: MiniMap;
  private context!: ContextPanel;
  private events!: EventCards;

  private roster!: RosterModal;
  private missions!: MissionModal;
  private dockyard!: DockyardModal;
  private summary!: SummaryModal;
  private postPicker!: PostPickerModal;
  private trainingPicker!: TrainingPickerModal;
  private tasking!: TaskingModal;
  private aircrewPicker!: AircrewPickerModal;
  private crewPicker!: CrewPickerModal;
  private council!: CouncilModal;

  private hudDay!: HTMLElement;
  private hudPhase!: HTMLElement;
  private tempoButtons: HTMLButtonElement[] = [];
  private deckCaption!: HTMLDivElement;
  private readout!: HTMLDivElement;
  private bottomMetrics!: HTMLDivElement;
  private tooltip!: HTMLDivElement;
  private endDayBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;
  private exportBtn!: HTMLButtonElement;
  private soundBtn!: HTMLButtonElement;
  private ordersHost!: HTMLDivElement;
  private ordersPanel!: HTMLDivElement;
  private watchHost!: HTMLDivElement;
  private debrief!: DebriefModal;
  private tutorial: Tutorial | null = null;
  private alertMenu!: AlertDropdown;
  private stageEl!: HTMLDivElement;
  private showBanner: HTMLDivElement | null = null;
  private journal!: JournalPanel;
  private tempoLabel!: HTMLSpanElement;
  private stageHint!: HTMLDivElement;
  private legendHost!: HTMLDivElement;
  private statusBar!: HTMLDivElement;
  private langButtons: HTMLButtonElement[] = [];
  private panelHeads = new Map<string, HTMLDivElement>();
  private navButtons: [string, HTMLButtonElement][] = [];
  private toastNode!: HTMLDivElement;
  private toastTimer = 0;

  /**
   * Nothing in this game advances on its own. The turn is a day, and it only
   * ends when the player says so — there is no clock and no timer anywhere.
   */

  constructor(private host: HTMLElement) {
    this.gameState = newCampaign();
    showTitleScreen(this.host, (state) => {
      this.gameState = state;
      this.buildGame();
    });
  }

  state(): GameState {
    return this.gameState;
  }

  view(): DeckView {
    return this.deckView;
  }

  // =======================================================================
  // Shell
  // =======================================================================

  private buildGame(): void {
    clear(this.host);
    ensureCouncil(this.gameState);

    // ---- Top bar --------------------------------------------------------
    const topbar = div('topbar');
    append(topbar, span('ship', this.gameState.shipName));
    this.hudDay = span('day', '');
    this.hudPhase = span('phase', '');
    append(topbar, this.hudDay, this.hudPhase);

    const tempoWrap = div('tempo-group');
    this.tempoButtons = TEMPOS.map((t) => {
      const b = document.createElement('button');
      b.textContent = t.toUpperCase();
      b.title = tempoTooltip(t);
      b.addEventListener('click', () => this.setTempo(t));
      tempoWrap.appendChild(b);
      return b;
    });
    this.tempoLabel = span('', t('TEMPO'));
    append(topbar, this.tempoLabel, tempoWrap);

    append(topbar, div('spacer'));

    // Language toggle, mirroring the tempo control's styling.
    const langWrap = div('tempo-group');
    this.langButtons = LOCALES.map((code) => {
      const b = document.createElement('button');
      b.textContent = code.toUpperCase();
      b.title = LOCALE_NAMES[code];
      b.addEventListener('click', () => setLocale(code));
      langWrap.appendChild(b);
      return b;
    });
    append(topbar, langWrap);

    // The journal: the ship's log.
    this.journal = new JournalPanel(() => this.gameState);
    append(topbar, this.journal.button);
    document.body.appendChild(this.journal.root);

    this.soundBtn = button('', '', () => {
      shipAudio.unlock();
      shipAudio.setMuted(!shipAudio.muted);
      this.renderStaticChrome();
    });
    this.soundBtn.classList.add('sound-toggle');
    append(topbar, this.soundBtn);

    this.saveBtn = button('SAVE', '', () => {
      if (saveGame(this.gameState)) this.toast('Campaign saved');
      else this.toast('Could not save — browser storage unavailable');
    });
    // The same campaign as a file, to keep or to carry to another browser.
    this.exportBtn = button('EXPORT', '', () => {
      downloadSave(this.gameState);
      this.toast(tf('Campaign written to {file}', { file: saveFileName(this.gameState) }));
    });
    append(topbar, this.saveBtn, this.exportBtn);
    this.endDayBtn = button('END DAY', 'primary', () => this.endDay());
    append(topbar, this.endDayBtn);

    // ---- Carrier status -------------------------------------------------
    // Where the ship is in the mission cycle decides what the player may do
    // today, so it gets its own bar rather than a chip in the corner.
    this.statusBar = div('statusbar');

    // ---- Main -----------------------------------------------------------
    const main = div('main');
    const stage = div('stage');
    this.stageEl = stage;

    const canvas = document.createElement('canvas');
    canvas.id = 'deck-canvas';
    append(stage, canvas);

    this.deckCaption = div('deck-caption');
    append(stage, this.deckCaption);
    this.stageHint = div('stage-hint', '');
    append(stage, this.stageHint);

    this.tooltip = div('tooltip');
    append(stage, this.tooltip);

    this.alertMenu = new AlertDropdown(() => this.gameState, (a) => this.handleAlert(a));
    append(stage, this.alertMenu.root);


    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      this.lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });

    // ---- Sidebar --------------------------------------------------------
    const sidebar = div('sidebar');

    const mapPanel = panel(t('CARRIER OVERVIEW'));
    this.panelHeads.set('CARRIER OVERVIEW', mapPanel.head);
    const miniCanvas = document.createElement('canvas');
    miniCanvas.id = 'minimap-canvas';
    append(mapPanel.body, miniCanvas);
    append(sidebar, mapPanel.root);

    const ordersPanel = panel(t('DEPLOYMENT ORDERS'));
    this.panelHeads.set('DEPLOYMENT ORDERS', ordersPanel.head);
    this.ordersHost = ordersPanel.body;
    this.ordersPanel = ordersPanel.root;
    append(sidebar, ordersPanel.root);

    const watchPanel = panel(t('WATCH BILL'));
    this.panelHeads.set('WATCH BILL', watchPanel.head);
    this.watchHost = watchPanel.body;
    append(sidebar, watchPanel.root);

    const readoutPanel = panel(t('SHIP STATUS'));
    this.panelHeads.set('SHIP STATUS', readoutPanel.head);
    this.readout = div('readout');
    append(readoutPanel.body, this.readout);
    append(sidebar, readoutPanel.root);

    // The legend is reference material: it goes last.
    const legendPanel = panel(t('LEGEND'));
    this.panelHeads.set('LEGEND', legendPanel.head);
    this.legendHost = legendPanel.body;
    append(sidebar, legendPanel.root);

    append(main, stage, sidebar);

    // ---- Bottom bar -----------------------------------------------------
    const bottombar = div('bottombar');
    this.bottomMetrics = div();
    this.bottomMetrics.style.display = 'flex';
    this.bottomMetrics.style.alignItems = 'center';
    append(bottombar, this.bottomMetrics, div('spacer'));
    this.navButtons = [
      ['COUNCIL', button('COUNCIL', '', () => this.openCouncil())],
      ['TASKING', button('TASKING', '', () => this.openTasking())],
      ['STAFF', button('STAFF', '', () => this.openRoster())],
      ['MISSIONS', button('MISSIONS', '', () => this.openMissions())],
      ['DEVELOPMENT', button('DEVELOPMENT', '', () => this.openDockyard())],
    ];
    append(bottombar, ...this.navButtons.map(([, b]) => b));

    append(this.host, topbar, this.statusBar, main, bottombar);

    // ---- Views and panels ----------------------------------------------
    this.deckView = new DeckView(canvas, this.gameState);
    this.deckView.onSelect = (t) => this.openContext(t);
    this.deckView.onDeckChange = () => this.renderDeckCaption();
    this.deckView.onShowChange = (running) => {
      // The deck gets the whole stage while the wing flies.
      this.stageEl.classList.toggle('flightops', running);
      if (!running) {
        this.showBanner?.remove();
        this.showBanner = null;
        this.renderDeckCaption();
      }
    };

    this.miniMap = new MiniMap(miniCanvas, this.gameState);
    this.miniMap.onSelect = (deck) => {
      this.deckView.setDeck(deck);
      this.renderDeckCaption();
    };

    this.context = new ContextPanel(this);
    append(stage, this.context.root);

    this.events = new EventCards(this);
    append(stage, this.events.root);

    this.roster = new RosterModal(this);
    this.missions = new MissionModal(this, (id) => this.acceptMission(id));
    this.dockyard = new DockyardModal(this);
    this.summary = new SummaryModal(() => this.afterSummary());
    this.postPicker = new PostPickerModal(this);
    this.trainingPicker = new TrainingPickerModal(this);
    this.tasking = new TaskingModal(this);
    this.aircrewPicker = new AircrewPickerModal(this);
    this.crewPicker = new CrewPickerModal(this);
    this.council = new CouncilModal(this);
    this.debrief = new DebriefModal(
      () => this.continueAsCareer(),
      () => location.reload(),
    );

    append(
      document.body,
      this.roster.root,
      this.missions.root,
      this.dockyard.root,
      this.summary.root,
      this.postPicker.root,
      this.trainingPicker.root,
      this.tasking.root,
      this.aircrewPicker.root,
      this.crewPicker.root,
      this.debrief.root,
      this.council.root,
    );

    this.toastNode = div('tooltip');
    this.toastNode.style.left = '50%';
    this.toastNode.style.top = '64px';
    this.toastNode.style.transform = 'translateX(-50%)';
    this.toastNode.style.textAlign = 'center';
    append(stage, this.toastNode);

    this.attachKeys();
    // Every button answers with a soft tick.
    document.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('button')) shipAudio.click();
    });
    globalThis.addEventListener('resize', () => {
      this.deckView.resize();
      this.deckView.fitDeck();
      this.miniMap.resize();
    });

    onLocaleChange(() => this.relocalise());

    this.deckView.setDeck(1);
    this.refresh();
    this.loop(0);
    // A new captain's first deployment starts with the guided first day.
    if (isDeployment(this.gameState) && this.gameState.day === 1 && !tutorialSeen()) {
      this.tutorial = new Tutorial({
        state: () => this.gameState,
        view: () => this.deckView,
        taskingOpen: () => this.tasking.isOpen,
      });
      this.tutorial.start();
    }
    // A finished deployment loaded from a save goes straight to its debrief.
    if (this.gameState.campaignEnd && isDeployment(this.gameState)) this.debrief.open(this.gameState);
  }

  private attachKeys(): void {
    globalThis.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      // The flight-operations sequence: any of the usual keys skips it.
      if (this.deckView.showRunning) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          this.deckView.skipShow();
        }
        return;
      }

      // With a dialog up, Escape closes it and nothing else reaches the deck.
      const dialogs = document.querySelectorAll<HTMLButtonElement>('.overlay:not(.hidden) .close-x');
      if (dialogs.length > 0) {
        if (e.key === 'Escape') dialogs[dialogs.length - 1]!.click();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.deckView.setDeck(this.deckView.deckIndex - 1);
          this.renderDeckCaption();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.deckView.setDeck(this.deckView.deckIndex + 1);
          this.renderDeckCaption();
          break;
        case 'Escape':
          if (this.alertMenu.isOpen) this.alertMenu.setOpen(false);
          else if (this.journal.isOpen) this.journal.toggle(false);
          else if (this.context.isOpen) this.closeContext();
          break;
        case 'j':
        case 'J':
          this.journal.toggle();
          break;
        case 'Enter':
          if (this.gameState.pendingEvents.length === 0) this.endDay();
          break;
        case 'f':
        case 'F':
          this.deckView.fitDeck();
          break;
        case 's':
        case 'S':
          this.openRoster();
          break;
        case 'm':
        case 'M':
          this.openMissions();
          break;
        case 'a':
        case 'A':
          this.openTasking();
          break;
        case 'c':
        case 'C':
          this.openCouncil();
          break;
        default:
          if (e.key >= '1' && e.key <= '8') {
            this.deckView.setDeck(Number(e.key));
            this.renderDeckCaption();
          }
      }
    });
  }

  // =======================================================================
  // Frame loop
  // =======================================================================

  private lastFrame = 0;

  private loop = (time: number): void => {
    const dt = this.lastFrame === 0 ? 0.016 : Math.min(0.05, (time - this.lastFrame) / 1000);
    this.lastFrame = time;

    // Presentation only. No game state is touched here — the ship is drawn,
    // crew walk toward wherever the last resolved day put them, and nothing
    // advances until END DAY.
    this.deckView.frame(time);
    shipAudio.setDeck(this.deckView.deckIndex);
    shipAudio.tick(dt);
    this.tutorial?.tick();
    this.miniMap.frame(this.deckView.deckIndex, dt);
    this.renderTooltip();

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastNode.classList.remove('show');
    }

    requestAnimationFrame(this.loop);
  };

  // =======================================================================
  // Rendering the chrome
  // =======================================================================

  refresh(): void {
    this.miniMap.setState(this.gameState);
    this.renderStaticChrome();
    renderLegend(this.legendHost);
    renderDeploymentPanel(this.ordersHost, this.gameState);
    renderWatchBill(this.watchHost, this.gameState, (depts, policy) => {
      let recalled = 0;
      for (const d of depts) recalled += setWatchPolicy(this.gameState, d, policy);
      // Takes effect at once: today's rota is the one the day is played with.
      const moved = applyWatchBill(this.gameState);
      moved.returned += recalled;
      this.toast(
        tf('Watch bill: {policy} — {down} stood down, {up} back on duty', {
          policy: t(WATCH_POLICY_LABELS[policy]),
          down: moved.stoodDown,
          up: moved.returned,
        }),
      );
      this.refresh();
    });
    this.ordersPanel.style.display = isDeployment(this.gameState) ? '' : 'none';
    this.renderDeckCaption();
    this.renderReadout();
    renderBottomMetrics(this.bottomMetrics, this.gameState);
    this.renderTempo();
    this.events.render();
    this.frameAroundEvents();
    if (this.context.isOpen) this.context.render();
    this.renderDay();
    renderStatusBar(this.statusBar, this.gameState);
    this.alertMenu.render();
    this.journal.render();
    shipAudio.setShip(this.gameState.status, computeTasking(this.gameState).flyable > 0);
    this.endDayBtn.disabled = this.gameState.campaignEnd !== null;
    this.endDayBtn.textContent =
      this.gameState.pendingEvents.length > 0
        ? tf('END DAY ({n} PENDING)', { n: this.gameState.pendingEvents.length })
        : t('END DAY');
  }

  /**
   * Keep the deck framed above the decision cards. Only re-frames when the
   * space the cards take changes, so it never fights the player's camera.
   */
  private frameAroundEvents(): void {
    const inset = this.events.root.offsetHeight > 0 ? this.events.root.offsetHeight + 36 : 0;
    if (Math.abs(inset - this.deckView.insetBottom) < 24) return;
    this.deckView.insetBottom = inset;
    this.deckView.fitDeck();
  }

  /** Chrome that is not rebuilt every refresh but must follow the language. */
  private renderStaticChrome(): void {
    this.tempoLabel.textContent = t('TEMPO');
    this.saveBtn.textContent = t('SAVE');
    this.exportBtn.textContent = t('EXPORT');
    this.exportBtn.title = t('Download the campaign as a file');
    this.soundBtn.textContent = shipAudio.muted ? t('SOUND OFF') : t('SOUND ON');
    this.soundBtn.title = t('Toggle ambient sound');
    this.stageHint.textContent = t(
      'DRAG to pan · WHEEL to zoom · SHIFT+WHEEL or ↑↓ to change deck · CLICK a room, person or aircraft',
    );
    this.tempoButtons.forEach((b, i) => {
      b.textContent = t(TEMPOS[i]!.toUpperCase(), 'tempo');
      b.title = t(tempoTooltip(TEMPOS[i]!));
    });
    this.langButtons.forEach((b, i) => {
      b.classList.toggle('active', LOCALES[i] === getLocale());
    });
    for (const [key, node] of this.panelHeads) {
      node.textContent = t(key);
    }
    for (const [key, node] of this.navButtons) {
      node.textContent = t(key);
    }
  }

  /** The turn indicator. A day, not a time. */
  private renderDay(): void {
    this.hudDay.textContent = isDeployment(this.gameState)
      ? tf('DAY {n} / {total}', { n: Math.min(this.gameState.day, DEPLOYMENT_DAYS), total: DEPLOYMENT_DAYS })
      : tf('DAY {n}', { n: this.gameState.day });
    this.hudPhase.textContent =
      this.gameState.pendingEvents.length > 0 ? t('DECISIONS PENDING') : t('ORDERS OF THE DAY');
  }

  private renderDeckCaption(): void {
    renderDeckCaption(this.deckCaption, this.deckView.deckIndex, this.gameState);
  }

  private renderReadout(): void {
    renderReadout(this.readout, this.gameState, () => this.openTasking());
  }

  private renderTooltip(): void {
    renderHoverTooltip(this.tooltip, this.deckView.hover, this.gameState, this.lastMouse);
  }

  private renderTempo(): void {
    this.tempoButtons.forEach((b, i) => {
      b.classList.toggle('active', TEMPOS[i] === this.gameState.tempo);
    });
  }

  /** Re-render everything after a language change. */
  private relocalise(): void {
    this.refresh();
    this.tutorial?.render();
    if (this.roster.isOpen) this.roster.render();
    if (this.tasking.isOpen) this.tasking.render();
    if (this.council.isOpen) this.council.render();
  }

  private lastMouse = { x: 0, y: 0 };

  // =======================================================================
  // GameApi
  // =======================================================================

  openContext(target: HitTarget): void {
    if (!target) {
      this.context.close();
      return;
    }
    if (target.kind !== 'crew') this.deckView.spotlightCrewId = null;
    this.deckView.selected = target;
    this.context.show(target);
  }

  closeContext(): void {
    this.context.close();
    this.deckView.selected = null;
    this.deckView.spotlightCrewId = null;
  }

  focusCrew(crewId: string): void {
    const crew = this.gameState.crew.find((c) => c.id === crewId);
    if (!crew) return;
    // Camera jumps to the person's physical location (spec section 87).
    this.deckView.focusTile(crew.loc.deck, crew.loc.x, crew.loc.y, 2.6);
    this.deckView.spotlightCrewId = crewId;
    this.renderDeckCaption();
    this.openContext({ kind: 'crew', id: crewId });
  }

  focusRoom(roomId: string): void {
    this.deckView.focusRoom(roomId);
    this.renderDeckCaption();
    this.openContext({ kind: 'room', id: roomId });
  }

  appoint(crewId: string, postId: string): void {
    if (appointToPost(this.gameState, crewId, postId)) {
      this.toast(tf('Appointed to {post}', { post: t(postDef(postId).name) }));
      this.refresh();
    } else {
      this.toast('Cannot reappoint right now');
    }
  }

  toggleRest(crewId: string): void {
    const crew = this.gameState.crew.find((c) => c.id === crewId);
    if (!crew) return;
    const resting = crew.status !== 'resting';
    if (setRest(this.gameState, crewId, resting)) {
      this.toast(
        resting
          ? tf('{name} stood down to rest', { name: crew.name })
          : tf('{name} returned to duty', { name: crew.name }),
      );
      this.refresh();
    }
  }

  enrolCrew(crewId: string, courseId: string): void {
    const crew = this.gameState.crew.find((c) => c.id === crewId);
    if (!crew) return;
    if (enrol(this.gameState, crew, courseId)) {
      this.toast(
        tf('{name} enrolled — unavailable for {days} days', {
          name: crew.name,
          days: crew.trainingDaysLeft,
        }),
      );
      this.refresh();
    } else {
      this.toast('Cannot enrol — requirements not met');
    }
  }

  promoteCrew(crewId: string): void {
    const crew = this.gameState.crew.find((c) => c.id === crewId);
    if (!crew) return;
    if (promote(this.gameState, crew)) {
      this.toast(
        tf('{name} promoted to {rank}', { name: crew.name, rank: t(rank(crew.rank).name) }),
      );
      this.refresh();
    } else {
      this.toast('Promotion requirements not met');
    }
  }

  setMentor(mentorId: string, studentId: string | null): void {
    const mentor = this.gameState.crew.find((c) => c.id === mentorId);
    if (!mentor) return;
    // One mentor per student: clear any other pairing with this student.
    if (studentId) {
      for (const c of this.gameState.crew) {
        if (c.mentorOf === studentId) c.mentorOf = null;
      }
    }
    mentor.mentorOf = studentId;
    if (!studentId) mentor.status = 'working';
    this.toast(studentId ? 'Mentoring programme started' : 'Mentoring ended');
    this.refresh();
  }

  moveAircraft(aircraftId: string, toDeck: 1 | 2): void {
    const a = this.gameState.aircraft.find((x) => x.id === aircraftId);
    if (!a) return;
    if (relocateAircraft(this.gameState, a, toDeck)) {
      this.toast(
        tf('#{tail} moved to {place}', {
          tail: a.tail,
          place: toDeck === 1 ? t('the flight deck') : t('the hangar'),
        }),
      );
      this.deckView.setDeck(toDeck);
      this.renderDeckCaption();
      this.refresh();
    } else {
      this.toast('No free spot on that deck');
    }
  }

  openRoster(filter?: { roomId?: string; department?: string }): void {
    this.roster.open(filter);
  }

  openMissions(): void {
    this.missions.open();
  }

  openCouncil(): void {
    this.council.open();
  }

  openTasking(): void {
    this.tasking.open();
  }

  openDockyard(): void {
    this.dockyard.open();
  }

  assignAircrew(aircraftId: string, seat: number, crewId: string): void {
    if (assignAircrew(this.gameState, aircraftId, seat, crewId)) {
      this.refresh();
      this.tasking.render();
    } else {
      this.toast('That seat cannot be filled by this crew member');
    }
  }

  clearAircrewSeat(aircraftId: string, seat: number): void {
    clearSeat(this.gameState, aircraftId, seat);
    this.refresh();
    this.tasking.render();
  }

  autoCrewWing(): void {
    autoCrew(this.gameState);
    this.toast('Aircrew posted across the wing');
    this.refresh();
    this.tasking.render();
  }

  openAircrewPicker(aircraftId: string): void {
    this.aircrewPicker.open(aircraftId);
  }

  openPostPicker(crewId: string): void {
    this.postPicker.open(crewId);
  }

  openCrewPicker(postId: string): void {
    this.crewPicker.open(postId);
  }

  openTrainingPicker(crewId: string): void {
    this.trainingPicker.open(crewId);
  }

  setTempo(tempo: Tempo): void {
    this.gameState.tempo = tempo;
    this.renderTempo();
    this.renderReadout();
  }

  answerEvent(index: number, choiceIndex: number): void {
    const rng = Rng.stream(this.gameState.seed, this.gameState.day, `choice-${index}-${choiceIndex}`);
    // The council sees what the captain decided, before the card is gone.
    recordDecision(this.gameState, index, choiceIndex);
    const pending = this.gameState.pendingEvents[index];
    const chosen = pending ? eventDef(pending.defId)?.choices[choiceIndex] : undefined;
    if (pending && chosen) {
      writeJournal(this.gameState, this.gameState.day, [
        { key: 'Decision — {title}: {choice}', tvars: { title: pending.title, choice: chosen.label } },
      ]);
    }
    const result = resolveEvent(this.gameState, rng, index, choiceIndex);
    for (const entry of result.notes) this.toast(tnote(entry));
    if (result.casualties.length > 0) {
      this.toast(tf('Casualties: {list}', { list: result.casualties.join(', ') }));
    }
    this.refresh();
  }

  private acceptMission(id: string): void {
    if (startMission(this.gameState, id)) {
      this.toast('Mission accepted');
      this.refresh();
    } else {
      this.toast('Cannot accept that mission');
    }
  }

  endDay(): void {
    if (this.gameState.campaignEnd) {
      if (isDeployment(this.gameState)) this.debrief.open(this.gameState);
      else this.toast('The campaign has ended.');
      return;
    }
    const report = endDay(this.gameState);
    autosave(this.gameState);
    shipAudio.bell(2);
    this.refresh();
    const flights = report.flights ?? [];
    const openSummary = () => this.summary.open(report, this.gameState, this.summaryExtras(report));
    if (flights.length > 0 && flightOpsAuto()) this.playFlightOps(report, openSummary);
    else openSummary();
  }

  private afterSummary(): void {
    this.refresh();
    // A new day: the bosun's call, or the general alarm if it starts badly.
    const emergency = this.gameState.pendingEvents.some(
      (p) => p.category === 'emergency' || (eventDef(p.defId)?.priority ?? 0) >= 2,
    );
    if (this.gameState.campaignEnd && isDeployment(this.gameState)) {
      shipAudio.bell(8);
      this.debrief.open(this.gameState);
      return;
    }
    if (emergency) shipAudio.klaxon();
    else shipAudio.pipe();
    // Draw attention to whichever deck now has a problem.
    const alertDeck = this.worstDeck();
    if (alertDeck !== null && alertDeck !== this.deckView.deckIndex) {
      this.toast(tf('Attention required on deck {n}', { n: String(alertDeck).padStart(2, '0') }));
    }
  }

  private worstDeck(): number | null {
    let worstDeck: number | null = null;
    let worstValue = 100;
    for (const deck of DECKS) {
      for (const room of deck.rooms) {
        const rs = this.gameState.rooms[room.id];
        if (rs && rs.condition < worstValue) {
          worstValue = rs.condition;
          worstDeck = deck.index;
        }
      }
    }
    return worstValue < 45 ? worstDeck : null;
  }

  /**
   * Replay the day's flying on the flight deck, with a banner summarising the
   * air tasking order, then carry on.
   */
  private playFlightOps(report: DailyReport, then: () => void): void {
    const flights = report.flights ?? [];
    this.deckView.playFlightShow(
      flights,
      report.day,
      { shot: () => shipAudio.catapultShot(), trap: () => shipAudio.trap() },
      then,
    );
    const show = this.deckView.currentShow();
    if (!show) return;

    const banner = flightOpsBanner(
      report,
      show,
      () => this.deckView.skipShow(),
      () => {
        this.toast('Flight operations will not play automatically. Watch them from the day’s summary.');
        this.deckView.skipShow();
      },
    );
    this.showBanner = banner;
    append(this.stageEl, banner);
  }

  /** Buttons in the daily summary: watch the day's flying, and auto-play. */
  private summaryExtras(report: DailyReport): HTMLElement[] {
    const flights = report.flights ?? [];
    if (flights.length === 0) return [];
    const watch = button('WATCH FLIGHT OPS', '', () => {
      this.summary.suspend();
      this.playFlightOps(report, () => this.summary.resume());
    });
    const auto = button(flightOpsAuto() ? 'AUTO-PLAY: ON' : 'AUTO-PLAY: OFF', '', () => {
      setFlightOpsAuto(!flightOpsAuto());
      auto.textContent = t(flightOpsAuto() ? 'AUTO-PLAY: ON' : 'AUTO-PLAY: OFF');
    });
    auto.title = t('Play the day’s flying automatically when the day ends');
    return [watch, auto];
  }

  /** Go where an alert says the problem is. */
  private handleAlert(a: AlertAction): void {
    const flash = (el: Element | null | undefined) => {
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('flash');
    };
    switch (a.kind) {
      case 'events':
        this.events.expand();
        break;
      case 'event':
        this.events.focus(a.index);
        break;
      case 'council':
        this.openCouncil();
        break;
      case 'roster':
        this.openRoster();
        break;
      case 'tasking':
        this.openTasking();
        break;
      case 'missions':
        this.openMissions();
        break;
      case 'dockyard':
        this.openDockyard();
        break;
      case 'watch':
        flash(this.watchHost.parentElement);
        break;
      case 'orders':
        flash(this.ordersPanel);
        break;
      case 'room':
        this.focusRoom(a.roomId);
        break;
    }
  }

  /**
   * Keep the ship after a deployment: the same crew, wing and standing
   * carry on into an open career with no horizon.
   */
  private continueAsCareer(): void {
    this.gameState.campaign = { mode: 'career' };
    this.gameState.campaignEnd = null;
    this.gameState.flags['bankruptDays'] = 0;
    this.gameState.flags['criticalDays'] = 0;
    autosave(this.gameState);
    this.refresh();
    this.toast('Command continues — open career');
  }

  toast(message: string): void {
    clear(this.toastNode);
    append(this.toastNode, div('tip-title', t(message)));
    this.toastNode.classList.add('show');
    this.toastTimer = 3.4;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function panel(title: string): {
  root: HTMLDivElement;
  body: HTMLDivElement;
  head: HTMLDivElement;
} {
  const root = div('panel');
  const head = div('panel-head', title);
  const body = div('panel-body');
  append(root, head, body);
  return { root, body, head };
}

function tempoTooltip(t: Tempo): string {
  switch (t) {
    case 'low':
      return 'Less fatigue, less wear, fewer accidents — slower mission progress.';
    case 'normal':
      return 'Balanced.';
    case 'high':
      return 'Faster progress and more sorties, at the cost of fatigue, wear and accident risk.';
    case 'maximum':
      return 'Maximum progress. Very high fatigue and wear, high accident risk, bonus prestige if it works.';
  }
}

