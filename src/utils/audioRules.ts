import { ScreenName } from '../game/types';

export type MusicTrackId = 'menu' | 'play';

export const DEFAULT_MUSIC_VOLUME = 0.25;
export const VIDEO_OR_TTS_DUCK_FACTOR = 0.1;
export const CROSSFADE_DURATION_MS = 1500;
export const FALLBACK_BPM = 85;
export const MIN_FALLBACK_NOTE_HZ = 130.81; // C3

export interface FallbackStepNote {
  chord: readonly number[];
  melody: number | null;
}

/**
 * Warm major-key C -> Am -> F -> G chord progression at 85 BPM
 * with a bright C-major pentatonic melody (strictly >= C3 / 130.81 Hz).
 */
export const FALLBACK_PROGRESSION: readonly FallbackStepNote[] = [
  // Bar 1: C major (C4, E4, G4)
  { chord: [261.63, 329.63, 392.0], melody: 523.25 }, // C5
  { chord: [], melody: null },
  { chord: [], melody: 659.25 }, // E5
  { chord: [261.63, 329.63, 392.0], melody: null },
  { chord: [], melody: 783.99 }, // G5
  { chord: [], melody: 659.25 }, // E5
  { chord: [261.63, 329.63], melody: 587.33 }, // D5
  { chord: [], melody: null },

  // Bar 2: A minor (A3, C4, E4)
  { chord: [220.0, 261.63, 329.63], melody: 523.25 }, // C5
  { chord: [], melody: null },
  { chord: [], melody: 659.25 }, // E5
  { chord: [220.0, 261.63, 329.63], melody: null },
  { chord: [], melody: 880.0 }, // A5
  { chord: [], melody: 783.99 }, // G5
  { chord: [220.0, 261.63], melody: 659.25 }, // E5
  { chord: [], melody: null },

  // Bar 3: F major (F3, A3, C4)
  { chord: [174.61, 220.0, 261.63], melody: 523.25 }, // C5
  { chord: [], melody: null },
  { chord: [], melody: 659.25 }, // E5
  { chord: [174.61, 220.0, 261.63], melody: null },
  { chord: [], melody: 587.33 }, // D5
  { chord: [], melody: 523.25 }, // C5
  { chord: [174.61, 220.0], melody: 440.0 }, // A4
  { chord: [], melody: null },

  // Bar 4: G major (G3, B3, D4)
  { chord: [196.0, 246.94, 293.66], melody: 587.33 }, // D5
  { chord: [], melody: null },
  { chord: [], melody: 783.99 }, // G5
  { chord: [196.0, 246.94, 293.66], melody: null },
  { chord: [], melody: 659.25 }, // E5
  { chord: [], melody: 587.33 }, // D5
  { chord: [196.0, 246.94], melody: 523.25 }, // C5
  { chord: [], melody: null },
];

export function clampMusicVolume(vol: number): number {
  if (!Number.isFinite(vol)) return DEFAULT_MUSIC_VOLUME;
  return Math.max(0, Math.min(1, vol));
}

export function getMusicTrackForScreen(screen: ScreenName): MusicTrackId {
  return screen === 'PLAYING' ? 'play' : 'menu';
}

export function computeEffectiveMusicVolume(
  baseVolume: number,
  state: {
    isMuted: boolean;
    musicEnabled: boolean;
    hasInteracted: boolean;
    isDucked: boolean;
    isTabHidden: boolean;
    isFailFadingOut: boolean;
  }
): number {
  if (
    !state.hasInteracted ||
    state.isMuted ||
    !state.musicEnabled ||
    state.isTabHidden ||
    state.isFailFadingOut
  ) {
    return 0;
  }
  const safeBase = clampMusicVolume(baseVolume);
  return state.isDucked ? safeBase * VIDEO_OR_TTS_DUCK_FACTOR : safeBase;
}
