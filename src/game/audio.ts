import { haptics } from "./haptics.ts";

export const VICTIM_STINGS = ["scream", "cry", "plea", "yelp", "gasp", "holler"] as const;

export type VictimSting = (typeof VICTIM_STINGS)[number];

/** Next victim sting, skipping whichever of the last two were just used. */
export function pickVictimSting(
  recent: readonly VictimSting[],
  rng: () => number = Math.random,
): VictimSting {
  const blocked = new Set(recent.slice(-2));
  let pool: readonly VictimSting[] = VICTIM_STINGS.filter((id) => !blocked.has(id));
  if (pool.length === 0) pool = VICTIM_STINGS;
  const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[i]!;
}

export class AudioBus {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  beamOsc: OscillatorNode | null = null;
  beamGain: GainNode | null = null;
  private beamBuzzed = false;
  private recentVictims: VictimSting[] = [];

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    haptics.unlock();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
    if (m) this.stopBeam();
  }

  private env(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol = 0.12,
    slide?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide != null) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.08) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const n = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, n * dur, n);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
  }

  laser() {
    const jitter = 0.92 + Math.random() * 0.16;
    this.env(880 * jitter, "sawtooth", 0.08, 0.05, 220);
    haptics.laser();
  }

  abduct() {
    this.env(220, "triangle", 0.28, 0.09, 660);
    this.env(330, "sine", 0.32, 0.05, 880);
    haptics.abduct();
  }

  explode() {
    this.noise(0.32, 0.16);
    this.env(140, "square", 0.22, 0.07, 50);
    haptics.explode(true);
  }

  hit() {
    this.env(180, "square", 0.1, 0.06, 70);
    haptics.hit();
  }

  ui() {
    this.env(520, "sine", 0.08, 0.05, 720);
    haptics.tap();
  }

  hurt() {
    this.env(90, "sawtooth", 0.2, 0.08, 40);
    this.noise(0.12, 0.06);
    haptics.hurt();
  }

  /** Random victim sting. Owns avoid-last-two so callers stay a single call. */
  victimShout() {
    const id = pickVictimSting(this.recentVictims);
    this.recentVictims.push(id);
    if (this.recentVictims.length > 2) this.recentVictims.shift();
    switch (id) {
      case "scream":
        this.scream();
        break;
      case "cry":
        this.cry();
        break;
      case "plea":
        this.plea();
        break;
      case "yelp":
        this.yelp();
        break;
      case "gasp":
        this.gasp();
        break;
      case "holler":
        this.holler();
        break;
      default: {
        const missed: never = id;
        void missed;
      }
    }
  }

  plea() {
    const a = 360 + Math.random() * 80;
    const b = 520 + Math.random() * 120;
    this.env(a, "triangle", 0.07, 0.06, a * 1.62);
    this.env(a * 0.82, "sine", 0.07, 0.04, a * 1.28);
    this.env(b, "triangle", 0.08, 0.055, b * 1.48, 0.1);
    this.env(b * 0.8, "sine", 0.08, 0.035, b * 1.22, 0.1);
  }

  scream() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    const start = 240 + Math.random() * 420;
    const peak = start * (1.7 + Math.random() * 1.35);
    const end = 120 + Math.random() * 220;
    o.frequency.setValueAtTime(start, t);
    o.frequency.exponentialRampToValueAtTime(peak, t + 0.11);
    o.frequency.exponentialRampToValueAtTime(Math.max(48, Math.min(end, peak * 0.55)), t + 0.42);
    f.type = "bandpass";
    f.frequency.value = 900 + Math.random() * 1100;
    f.Q.value = 2.6 + Math.random() * 1.8;
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.48);
    this.noise(0.18, 0.04);
  }

  cry() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.46;
    const base = 260 + Math.random() * 90;
    const sine = this.ctx.createOscillator();
    const tri = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    sine.type = "sine";
    tri.type = "triangle";
    const waves = [1, 0.84, 0.92, 0.7, 0.78, 0.55];
    sine.frequency.setValueAtTime(base, t);
    tri.frequency.setValueAtTime(base * 1.5, t);
    for (let i = 1; i < waves.length; i++) {
      const when = t + (dur * i) / (waves.length - 1);
      sine.frequency.linearRampToValueAtTime(base * waves[i]!, when);
      tri.frequency.linearRampToValueAtTime(base * 1.5 * waves[i]!, when);
    }
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sine.connect(g);
    tri.connect(g);
    g.connect(this.sfx);
    sine.start(t);
    tri.start(t);
    sine.stop(t + dur + 0.02);
    tri.stop(t + dur + 0.02);
    this.noise(0.28, 0.022);
  }

  yelp() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    const f0 = 1040 + Math.random() * 560;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.22, t + 0.045);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.012);
    g.gain.setValueAtTime(0.07, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.13);
  }

  gasp() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const dur = 0.2;
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(rate * dur)), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1400 + Math.random() * 600;
    f.Q.value = 0.6;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.78);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  holler() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    const mid = 200 + Math.random() * 90;
    o.frequency.setValueAtTime(mid, t);
    o.frequency.linearRampToValueAtTime(mid * (1.02 + Math.random() * 0.06), t + 0.16);
    o.frequency.exponentialRampToValueAtTime(Math.max(55, mid * 0.42), t + 0.35);
    f.type = "bandpass";
    f.frequency.value = 520 + Math.random() * 180;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(0.085, t);
    g.gain.setValueAtTime(0.085, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.38);
  }

  tank() {
    this.env(90, "square", 0.16, 0.08, 50);
    this.noise(0.14, 0.07);
  }

  heli() {
    this.env(240, "sawtooth", 0.08, 0.04, 180);
  }

  jet() {
    this.env(680, "sawtooth", 0.12, 0.05, 220);
  }

  upgrade() {
    this.env(440, "sine", 0.12, 0.07, 880);
    this.env(660, "triangle", 0.18, 0.05, 990);
    haptics.tap();
  }

  cloak() {
    this.env(180, "sine", 0.28, 0.06, 90);
    this.env(520, "triangle", 0.22, 0.04, 260);
    haptics.tap();
  }

  startBeam() {
    if (!this.beamBuzzed) {
      this.beamBuzzed = true;
      haptics.beam();
    }
    if (!this.ctx || !this.sfx || this.muted || this.beamOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = 72;
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.045, this.ctx.currentTime, 0.05);
    o.connect(g);
    g.connect(this.sfx);
    o.start();
    this.beamOsc = o;
    this.beamGain = g;
  }

  stopBeam() {
    if (!this.ctx || !this.beamOsc || !this.beamGain) return;
    const o = this.beamOsc;
    const g = this.beamGain;
    g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    const ctx = this.ctx;
    setTimeout(() => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }, 120);
    this.beamOsc = null;
    this.beamGain = null;
    this.beamBuzzed = false;
    void ctx;
  }
}

export const audio = new AudioBus();
