import { haptics } from "./haptics";

export class AudioBus {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  beamOsc: OscillatorNode | null = null;
  beamGain: GainNode | null = null;
  private beamBuzzed = false;

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
  ) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
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
