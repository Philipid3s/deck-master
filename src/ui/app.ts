import type { GameState, Tempo } from '../core/types';
import { mechanicRows } from './operationsView';
import { ALERT_SPOTS, alertBoard } from '../core/tasking';
import { DUTIES_BY_ID } from '../data/aircraft';
import type { AircraftDuty, DailyReport } from '../core/types';
import { AlertDropdown, JournalPanel } from './journal';
import { writeJournal, type AlertAction } from '../core/alerts';
import { CouncilModal } from './councilModal';
import { ensureCouncil, recordDecision } from '../core/council';
import type { GameApi } from './api';
import { DeckView, type HitTarget } from '../render/deckView';
import { MiniMap } from '../render/miniMap';
import { PAL, DEPT_ACCENT } from '../render/palette';
import { DECKS, getDeck, getRoom } from '../data/decks';
import { SPECIALTIES } from '../data/specialties';
import { rank } from '../data/ranks';
import { aircraftType } from '../data/aircraft';
import { missionDef } from '../data/missions';
import { newCampaign } from '../core/newGame';
import { endDay, setRest } from '../core/simulation';
import { appointToPost } from '../core/posts';
import { postDef } from '../data/posts';
import { resolveEvent } from '../core/events';
import { enrol } from '../core/training';
import { promote, statusLabel, effectiveness, isAvailable, primarySkill } from '../core/crew';
import { startMission } from '../core/missions';
import { prestigeTier } from '../core/economy';
import { readinessLabel, statusColor } from '../core/readiness';
import { aircraftStatusText, aircraftReadiness, relocateAircraft } from '../core/aircraft';
import { Rng } from '../core/rng';
import { autosave, hasSave, loadAutosave, loadGame, saveGame } from '../core/save';
import { ContextPanel } from './contextPanel';
import { TaskingModal } from './taskingModal';
import { AircrewPickerModal } from './aircrewModal';
import { CrewPickerModal } from './crewPickerModal';
import { assignAircrew, autoCrew, clearSeat } from '../core/aircrew';
import { computeTasking } from '../core/tasking';
import { STATUS_LABELS, isInPort, statusDetail } from '../core/status';
import type { CarrierStatus } from '../core/types';
import { EventCards } from './eventCards';
import {
  DockyardModal,
  MissionModal,
  RosterModal,
  PostPickerModal,
  SummaryModal,
  TrainingPickerModal,
} from './modals';
import {
  append,
  bar,
  button,
  clear,
  div,
  formatCredits,
  note,
  span,
  statRow,
} from './dom';
import {
  LOCALES,
  LOCALE_NAMES,
  getLocale,
  onLocaleChange,
  setLocale,
  t,
  tf,
  tnote,
} from '../i18n';
import { SUPPLY_LABELS } from '../core/economy';
import { shipAudio } from './audio';
import { DebriefModal, renderDeploymentPanel } from './deployment';
import { Tutorial, tutorialSeen } from './tutorial';
import { renderWatchBill } from './watchBill';
import { applyWatchBill, setWatchPolicy, WATCH_POLICY_LABELS } from '../core/watch';
import { COMPONENT_ADVICE, COMPONENT_LABELS, weakestLink } from '../core/readiness';
import { DEPLOYMENT_DAYS, isDeployment } from '../core/deployment';
import type { CampaignMode } from '../core/types';
import { eventDef } from '../data/events';

const TEMPOS: Tempo[] = ['low', 'normal', 'high', 'maximum'];

/** Legend entries, transcribed from the concept art's legend block. */
const LEGEND: [string, string][] = [
  ['CREW', PAL.crew],
  ['AIRCRAFT', PAL.aircraftAccent],
  ['SYSTEM', PAL.system],
  ['SUPPORT', PAL.support],
  ['ELEVATOR', PAL.elevator],
  ['STAIRS / LADDER', PAL.stairs],
];

