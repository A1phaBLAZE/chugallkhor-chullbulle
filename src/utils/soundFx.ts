// Audio manager: uses uploaded /menu.mp3, /play.mp3, /win.mp3 when present,
// smoothly crossfades over ~1.5s, ducks to 10% during videos/Listen TTS,
// pauses when hidden/backgrounded, and falls back to a warm 85 BPM
// C-Am-F-G major pentatonic loop (no notes below C3, no drones/alarms) if files are absent.

import {
  clampMusicVolume,
  CROSSFADE_DURATION_MS,
  DEFAULT_MUSIC_VOLUME,
  FALLBACK_BPM,
  FALLBACK_PROGRESSION,
  type MusicTrackId,
} from './audioRules';

const MUTE_KEY = 'moon_base_muted_v1';
const EASY_MODE_KEY = 'moon_base_easy_mode_v1';
const MUSIC_ENABLED_KEY = 'moon_base_music_enabled_v1';
const MUSIC_VOLUME_KEY = 'moon_base_music_volume_v1';

const TRACK_URLS: Record<MusicTrackId | 'win', string> = {
  menu: '/menu.mp3',
  play: '/play.mp3',
  win: '/win.mp3',
};

type FileAvailability = 'unknown' | 'probing' | 'available' | 'missing';

interface MusicControllerState {
  hasInteracted: boolean;
  isMuted: boolean;
  musicEnabled: boolean;
  baseVolume: number;
  desiredTrack: MusicTrackId;
  isDucked: boolean;
  isTabHidden: boolean;
  isFailFadingOut: boolean;
}

const state: MusicControllerState = {
  hasInteracted: false,
  isMuted: false,
  musicEnabled: true,
  baseVolume: DEFAULT_MUSIC_VOLUME,
  desiredTrack: 'menu',
  isDucked: false,
  isTabHidden: false,
  isFailFadingOut: false,
};

const availability: Record<MusicTrackId | 'win', FileAvailability> = {
  menu: 'unknown',
  play: 'unknown',
  win: 'unknown',
};

const audioEls: Partial<Record<MusicTrackId, HTMLAudioElement>> = {};
const trackMix: Record<MusicTrackId, number> = { menu: 0, play: 0 };
let activeElTrack: MusicTrackId | null = null;
let winAudioEl: HTMLAudioElement | null = null;
let duckMultiplier = 1;
let failMultiplier = 1;
let masterRampTimer: number | null = null;
let failRecoveryTimer: number | null = null;
let probeStarted = false;

let audioCtx: AudioContext | null = null;
let fallbackIntervalId: number | null = null;
let fallbackStep = 0;
let fallbackMasterGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended' && !state.isTabHidden && state.hasInteracted) {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function loadMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Ignore storage errors
  }
}

