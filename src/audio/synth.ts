import { mulberry32 } from '../game/rng';
import type { SoundName } from './sounds';

type Samples = Float32Array<ArrayBuffer>;
type Wave = (phase: number) => number;

const TAU = 2 * Math.PI;
const PEAK = 0.9;

const sine: Wave = (p) => Math.sin(TAU * p);
const triangle: Wave = (p) => 1 - 4 * Math.abs(p - Math.floor(p + 0.5));
const saw: Wave = (p) => 2 * (p - Math.floor(p + 0.5));
const soft: Wave = (p) => Math.tanh(2.5 * Math.sin(TAU * p));

interface Envelope {
  at: number;
  dur: number;
  gain?: number;
  attack?: number;
  release?: number;
  decay?: number;
}

interface Tone extends Envelope {
  freq: number;
  to?: number;
  wave?: Wave;
  vibrato?: readonly [rate: number, depth: number];
}

interface Noise extends Envelope {
  cutoff: (u: number) => number;
  highpass?: number;
  seed?: number;
}

function mix(out: Samples, sr: number, e: Envelope, sample: (u: number) => number): void {
  const start = Math.round(e.at * sr);
  const total = e.dur * sr;
  const n = Math.min(Math.round(total), out.length - start);
  const attack = (e.attack ?? 0.004) * sr;
  const release = (e.release ?? 0.02) * sr;
  const decay = Math.exp(-(e.decay ?? 0) / sr);
  let level = e.gain ?? 1;
  for (let i = 0; i < n; i++) {
    const shape = Math.min(1, i / attack, (total - i) / release);
    out[start + i] = (out[start + i] ?? 0) + level * shape * sample(i / n);
    level *= decay;
  }
}

function tone(out: Samples, sr: number, t: Tone): void {
  const wave = t.wave ?? sine;
  const sweep = t.to === undefined ? 1 : (t.to / t.freq) ** (1 / (t.dur * sr));
  const [rate, depth] = t.vibrato ?? [0, 0];
  const wobble = (TAU * rate) / sr;
  let f = t.freq;
  let phase = 0;
  let i = 0;
  mix(out, sr, t, () => {
    phase += (depth === 0 ? f : f * (1 + depth * Math.sin(wobble * i++))) / sr;
    if (phase >= 1) phase -= 1;
    f *= sweep;
    return wave(phase);
  });
}

function coefficient(cutoff: number, sr: number): number {
  return 1 - Math.exp((-TAU * cutoff) / sr);
}

function noise(out: Samples, sr: number, n: Noise): void {
  const rng = mulberry32(n.seed ?? 1);
  const hp = n.highpass === undefined ? 0 : coefficient(n.highpass, sr);
  let a = 0;
  let i = 0;
  let lp1 = 0;
  let lp2 = 0;
  let low = 0;
  mix(out, sr, n, (u) => {
    if ((i++ & 31) === 0) a = coefficient(n.cutoff(u), sr);
    lp1 += a * (rng() * 2 - 1 - lp1);
    lp2 += a * (lp1 - lp2);
    low += hp * (lp2 - low);
    return lp2 - low;
  });
}

function lowpass(out: Samples, sr: number, cutoff: number): void {
  const a = coefficient(cutoff, sr);
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    y += a * ((out[i] ?? 0) - y);
    out[i] = y;
  }
}

function normalize(out: Samples): Samples {
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] ?? 0) * PEAK) / peak;
  return out;
}

