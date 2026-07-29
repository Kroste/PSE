/**
 * Prozedural erzeugte Sound-Cues via Web Audio API.
 * Kein externes Asset — alle Klänge werden aus Oszillatoren + Gain-Hüllkurven
 * synthetisiert. Persistenz der Enable-Präferenz via localStorage.
 */

const STORAGE_KEY = 'pse.audio.enabled';

let ctx: AudioContext | null = null;
let enabled = readEnabledFromStorage();

function readEnabledFromStorage(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

function persistEnabled(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignorieren
  }
}

export function isAudioEnabled(): boolean {
  return enabled;
}

export function setAudioEnabled(next: boolean): void {
  enabled = next;
  persistEnabled();
  if (!enabled && ctx) {
    // Sofort silent stellen — laufende Oszillatoren dürfen ausklingen.
    ctx.suspend().catch(() => {});
  } else if (enabled && ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function ensureCtx(): AudioContext | null {
  if (!enabled) return null;
  if (ctx) return ctx;
  try {
    const AudioCtor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; sweepTo?: number } = {},
): void {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gainNode = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + duration);
  }
  const g = opts.gain ?? 0.1;
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(g, t0 + Math.min(0.03, duration * 0.2));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gainNode).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function playNoise(duration: number, opts: { gain?: number; filterFreq?: number } = {}): void {
  const c = ensureCtx();
  if (!c) return;
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gainNode = c.createGain();
  gainNode.gain.setValueAtTime(opts.gain ?? 0.1, c.currentTime);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(opts.filterFreq ?? 1500, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(120, c.currentTime + duration);
  src.connect(filter).connect(gainNode).connect(c.destination);
  src.start();
}

export const sfx = {
  tick(): void {
    playTone(720, 0.05, { type: 'square', gain: 0.05 });
  },
  tickDown(): void {
    playTone(360, 0.06, { type: 'square', gain: 0.05 });
  },
  reactor(): void {
    playTone(520, 0.08, { type: 'triangle', gain: 0.07 });
    playTone(780, 0.08, { type: 'sine', gain: 0.05, delay: 0.03 });
  },
  fusion(): void {
    playTone(180, 0.7, { type: 'sawtooth', gain: 0.12, sweepTo: 640 });
    playTone(90, 0.7, { type: 'sine', gain: 0.15, sweepTo: 320, delay: 0.05 });
  },
  discovery(): void {
    // Frisches C-Dur-Arpeggio in kurzem Nachhall
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      playTone(f, 0.55, { type: 'sine', gain: 0.09, delay: i * 0.06 });
    });
  },
  decay(): void {
    playTone(320, 0.7, { type: 'sawtooth', gain: 0.12, sweepTo: 70 });
    playNoise(0.7, { gain: 0.12, filterFreq: 2000 });
  },
  toggle(): void {
    playTone(440, 0.05, { type: 'sine', gain: 0.08 });
  },
};