const STATUS_LEGEND: [string, string][] = [
  ['IDLE', PAL.idle],
  ['WORKING', PAL.working],
  ['TRAINING', PAL.training],
  ['REPAIRING', PAL.repairing],
  ['ALERT', PAL.alert],
];

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
    this.buildTitleScreen();
  }

  state(): GameState {
    return this.gameState;
  }

  view(): DeckView {
    return this.deckView;
  }

  // =======================================================================
  // Title screen
  // =============================================================================

  private buildTitleScreen(): void {
    const screen = div('title-screen');
    const h1 = document.createElement('h1');
    h1.textContent = 'DECK MASTER';
    append(screen, h1, div('sub', 'USS RESOLUTE — CVN 79'));
    const blurb = div('blurb');
    append(screen, blurb);

    const seedLabel = span('', '');
    const hint = note('');

    // The language picker sits on the title screen as well as the top bar,
    // so a French player never has to read an English menu to find it.
    const langRow = div('btn-row');
    const langButtons = LOCALES.map((code) =>
      button(LOCALE_NAMES[code], getLocale() === code ? 'primary' : '', () => {
        setLocale(code);
      }),
    );
    append(langRow, ...langButtons);
    append(screen, langRow);

    const paintTitle = () => {
      blurb.textContent = t(
        'Command a nuclear aircraft carrier one day at a time. The ship is the interface: navigate the decks, inspect the spaces, and manage the people who keep it running. Every decision costs something.',
      );
      seedLabel.textContent = t('CAMPAIGN SEED');
      hint.textContent = t(
        'A seed makes a campaign reproducible — the same seed and the same decisions replay exactly.',
      );
      langButtons.forEach((b, i) => {
        b.className = `btn ${getLocale() === LOCALES[i] ? 'primary' : ''}`.trim();
        b.textContent = LOCALE_NAMES[LOCALES[i]!];
      });
      newBtn.textContent = t('NEW DEPLOYMENT — 30 DAYS');
      careerBtn.textContent = t('OPEN CAREER');
      continueBtn.textContent = t('CONTINUE');
    };
    const stopWatching = onLocaleChange(paintTitle);

    const seedRow = div('seed-row');
    const seedInput = document.createElement('input');
    seedInput.type = 'text';
    seedInput.placeholder = t('random');
    seedInput.style.width = '120px';
    append(seedRow, seedLabel, seedInput);
    append(screen, seedRow);

    const actions = div('btn-row');
    const start = (mode: CampaignMode) => {
      shipAudio.unlock();
      const raw = seedInput.value.trim();
      const seed = raw === '' ? undefined : Number.isFinite(Number(raw))
        ? Number(raw)
        : hashSeed(raw);
      this.gameState = newCampaign(seed, mode);
      stopWatching();
      screen.remove();
      this.buildGame();
    };
    // The deployment is the way in: thirty days, clear orders, a grade.
    // The open career is there for players who want the sandbox.
    const newBtn = button('NEW DEPLOYMENT — 30 DAYS', 'primary', () => start('deployment'));
    const careerBtn = button('OPEN CAREER', '', () => start('career'));

    const continueBtn = button('CONTINUE', '', () => {
      shipAudio.unlock();
      const loaded = loadGame() ?? loadAutosave();
      if (!loaded) {
        this.toast('No save found');
        return;
      }
      this.gameState = loaded;
      stopWatching();
      screen.remove();
      this.buildGame();
    });
    continueBtn.disabled = !hasSave() && loadAutosave() === null;

    append(actions, newBtn, careerBtn, continueBtn);
    append(screen, actions);
    append(screen, hint);

    paintTitle();
    this.host.appendChild(screen);
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
    append(topbar, this.saveBtn);
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
    this.renderLegend();
    renderDeploymentPanel(this.ordersHost, this.gameState);
    renderWatchBill(this.watchHost, this.gameState, (depts, policy) => {
      for (const d of depts) setWatchPolicy(this.gameState, d, policy);
      // Takes effect at once: today's rota is the one the day is played with.
      const moved = applyWatchBill(this.gameState);
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
    this.renderBottomBar();
    this.renderTempo();
    this.events.render();
    this.frameAroundEvents();
    if (this.context.isOpen) this.context.render();
    this.renderDay();
    this.renderStatus();
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

  /**
   * The carrier status bar. Shows the phase, how long is left in it, and
   * plainly states whether anything can be brought aboard.
   */
  private renderStatus(): void {
    const s = this.gameState;
    clear(this.statusBar);
    this.statusBar.className = `statusbar st-${s.status}`;

    append(
      this.statusBar,
      span('sb-label', t(STATUS_LABELS[s.status], 'carrierstatus')),
      span('sb-detail', tnote(statusDetail(s))),
    );

    // Phase pips: passage out, work, passage home.
    const track = div('sb-track');
    const order: CarrierStatus[] = ['outbound', 'onstation', 'inbound'];
    if (s.status !== 'port') {
      const current = order.indexOf(s.status);
      order.forEach((phase, i) => {
        const pip = div(`pip${i < current ? ' done' : i === current ? ' active' : ''}`);
        pip.title = t(STATUS_LABELS[phase], 'carrierstatus');
        append(track, pip);
      });
      append(this.statusBar, track);
    }

    if (s.mission) {
      const def = missionDef(s.mission.defId);
      append(
        this.statusBar,
        span(
          'sb-detail',
          `${t(def.title)} — ${tf('{n} day passage each way', { n: def.transitDays })}`,
        ),
      );
    }

    append(
      this.statusBar,
      span(
        'sb-note',
        isInPort(s)
          ? t('Stores, equipment, airframes and personnel can come aboard')
          : t('Nothing can be brought aboard until the ship is alongside'),
      ),
    );

  }

  /** Chrome that is not rebuilt every refresh but must follow the language. */
  private renderStaticChrome(): void {
    this.tempoLabel.textContent = t('TEMPO');
    this.saveBtn.textContent = t('SAVE');
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

  private renderLegend(): void {
    clear(this.legendHost);
    const legendGrid = div('legend');
    for (const [label, color] of LEGEND) {
      const item = div('item');
      const sw = div('sw');
      sw.style.background = color;
      append(item, sw, span('', t(label, 'legend')));
      append(legendGrid, item);
    }
    append(this.legendHost, legendGrid);

    const statusGrid = div('legend');
    statusGrid.style.marginTop = '7px';
    for (const [label, color] of STATUS_LEGEND) {
      const item = div('item');
      const sw = div('sw');
      sw.style.background = color;
      append(item, sw, span('', t(label, 'legend')));
      append(statusGrid, item);
    }
    append(this.legendHost, div('section-title', t('STATUS')), statusGrid);
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
    clear(this.deckCaption);
    const deck = getDeck(this.deckView.deckIndex);
    append(
      this.deckCaption,
      div('num', tf('DECK {n}', { n: String(deck.index).padStart(2, '0') })),
      div('name', t(deck.short)),
    );
    const list = document.createElement('ol');
    const rooms = deck.rooms
      .filter((r) => r.kind !== 'elevator' && r.kind !== 'stairs')
      .slice(0, 10);
    for (const room of rooms) {
      const li = document.createElement('li');
      li.textContent = t(room.name);
      const rs = this.gameState.rooms[room.id];
      if (rs && rs.condition < 45) li.style.color = PAL.alert;
      list.appendChild(li);
    }
    append(this.deckCaption, list);
  }

  private renderReadout(): void {
    const s = this.gameState;
    clear(this.readout);

    const missionTitle = s.mission
      ? t(missionDef(s.mission.defId).title)
      : t('No active mission');

    append(
      this.readout,
      statRow('CARRIER STATUS', t(STATUS_LABELS[s.status], 'carrierstatus'), statusClass(s.status)),
    );
    if (s.status !== 'port' && s.status !== 'onstation') {
      append(this.readout, statRow('PASSAGE', tnote(statusDetail(s))));
    }
    append(this.readout, statRow('MISSION', missionTitle));
    if (s.mission) {
      const row = div('attr-row');
      append(
        row,
        span('attr-label', t('PROGRESS')),
        bar(s.mission.progress),
        span('attr-value', `${Math.round(s.mission.progress)}`),
      );
      append(this.readout, row);
      // The operation's own mechanic: contacts, raid forecast, tension...
      append(this.readout, ...mechanicRows(s));
    }

    // Today's air tasking: the number the player is actually steering.
    const tasking = computeTasking(s);
    if (s.mission) {
      const cover = div('attr-row');
      append(
        cover,
        span('attr-label', t('OBJECTIVE COVER')),
        bar(Math.min(100, tasking.ratio * 100), statusColor(tasking.ratio * 80)),
        span('attr-value', `${Math.round(tasking.ratio * 100)}`),
      );
      append(this.readout, cover);
    }
    append(
      this.readout,
      statRow(
        'TASKED TO FLY',
        `${tasking.flyable} / ${tasking.sortieCapacity}`,
        tasking.capacityLimited ? 'bad' : '',
      ),
      statRow(
        'ON DECK ALERT',
        `${tasking.alertCount} / ${ALERT_SPOTS}`,
        alertBoard(s).standingBy.length > 0 ? 'warn' : '',
      ),
    );
    const taskingBtn = button('AIR TASKING ORDER', 'wide', () => this.openTasking());
    append(this.readout, taskingBtn);

    append(this.readout, div('divider'));
    append(
      this.readout,
      statRow('PRESTIGE', `${s.prestige}  ★`, 'gold'),
      statRow('STANDING', t(prestigeTier(s.prestige).name), 'gold'),
      statRow('CREDITS', formatCredits(s.credits), s.credits < 0 ? 'bad' : 'gold'),
    );

    append(this.readout, div('divider'));

    const r = s.readiness;
    append(
      this.readout,
      statRow(
        'CARRIER READINESS',
        `${Math.round(r.overall)}%`,
        r.overall >= 74 ? 'good' : r.overall >= 50 ? 'warn' : 'bad',
      ),
      statRow('ASSESSMENT', t(readinessLabel(r.overall), 'readiness')),
    );

    const readyAircraft = s.aircraft.filter((a) => a.state === 'ready').length;
    const availableCrew = s.crew.filter(isAvailable).length;
    const injured = s.crew.filter((c) => c.health !== 'healthy').length;
    const avgMorale = mean(s.crew.map((c) => c.morale));
    const avgFatigue = mean(s.crew.map((c) => c.fatigue));

    append(
      this.readout,
      statRow(
        'AIRCRAFT READY',
        `${readyAircraft} / ${s.aircraft.length}`,
        readyAircraft / Math.max(1, s.aircraft.length) > 0.6 ? 'good' : 'warn',
      ),
      statRow('CREW AVAILABLE', `${availableCrew} / ${s.crew.length}`),
      statRow('CREW MORALE', `${Math.round(avgMorale)}%`, avgMorale >= 60 ? 'good' : 'warn'),
      statRow('CREW FATIGUE', `${Math.round(avgFatigue)}%`, avgFatigue <= 45 ? 'good' : 'bad'),
      statRow('IN MEDICAL', String(injured), injured > 0 ? 'warn' : 'good'),
      statRow('OPEN WORK ORDERS', String(s.workOrders.length), s.workOrders.length > 6 ? 'warn' : ''),
    );

    append(this.readout, div('divider'));
    append(this.readout, div('section-title', t('READINESS BREAKDOWN')));
    const components: [string, number][] = [
      ['Aircraft', r.aircraft],
      ['Crew', r.crew],
      ['Maintenance', r.maintenance],
      ['Engineering', r.engineering],
      ['Operations', r.operations],
      ['Logistics', r.logistics],
      ['Weapons', r.weapons],
      ['Medical', r.medical],
      ['Command', r.command],
    ];
    const worst = Math.min(...components.map(([, v]) => v));
    for (const [label, value] of components) {
      const row = div('attr-row');
      const lbl = span('attr-label', label);
      if (value === worst) lbl.style.color = PAL.alert;
      lbl.textContent = t(label);
      append(row, lbl, bar(value, statusColor(value)), span('attr-value', String(Math.round(value))));
      append(this.readout, row);
    }
    // The weakest component is 40% of overall readiness: name it and say
    // what fixes it, right where the player is looking at the numbers.
    const weakest = weakestLink(s);
    const advice = div('weakest-link');
    append(
      advice,
      div('wl-title', `${t('Weakest link')}: ${t(COMPONENT_LABELS[weakest.component])}`),
      div('wl-body', t(COMPONENT_ADVICE[weakest.component])),
    );
    append(this.readout, advice);
    append(
      this.readout,
      note(
        'Overall readiness blends the weighted mean with the single worst component — one collapsed department drags the whole ship down.',
      ),
    );

    append(this.readout, div('section-title', t('SUPPLIES')));
    for (const [key, value] of Object.entries(s.supplies)) {
      const row = div('attr-row');
      append(
        row,
        span('attr-label', t(SUPPLY_LABELS[key as keyof typeof SUPPLY_LABELS]).toUpperCase()),
        bar(value, statusColor(value)),
        span('attr-value', String(Math.round(value))),
      );
      append(this.readout, row);
    }

    if (s.campaignEnd) {
      append(this.readout, div('divider'));
      const banner = div(
        `outcome-banner ${s.campaignEnd.won ? 'good' : 'bad'}`,
        s.campaignEnd.won ? t('CAMPAIGN WON') : t('COMMAND RELIEVED'),
      );
      append(this.readout, banner, note(s.campaignEnd.reason));
    }
  }

  private renderBottomBar(): void {
    const s = this.gameState;
    clear(this.bottomMetrics);
    const readyAircraft = s.aircraft.filter((a) => a.state === 'ready').length;
    const metrics: [string, string][] = [
      ['AIRCRAFT', `${readyAircraft}/${s.aircraft.length}`],
      ['CREW', `${s.crew.filter(isAvailable).length}/${s.crew.length}`],
      ['READINESS', `${Math.round(s.readiness.overall)}%`],
      ['PRESTIGE', String(s.prestige)],
      ['CREDITS', formatCredits(s.credits)],
      ['SORTIES', String(s.sortieTotal)],
    ];
    for (const [k, v] of metrics) {
      const m = div('metric');
      append(m, span('k', t(k, 'metric')), span('v', v));
      append(this.bottomMetrics, m);
    }
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

  /** Hover readout for rooms, crew and aircraft (spec section 16). */
  private renderTooltip(): void {
    const hover = this.deckView.hover;
    if (!hover) {
      this.tooltip.classList.remove('show');
      return;
    }
    const s = this.gameState;
    clear(this.tooltip);

    const row = (k: string, v: string) => {
      const r = div('tip-row');
      append(r, span('', t(k)), span('', v));
      return r;
    };

    if (hover.kind === 'room') {
      const room = getRoom(hover.id);
      const rs = s.rooms[room.id]!;
      const occupants = s.crew.filter((c) => c.assignmentRoomId === room.id && isAvailable(c)).length;
      const orders = s.workOrders.filter((w) => w.roomId === room.id).length;
      append(this.tooltip, div('tip-title', t(room.name)));
      append(
        this.tooltip,
        row('Personnel', `${occupants} / ${room.capacity}`),
        row('Workload', `${Math.round(rs.workload)}%`),
        row('Efficiency', `${Math.round(rs.efficiency)}%`),
        row('Active jobs', String(orders)),
        row('Equipment', `${Math.round(rs.condition)}%`),
      );
      const accent = DEPT_ACCENT[room.department];
      if (accent) this.tooltip.style.borderColor = accent;
    } else if (hover.kind === 'crew') {
      const c = s.crew.find((x) => x.id === hover.id);
      if (!c) {
        this.tooltip.classList.remove('show');
        return;
      }
      append(this.tooltip, div('tip-title', c.name));
      append(
        this.tooltip,
        row('Rank', rank(c.rank).code),
        row('Specialty', t(SPECIALTIES[c.primary].short)),
        row('Skill', String(Math.round(primarySkill(c)))),
        row('Status', t(statusLabel(c), 'status')),
        row('Morale', `${Math.round(c.morale)}%`),
        row('Fatigue', `${Math.round(c.fatigue)}%`),
        row('Output', `${Math.round(effectiveness(c) * 100)}%`),
      );
      this.tooltip.style.borderColor = SPECIALTIES[c.primary].color;
    } else {
      const a = s.aircraft.find((x) => x.id === hover.id);
      if (!a) {
        this.tooltip.classList.remove('show');
        return;
      }
      const type = aircraftType(a.typeId);
      append(this.tooltip, div('tip-title', `${type.name} #${a.tail}`));
      append(
        this.tooltip,
        row('Status', t(aircraftStatusText(a), 'aircraft')),
        row('Readiness', `${Math.round(aircraftReadiness(a))}%`),
        row('Engine', `${Math.round(a.systems.engine)}%`),
        row('Avionics', `${Math.round(a.systems.avionics)}%`),
        row('Airframe', `${Math.round(a.systems.airframe)}%`),
        row('Fuel', `${Math.round(a.fuel)}%`),
      );
      this.tooltip.style.borderColor = PAL.aircraftAccent;
    }

    // Anchor near the cursor without leaving the stage.
    const stage = this.tooltip.parentElement!.getBoundingClientRect();
    const mx = this.lastMouse.x;
    const my = this.lastMouse.y;
    const tw = 230;
    this.tooltip.style.left = `${Math.min(stage.width - tw - 10, mx + 14)}px`;
    this.tooltip.style.top = `${Math.min(stage.height - 170, my + 12)}px`;
    this.tooltip.classList.add('show');
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

    const banner = div('flightops-banner');
    append(banner, div('fo-title', tf('FLIGHT OPERATIONS — DAY {n}', { n: report.day })));
    const chips = div('fo-chips');
    for (const { duty, n } of show.summary()) {
      append(chips, span('fo-chip', `${t(DUTIES_BY_ID[duty as AircraftDuty].short, 'duty')} ×${n}`));
    }
    append(banner, chips);
    const damaged = flights.filter((f) => f.damaged).length;
    append(
      banner,
      div(
        'fo-sub',
        `${tf('{n} sorties launched and recovered', { n: flights.length })}${
          damaged > 0 ? ` · ${tf('{n} came back with a fault', { n: damaged })}` : ''
        }${show.extra > 0 ? ` · ${tf('{n} more not shown', { n: show.extra })}` : ''}`,
      ),
    );
    const actions = div('fo-actions');
    append(
      actions,
      button('SKIP', '', () => this.deckView.skipShow()),
      button('DON’T PLAY EVERY DAY', '', () => {
        setFlightOpsAuto(false);
        this.toast('Flight operations will not play automatically. Watch them from the day’s summary.');
        this.deckView.skipShow();
      }),
    );
    append(banner, actions, div('fo-hint', t('Click the deck or press Enter to skip')));
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

function statusClass(status: CarrierStatus): string {
  return status === 'port' ? 'good' : status === 'onstation' ? 'gold' : '';
}

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


function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 1;
}

const FLIGHT_OPS_KEY = 'deckmaster.flightops';

/** Whether the day's flying plays automatically when the day ends. */
function flightOpsAuto(): boolean {
  try {
    return localStorage.getItem(FLIGHT_OPS_KEY) !== 'off';
  } catch {
    return true;
  }
}

function setFlightOpsAuto(on: boolean): void {
  try {
    localStorage.setItem(FLIGHT_OPS_KEY, on ? 'on' : 'off');
  } catch {
    // Without storage the choice lasts until the page is reloaded.
  }
}