const CLIPS: Record<SoundName, { length: number; render: (out: Samples, sr: number) => void }> = {
  landed: {
    length: 0.6,
    render(out, sr) {
      tone(out, sr, { at: 0, dur: 0.35, freq: 1046.5, decay: 8 });
      tone(out, sr, { at: 0, dur: 0.35, freq: 2093, decay: 14, gain: 0.2 });
      tone(out, sr, { at: 0.12, dur: 0.45, freq: 1568, decay: 7 });
      tone(out, sr, { at: 0.12, dur: 0.45, freq: 3136, decay: 12, gain: 0.15 });
    },
  },
  plane: {
    length: 0.09,
    render(out, sr) {
      tone(out, sr, { at: 0, dur: 0.08, freq: 1320, to: 990, decay: 30, attack: 0.002 });
      tone(out, sr, { at: 0, dur: 0.08, freq: 660, to: 495, wave: triangle, decay: 30, gain: 0.3, attack: 0.002 });
    },
  },
  crashland: {
    length: 1.5,
    render(out, sr) {
      noise(out, sr, { at: 0, dur: 1.5, cutoff: (u) => 3000 * 0.1 ** u, decay: 3, attack: 0.002, release: 0.2 });
      noise(out, sr, { at: 0, dur: 0.1, cutoff: () => 8000, highpass: 2000, decay: 30, gain: 0.6, attack: 0.001, seed: 7 });
      tone(out, sr, { at: 0, dur: 0.6, freq: 90, to: 38, decay: 6, gain: 1.2, attack: 0.002 });
    },
  },
  runway: {
    length: 0.3,
    render(out, sr) {
      tone(out, sr, { at: 0, dur: 0.12, freq: 620, to: 1240, wave: triangle, gain: 0.7 });
      tone(out, sr, { at: 0.1, dur: 0.2, freq: 1240, decay: 14 });
      tone(out, sr, { at: 0.1, dur: 0.2, freq: 1860, decay: 20, gain: 0.25 });
    },
  },
  proximity_warning: {
    length: 0.6,
    render(out, sr) {
      [988, 740, 988, 740].forEach((freq, i) => {
        tone(out, sr, { at: i * 0.15, dur: 0.13, freq, wave: soft, attack: 0.006, release: 0.03 });
      });
      lowpass(out, sr, 4000);
    },
  },
  fastplanewarn: {
    length: 1.2,
    render(out, sr) {
      noise(out, sr, { at: 0, dur: 1.2, cutoff: (u) => 300 + 4500 * Math.sin(Math.PI * u) ** 2, highpass: 150, attack: 0.5, release: 0.6, seed: 3 });
      tone(out, sr, { at: 0.1, dur: 1.0, freq: 1800, to: 900, gain: 0.08, attack: 0.4, release: 0.5 });
    },
  },
  zeppelin_arriving: {
    length: 1.8,
    render(out, sr) {
      const notes: readonly [at: number, dur: number, freq: number][] = [
        [0, 0.95, 110],
        [0.85, 0.95, 87.31],
      ];
      for (const [at, dur, freq] of notes) {
        const horn = { at, dur, freq, attack: 0.2, release: 0.4, vibrato: [5, 0.008] as const };
        tone(out, sr, { ...horn, gain: 0.8 });
        tone(out, sr, { ...horn, wave: saw, gain: 0.3 });
        tone(out, sr, { ...horn, freq: freq * 2, gain: 0.3 });
      }
      lowpass(out, sr, 1200);
    },
  },
  ufo_arriving: {
    length: 1.7,
    render(out, sr) {
      const glides: readonly [at: number, dur: number, freq: number, to: number][] = [
        [0, 0.6, 520, 880],
        [0.55, 0.5, 880, 640],
        [1.0, 0.7, 640, 980],
      ];
      for (const [at, dur, freq, to] of glides) {
        const warble = { at, dur, freq, to, attack: 0.12, release: 0.2, vibrato: [7, 0.035] as const };
        tone(out, sr, warble);
        tone(out, sr, { ...warble, freq: freq * (2 / 3), to: to * (2 / 3), gain: 0.35 });
      }
      lowpass(out, sr, 3000);
    },
  },
  tanker_inbound: {
    length: 1.3,
    render(out, sr) {
      const blasts: readonly [at: number, dur: number, freq: number, to: number][] = [
        [0, 0.5, 330, 392],
        [0.55, 0.75, 392, 494],
      ];
      for (const [at, dur, freq, to] of blasts) {
        const horn = { at, dur, freq, to, attack: 0.05, release: 0.18, vibrato: [6, 0.006] as const };
        tone(out, sr, { ...horn, wave: saw, gain: 0.5 });
        tone(out, sr, { ...horn, wave: soft, gain: 0.6 });
        tone(out, sr, { ...horn, freq: freq * 1.5, to: to * 1.5, gain: 0.25 });
      }
      lowpass(out, sr, 2400);
    },
  },
  menu: {
    length: 0.75,
    render(out, sr) {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        tone(out, sr, { at: i * 0.06, dur: 0.75 - i * 0.06, freq, attack: 0.05, decay: 4, release: 0.15 });
      });
      tone(out, sr, { at: 0, dur: 0.75, freq: 261.63, wave: triangle, attack: 0.05, decay: 4, release: 0.15, gain: 0.3 });
    },
  },
  menu_option: {
    length: 0.05,
    render(out, sr) {
      tone(out, sr, { at: 0, dur: 0.04, freq: 2000, to: 1500, decay: 60, attack: 0.001, release: 0.01 });
      noise(out, sr, { at: 0, dur: 0.012, cutoff: () => 9000, highpass: 3000, gain: 0.3, attack: 0.001, release: 0.005, seed: 5 });
    },
  },
};

export function synthesize(name: SoundName, sampleRate: number): Samples {
  const clip = CLIPS[name];
  const out = new Float32Array(Math.round(clip.length * sampleRate));
  clip.render(out, sampleRate);
  return normalize(out);
}
