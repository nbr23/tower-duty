import { synthesize } from './synth';
import { SOUND_NAMES, VOLUMES, type SoundName } from './sounds';

export interface Audio {
  unlock(): void;
  setEnabled(on: boolean): void;
  play(name: SoundName): void;
}

const MUTE_RAMP_S = 0.01;

const SILENT: Audio = {
  unlock: () => undefined,
  setEnabled: () => undefined,
  play: () => undefined,
};

export function createAudio(): Audio {
  if (typeof AudioContext === 'undefined') return SILENT;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const voices = new Map<SoundName, { buffer: AudioBuffer; gain: GainNode }>();
  const pending = [...SOUND_NAMES];
  const build = (): void => {
    const name = pending.shift();
    if (name === undefined) return;
    const samples = synthesize(name, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    const gain = ctx.createGain();
    gain.gain.value = VOLUMES[name];
    gain.connect(master);
    voices.set(name, { buffer, gain });
    setTimeout(build, 0);
  };
  setTimeout(build, 0);

  let enabled = false;
  let unlocked = false;
  let resuming = false;

  function resume(): void {
    if (ctx.state === 'running' || resuming) return;
    resuming = true;
    ctx
      .resume()
      .catch(() => undefined)
      .finally(() => {
        resuming = false;
      });
  }

  ctx.addEventListener('statechange', () => {
    if (unlocked && !document.hidden) resume();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend().catch(() => undefined);
    else if (unlocked) resume();
  });

  return {
    unlock() {
      unlocked = true;
      if (!document.hidden) resume();
    },
    setEnabled(on) {
      if (on === enabled) return;
      enabled = on;
      master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, MUTE_RAMP_S);
    },
    play(name) {
      const voice = voices.get(name);
      if (!enabled || voice === undefined || (ctx.state !== 'running' && !resuming)) return;
      const source = ctx.createBufferSource();
      source.buffer = voice.buffer;
      source.connect(voice.gain);
      source.start();
    },
  };
}