export function loadEasyModePreference(): boolean {
  try {
    return localStorage.getItem(EASY_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveEasyModePreference(enabled: boolean): void {
  try {
    localStorage.setItem(EASY_MODE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

export function loadMusicEnabledPreference(): boolean {
  try {
    const val = localStorage.getItem(MUSIC_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function saveMusicEnabledPreference(enabled: boolean): void {
  try {
    localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

export function loadMusicVolumePreference(): number {
  try {
    const raw = localStorage.getItem(MUSIC_VOLUME_KEY);
    if (raw === null) return DEFAULT_MUSIC_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampMusicVolume(parsed) : DEFAULT_MUSIC_VOLUME;
  } catch {
    return DEFAULT_MUSIC_VOLUME;
  }
}

export function saveMusicVolumePreference(volume: number): void {
  try {
    localStorage.setItem(MUSIC_VOLUME_KEY, String(clampMusicVolume(volume)));
  } catch {
    // Ignore storage errors
  }
}

async function probeAudioFile(key: MusicTrackId | 'win'): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    availability[key] = 'missing';
    return;
  }
  if (availability[key] !== 'unknown') return;
  availability[key] = 'probing';
  try {
    const res = await fetch(TRACK_URLS[key], { method: 'HEAD' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    // Reject SPA index.html fallback when the .mp3 asset is not uploaded
    if (res.ok && !ct.includes('text/html')) {
      availability[key] = 'available';
    } else {
      availability[key] = 'missing';
    }
  } catch {
    availability[key] = 'missing';
  }
  applyAudioMixState();
}

function ensureProbed(): void {
  if (probeStarted || typeof window === 'undefined') return;
  probeStarted = true;
  void probeAudioFile('menu');
  void probeAudioFile('play');
  void probeAudioFile('win');
}

function getOrCreateLoopElement(track: MusicTrackId): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (availability[track] !== 'available') return null;
  if (!audioEls[track]) {
    const el = new Audio(TRACK_URLS[track]);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    el.addEventListener('error', () => {
      availability[track] = 'missing';
      el.pause();
      if (activeElTrack === track) {
        activeElTrack = null;
      }
      applyAudioMixState();
    });
    audioEls[track] = el;
  }
  return audioEls[track] ?? null;
}

function shouldMusicBeAudible(): boolean {
  return (
    state.hasInteracted &&
    !state.isMuted &&
    state.musicEnabled &&
    !state.isTabHidden
  );
}

function targetGlobalMultiplier(): number {
  if (!shouldMusicBeAudible()) return 0;
  return state.baseVolume * duckMultiplier * failMultiplier;
}

function syncElementVolumesAndPlayback(): void {
  if (typeof window === 'undefined') return;
  const globalMul = targetGlobalMultiplier();
  const desired = state.desiredTrack;
  const desiredAvailable = availability[desired] === 'available';

  if (!shouldMusicBeAudible() || !desiredAvailable) {
    (['menu', 'play'] as const).forEach((id) => {
      const el = audioEls[id];
      if (el) {
        if (!shouldMusicBeAudible() || trackMix[id] <= 0.002) {
          el.volume = 0;
          el.pause();
        } else {
          el.volume = Math.max(0, Math.min(1, trackMix[id] * globalMul));
        }
      }
    });
  } else {
    (['menu', 'play'] as const).forEach((id) => {
      const el = getOrCreateLoopElement(id);
      if (!el) return;
      const mix = trackMix[id];
      const vol = Math.max(0, Math.min(1, mix * globalMul));
      el.volume = vol;
      if (mix > 0.005 && globalMul > 0.001) {
        if (el.paused) {
          el.play().catch(() => {});
        }
      } else if (mix <= 0.002 && !el.paused) {
        el.pause();
      }
    });
  }

  if (fallbackMasterGain && audioCtx) {
    const useFallback =
      shouldMusicBeAudible() && availability[desired] === 'missing';
    const fbTarget = useFallback ? globalMul : 0;
    try {
      fallbackMasterGain.gain.setTargetAtTime(
        fbTarget,
        audioCtx.currentTime,
        0.08
      );
    } catch {
      // Ignore Web Audio ramp error
    }
  }
}

function ensureVolumeTweenLoop(): void {
  if (typeof window === 'undefined') return;
  if (masterRampTimer !== null) return;

  let lastTs = performance.now();
  masterRampTimer = window.setInterval(() => {
    const now = performance.now();
    const dt = Math.min(200, Math.max(10, now - lastTs));
    lastTs = now;

    const fadeStep = dt / CROSSFADE_DURATION_MS;
    const duckStep = dt / 350;
    const failStep = dt / 900;

    const targetDuck = state.isDucked ? 0.1 : 1;
    if (Math.abs(duckMultiplier - targetDuck) > 0.005) {
      duckMultiplier +=
        Math.sign(targetDuck - duckMultiplier) *
        Math.min(duckStep, Math.abs(targetDuck - duckMultiplier));
    } else {
      duckMultiplier = targetDuck;
    }

    const targetFail = state.isFailFadingOut ? 0 : 1;
    if (Math.abs(failMultiplier - targetFail) > 0.005) {
      failMultiplier +=
        Math.sign(targetFail - failMultiplier) *
        Math.min(failStep, Math.abs(targetFail - failMultiplier));
    } else {
      failMultiplier = targetFail;
    }

    const desired = state.desiredTrack;
    const other: MusicTrackId = desired === 'menu' ? 'play' : 'menu';
    if (shouldMusicBeAudible() && availability[desired] === 'available') {
      trackMix[desired] = Math.min(1, trackMix[desired] + fadeStep);
      trackMix[other] = Math.max(0, trackMix[other] - fadeStep);
    } else {
      trackMix.menu = Math.max(0, trackMix.menu - fadeStep);
      trackMix.play = Math.max(0, trackMix.play - fadeStep);
    }

    syncElementVolumesAndPlayback();

    const trackDone =
      shouldMusicBeAudible() && availability[desired] === 'available'
        ? trackMix[desired] >= 0.999 && trackMix[other] <= 0.001
        : trackMix.menu <= 0.001 && trackMix.play <= 0.001;
    const duckDone = duckMultiplier === targetDuck;
    const failDone = failMultiplier === targetFail;

    if (trackDone && duckDone && failDone && masterRampTimer !== null) {
      window.clearInterval(masterRampTimer);
      masterRampTimer = null;
    }
  }, 45);
}

function playFallbackNote(
  freq: number,
  durationSec: number,
  type: OscillatorType,
  gainAmount: number
): void {
  const ctx = getAudioContext();
  if (!ctx || !fallbackMasterGain) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0005, now);
  g.gain.linearRampToValueAtTime(gainAmount, now + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(g);
  g.connect(fallbackMasterGain);
  osc.start(now);
  osc.stop(now + durationSec + 0.04);
}

function syncFallbackLoop(): void {
  if (typeof window === 'undefined') return;
  const wantFallback =
    shouldMusicBeAudible() && availability[state.desiredTrack] === 'missing';

  if (!wantFallback) {
    if (fallbackIntervalId !== null) {
      window.clearInterval(fallbackIntervalId);
      fallbackIntervalId = null;
    }
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (!fallbackMasterGain) {
    fallbackMasterGain = ctx.createGain();
    fallbackMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    fallbackMasterGain.connect(ctx.destination);
  }

  syncElementVolumesAndPlayback();

  if (fallbackIntervalId !== null) return;

  // Eighth-note step interval at 85 BPM (~353ms)
  const stepMs = Math.round((60 / FALLBACK_BPM / 2) * 1000);
  fallbackIntervalId = window.setInterval(() => {
    try {
      if (!audioCtx || audioCtx.state !== 'running') return;
      if (!shouldMusicBeAudible()) return;
      if (availability[state.desiredTrack] !== 'missing') return;
      if (state.isFailFadingOut) return;

      const stepData =
        FALLBACK_PROGRESSION[fallbackStep % FALLBACK_PROGRESSION.length];
      fallbackStep += 1;

      const chordDur = state.desiredTrack === 'menu' ? 1.1 : 0.72;
      const melodyDur = state.desiredTrack === 'menu' ? 0.52 : 0.36;

      stepData.chord.forEach((hz) => {
        playFallbackNote(hz, chordDur, 'triangle', 0.075);
      });
      if (stepData.melody !== null) {
        const playMenuSkip =
          state.desiredTrack === 'menu' && fallbackStep % 4 === 2;
        if (!playMenuSkip) {
          playFallbackNote(stepData.melody, melodyDur, 'sine', 0.11);
        }
      }
    } catch {
      // Ignore fallback audio hiccups
    }
  }, stepMs);
}

function applyAudioMixState(): void {
  if (typeof window === 'undefined') return;

  if (state.hasInteracted) {
    ensureProbed();
    if (!state.isTabHidden && shouldMusicBeAudible()) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
  }

  if (state.isTabHidden && audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }

  ensureVolumeTweenLoop();
  syncElementVolumesAndPlayback();
  syncFallbackLoop();
}

export function markMusicUserInteracted(): void {
  if (state.hasInteracted) return;
  state.hasInteracted = true;
  ensureProbed();
  applyAudioMixState();
}

export function updateMusicController(params: {
  track: MusicTrackId;
  isMuted: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  isDucked: boolean;
  isTabHidden: boolean;
}): void {
  const prevTrack = state.desiredTrack;
  state.desiredTrack = params.track;
  state.isMuted = params.isMuted;
  state.musicEnabled = params.musicEnabled;
  state.baseVolume = clampMusicVolume(params.musicVolume);
  state.isDucked = params.isDucked;
  state.isTabHidden = params.isTabHidden;

  if (prevTrack !== params.track && activeElTrack === null) {
    activeElTrack = params.track;
  }

  applyAudioMixState();
}

export function fadeMusicOutOnFail(): void {
  if (typeof window === 'undefined') return;
  state.isFailFadingOut = true;
  if (failRecoveryTimer !== null) {
    window.clearTimeout(failRecoveryTimer);
  }
  applyAudioMixState();
  // Softly return to calm music after a brief quiet pause
  failRecoveryTimer = window.setTimeout(() => {
    state.isFailFadingOut = false;
    failRecoveryTimer = null;
    applyAudioMixState();
  }, 1900);
}

export function playWinJingle(isMuted: boolean, musicVolume?: number): void {
  if (isMuted || typeof window === 'undefined') return;
  if (!state.hasInteracted) return;
  ensureProbed();

  if (availability.win !== 'available') {
    // Prompt: if a file is missing, skip that sound and do not break the game.
    return;
  }

  try {
    if (!winAudioEl) {
      winAudioEl = new Audio(TRACK_URLS.win);
      winAudioEl.preload = 'auto';
      winAudioEl.addEventListener('error', () => {
        availability.win = 'missing';
      });
    }
    const targetVol = Math.max(
      0.15,
      Math.min(0.85, (musicVolume ?? state.baseVolume) * 1.6)
    );
    winAudioEl.volume = targetVol;
    winAudioEl.currentTime = 0;
    winAudioEl.play().catch(() => {});
  } catch {
    // Skip safely without breaking game
  }
}

export function stopAllMusic(): void {
  if (typeof window === 'undefined') return;
  if (masterRampTimer !== null) {
    window.clearInterval(masterRampTimer);
    masterRampTimer = null;
  }
  if (fallbackIntervalId !== null) {
    window.clearInterval(fallbackIntervalId);
    fallbackIntervalId = null;
  }
  if (failRecoveryTimer !== null) {
    window.clearTimeout(failRecoveryTimer);
    failRecoveryTimer = null;
  }
  (['menu', 'play'] as const).forEach((id) => {
    const el = audioEls[id];
    if (el) {
      el.pause();
      el.volume = 0;
    }
  });
  if (winAudioEl) {
    winAudioEl.pause();
  }
}

function playSoftSfxTone(
  freq: number,
  durationSec: number,
  type: 'sine' | 'triangle',
  volume: number,
  delaySec = 0,
  endFreq?: number
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Never play low bass tones below C3
  const safeStart = Math.max(140, freq);
  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(safeStart, now);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(140, endFreq),
      now + durationSec
    );
  }
  gain.gain.setValueAtTime(0.0005, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.03);
}

/**
 * Short, soft, cheerful sound effects (never alarms, sirens, buzzers, deep bass, or sad fail cues).
 */
export function playSound(
  kind:
    | 'tap'
    | 'pop'
    | 'star'
    | 'boost'
    | 'jingle'
    | 'warning'
    | 'ohno'
    | 'success'
    | 'fail'
    | 'laser'
    | 'build'
    | 'harvest',
  isMuted: boolean
) {
  if (isMuted) return;
  try {
    if (kind === 'tap') {
      playSoftSfxTone(587.33, 0.07, 'sine', 0.055, 0, 698.46);
    } else if (kind === 'pop') {
      playSoftSfxTone(659.25, 0.065, 'sine', 0.065, 0, 880);
    } else if (kind === 'star') {
      playSoftSfxTone(783.99, 0.09, 'triangle', 0.06, 0);
      playSoftSfxTone(1046.5, 0.14, 'triangle', 0.065, 0.06);
    } else if (kind === 'jingle' || kind === 'success') {
      playSoftSfxTone(523.25, 0.09, 'triangle', 0.06, 0);
      playSoftSfxTone(659.25, 0.09, 'triangle', 0.06, 0.08);
      playSoftSfxTone(783.99, 0.1, 'triangle', 0.065, 0.16);
      playSoftSfxTone(1046.5, 0.22, 'triangle', 0.07, 0.24);
    } else if (kind === 'harvest') {
      playSoftSfxTone(659.25, 0.08, 'sine', 0.06, 0, 880);
      playSoftSfxTone(987.77, 0.1, 'triangle', 0.055, 0.05, 1174.66);
    } else if (kind === 'build') {
      playSoftSfxTone(440, 0.09, 'triangle', 0.06, 0, 587.33);
      playSoftSfxTone(587.33, 0.11, 'sine', 0.055, 0.07, 783.99);
    } else if (kind === 'laser') {
      playSoftSfxTone(880, 0.07, 'sine', 0.045, 0, 659.25);
    } else if (kind === 'boost') {
      playSoftSfxTone(523.25, 0.09, 'triangle', 0.06, 0);
      playSoftSfxTone(659.25, 0.1, 'triangle', 0.06, 0.07);
      playSoftSfxTone(783.99, 0.14, 'triangle', 0.06, 0.14);
    } else if (kind === 'warning' || kind === 'ohno') {
      // Soft high "boop" chime — gentle and never an alarm or deep bass
      playSoftSfxTone(587.33, 0.1, 'sine', 0.05, 0, 523.25);
    } else if (kind === 'fail') {
      // Prompt: on a fail, do not play a sad or scary sound.
      return;
    }
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export function triggerWarningVibration() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([90, 40, 90]);
    }
  } catch {
    // Ignore vibration errors on unsupported devices
  }
}
