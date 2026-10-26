import type { CarrierStatus } from '../core/types';

/**
 * The ship's sound, synthesised with Web Audio — no sample files.
 *
 * Two layers. A continuous bed that follows the camera: wind and sea on the
 * flight deck, ventilation and machinery hum below, louder the deeper the
 * deck. Over it, one-shots: a catapult launch now and then while the ship
 * is working on station, the ship's bell when a day ends, the bosun's call
 * when the next one begins, a klaxon for an emergency, and a soft tick on
 * every button.
 *
 * Like the crew walking around the deck, this is presentation only. It
 * reads the state and never writes it.
 *
 * Browsers only allow audio after a user gesture, so nothing is created
 * until `unlock()` is called from a click.
 */

const STORAGE_KEY = 'deckmaster.audio';

interface Prefs {
  muted: boolean;
  volume: number;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { muted: !!p.muted, volume: typeof p.volume === 'number' ? p.volume : 0.7 };
    }
  } catch {
    // Storage unavailable: defaults, and the toggle still works this session.
  }
  return { muted: false, volume: 0.7 };
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Not fatal: the preference simply does not survive a reload.
  }
}

class ShipAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private prefs = loadPrefs();

  // Bed layers.
  private wind: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private sea: GainNode | null = null;
  private vent: GainNode | null = null;
  private hum: GainNode | null = null;
  private humOsc: OscillatorNode[] = [];

  private deck = 1;
  private status: CarrierStatus = 'port';
  private launchTimer = 0;
  private flying = false;

  get muted(): boolean {
    return this.prefs.muted;
  }

  /** Create the audio graph. Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.prefs.muted ? 0 : this.prefs.volume;
    this.master.connect(ctx.destination);

    const noise = this.noiseBuffer(4);

    // Wind: band-passed noise whose centre wanders, so gusts come and go.
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    this.loopNoise(noise, this.windFilter);
    this.windFilter.connect(this.wind);
    this.wind.connect(this.master);
    this.lfo(0.07, 260, this.windFilter.frequency);

    // Sea: low rumble with a slow swell.
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 320;
    this.sea = ctx.createGain();
    this.sea.gain.value = 0;
    const seaSwell = ctx.createGain();
    seaSwell.gain.value = 1;
    this.loopNoise(noise, seaFilter);
    seaFilter.connect(seaSwell);
    seaSwell.connect(this.sea);
    this.sea.connect(this.master);
    this.lfo(0.12, 0.35, seaSwell.gain);

    // Ventilation: the steady hiss that is everywhere below decks.
    const ventFilter = ctx.createBiquadFilter();
    ventFilter.type = 'bandpass';
    ventFilter.frequency.value = 1400;
    ventFilter.Q.value = 0.4;
    this.vent = ctx.createGain();
    this.vent.gain.value = 0;
    this.loopNoise(noise, ventFilter);
    ventFilter.connect(this.vent);
    this.vent.connect(this.master);

    // Machinery hum: a low fundamental and its harmonics.
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    this.hum.connect(this.master);
    for (const [freq, level] of [[50, 0.5], [100, 0.28], [150, 0.12], [233, 0.05]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(this.hum);
      osc.start();
      this.humOsc.push(osc);
    }

    this.applyBed(true);
  }

  setMuted(muted: boolean): void {
    this.prefs.muted = muted;
    savePrefs(this.prefs);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.prefs.volume, this.ctx.currentTime, 0.08);
    }
  }

  /** Follow the camera: what you hear depends on where you are standing. */
  setDeck(deck: number): void {
    if (deck === this.deck) return;
    this.deck = deck;
    this.applyBed(false);
  }

  /**
   * Follow the ship. Under way the wind is stronger; flying is whether the
   * air wing is tasked today, which is what puts launches on the deck.
   */
  setShip(status: CarrierStatus, flying: boolean): void {
    if (status === this.status && flying === this.flying) return;
    this.status = status;
    this.flying = flying;
    this.applyBed(false);
  }

  /** Called every frame; schedules ambient launches on the flight deck. */
  tick(dt: number): void {
    if (!this.ctx || this.prefs.muted) return;
    if (this.deck !== 1 || this.status !== 'onstation' || !this.flying) return;
    this.launchTimer -= dt;
    if (this.launchTimer <= 0) {
      this.launchTimer = 14 + Math.random() * 22;
      this.catapultLaunch();
    }
  }

  private applyBed(immediate: boolean): void {
    if (!this.ctx || !this.wind || !this.sea || !this.vent || !this.hum) return;
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.01 : 0.6;
    const topside = this.deck === 1;
    const underway = this.status !== 'port';
    // Deeper decks are closer to the machinery and further from the sea.
    const depth = (this.deck - 1) / 7;

    this.wind.gain.setTargetAtTime(topside ? (underway ? 0.32 : 0.12) : 0, now, tc);
    this.sea.gain.setTargetAtTime(topside ? (underway ? 0.42 : 0.2) : 0.04 + depth * 0.06, now, tc);
    this.vent.gain.setTargetAtTime(topside ? 0 : 0.05 + (1 - depth) * 0.03, now, tc);
    this.hum.gain.setTargetAtTime(topside ? 0.01 : 0.04 + depth * 0.12, now, tc);
  }

  // ---------------------------------------------------------------------
  // One-shots
  // ---------------------------------------------------------------------

  /** A soft tick for buttons. */
  click(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** Ship's bell: two strikes, the end of a watch. */
  bell(strikes = 2): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    for (let i = 0; i < strikes; i++) {
      const t = ctx.currentTime + i * (i % 2 === 0 ? 0.42 : 0.3) + 0.05;
      // Inharmonic partials are what make a bell sound like metal.
      for (const [ratio, level, decay] of [[1, 0.2, 2.2], [2.76, 0.08, 1.4], [5.4, 0.04, 0.8], [8.93, 0.02, 0.5]] as const) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 620 * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(level, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
    }
  }

  /** The bosun's call: a rising, warbling whistle to start the day. */
  pipe(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    const t = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.linearRampToValueAtTime(2300, t + 0.35);
    osc.frequency.setValueAtTime(2300, t + 1.1);
    osc.frequency.linearRampToValueAtTime(1700, t + 1.5);
    const trill = ctx.createOscillator();
    trill.frequency.value = 14;
    const trillDepth = ctx.createGain();
    trillDepth.gain.value = 40;
    trill.connect(trillDepth);
    trillDepth.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.06);
    g.gain.setValueAtTime(0.07, t + 1.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    trill.start(t);
    osc.stop(t + 1.65);
    trill.stop(t + 1.65);
  }

  /** General alarm: a few bursts of a two-tone klaxon. */
  klaxon(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + 0.1 + i * 0.55;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(560, t + 0.35);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
      g.gain.setValueAtTime(0.05, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(f);
      f.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.45);
    }
  }

  /**
   * A jet going off the bow: engines spooling to full power, the catapult
   * stroke, and the roar fading away.
   */
  catapultLaunch(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    const t = ctx.currentTime + 0.05;

    // Engine run-up: a whine rising under band-passed roar.
    const whine = ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(220, t);
    whine.frequency.exponentialRampToValueAtTime(900, t + 2.2);
    const whineF = ctx.createBiquadFilter();
    whineF.type = 'bandpass';
    whineF.frequency.value = 1200;
    whineF.Q.value = 2;
    const whineG = ctx.createGain();
    whineG.gain.setValueAtTime(0.0001, t);
    whineG.gain.exponentialRampToValueAtTime(0.03, t + 1.5);
    whineG.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    whine.connect(whineF);
    whineF.connect(whineG);
    whineG.connect(this.master);
    whine.start(t);
    whine.stop(t + 4);

    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = this.noiseBuffer(5);
    const roarF = ctx.createBiquadFilter();
    roarF.type = 'lowpass';
    roarF.frequency.setValueAtTime(400, t);
    roarF.frequency.exponentialRampToValueAtTime(2200, t + 2.4);
    roarF.frequency.exponentialRampToValueAtTime(300, t + 4.8);
    const roarG = ctx.createGain();
    roarG.gain.setValueAtTime(0.0001, t);
    roarG.gain.exponentialRampToValueAtTime(0.22, t + 2.0);
    roarG.gain.setValueAtTime(0.22, t + 2.5);
    roarG.gain.exponentialRampToValueAtTime(0.0001, t + 4.9);
    roarSrc.connect(roarF);
    roarF.connect(roarG);
    roarG.connect(this.master);
    roarSrc.start(t);
    roarSrc.stop(t + 5);

    // The shuttle hitting the water brake at the end of the stroke.
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    const tt = t + 2.45;
    thump.frequency.setValueAtTime(120, tt);
    thump.frequency.exponentialRampToValueAtTime(38, tt + 0.35);
    const thumpG = ctx.createGain();
    thumpG.gain.setValueAtTime(0.0001, tt);
    thumpG.gain.exponentialRampToValueAtTime(0.35, tt + 0.01);
    thumpG.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5);
    thump.connect(thumpG);
    thumpG.connect(this.master);
    thump.start(tt);
    thump.stop(tt + 0.55);
  }

  /**
   * The short version of a launch for the flight-operations sequence: the
   * shuttle's stroke and the roar going off the bow, without the run-up.
   */
  catapultShot(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    const t = ctx.currentTime + 0.02;
    const roar = ctx.createBufferSource();
    roar.buffer = this.noiseBuffer(2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(350, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    roar.connect(f);
    f.connect(g);
    g.connect(this.master);
    roar.start(t);
    roar.stop(t + 1.8);
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110, t + 0.55);
    thump.frequency.exponentialRampToValueAtTime(36, t + 0.9);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t + 0.55);
    tg.gain.exponentialRampToValueAtTime(0.28, t + 0.56);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    thump.connect(tg);
    tg.connect(this.master);
    thump.start(t + 0.55);
    thump.stop(t + 1.05);
  }

  /** A trap: engines at full power, then the wire bites and they spool down. */
  trap(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.prefs.muted) return;
    const t = ctx.currentTime + 0.02;
    const roar = ctx.createBufferSource();
    roar.buffer = this.noiseBuffer(2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    roar.connect(f);
    f.connect(g);
    g.connect(this.master);
    roar.start(t);
    roar.stop(t + 1.6);
    // The cable: a metallic clank.
    for (const [freq, level] of [[420, 0.07], [1130, 0.04], [2210, 0.02]] as const) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t + 0.12);
      og.gain.exponentialRampToValueAtTime(level, t + 0.125);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(og);
      og.connect(this.master);
      o.start(t + 0.12);
      o.stop(t + 0.45);
    }
  }

  // ---------------------------------------------------------------------
  // Plumbing
  // ---------------------------------------------------------------------

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Brownish noise: integrated white noise has the weight of wind and sea.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 3.2 + white * 0.08;
    }
    return buf;
  }

  private loopNoise(buffer: AudioBuffer, into: AudioNode): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // Start each layer at a different point so they do not phase together.
    src.start(0, Math.random() * buffer.duration);
    src.connect(into);
    return src;
  }

  private lfo(rate: number, depth: number, target: AudioParam): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    osc.connect(g);
    g.connect(target);
    osc.start();
  }
}

export const shipAudio = new ShipAudio();
