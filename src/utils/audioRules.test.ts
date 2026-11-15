import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveMusicVolume,
  DEFAULT_MUSIC_VOLUME,
  FALLBACK_PROGRESSION,
  getMusicTrackForScreen,
  MIN_FALLBACK_NOTE_HZ,
} from './audioRules';

test('default music volume is 25% and requires user interaction, unmuted, enabled, visible tab', () => {
  assert.equal(DEFAULT_MUSIC_VOLUME, 0.25);

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: false,
      musicEnabled: true,
      hasInteracted: false,
      isDucked: false,
      isTabHidden: false,
      isFailFadingOut: false,
    }),
    0
  );

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: false,
      musicEnabled: true,
      hasInteracted: true,
      isDucked: false,
      isTabHidden: false,
      isFailFadingOut: false,
    }),
    0.25
  );

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: false,
      musicEnabled: true,
      hasInteracted: true,
      isDucked: true,
      isTabHidden: false,
      isFailFadingOut: false,
    }),
    0.025
  );

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: false,
      musicEnabled: true,
      hasInteracted: true,
      isDucked: false,
      isTabHidden: true,
      isFailFadingOut: false,
    }),
    0
  );

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: true,
      musicEnabled: true,
      hasInteracted: true,
      isDucked: false,
      isTabHidden: false,
      isFailFadingOut: false,
    }),
    0
  );

  assert.equal(
    computeEffectiveMusicVolume(DEFAULT_MUSIC_VOLUME, {
      isMuted: false,
      musicEnabled: true,
      hasInteracted: true,
      isDucked: false,
      isTabHidden: false,
      isFailFadingOut: true,
    }),
    0
  );
});

test('music track routing maps menu/story screens to menu and gameplay to play', () => {
  assert.equal(getMusicTrackForScreen('SPLASH'), 'menu');
  assert.equal(getMusicTrackForScreen('MENU'), 'menu');
  assert.equal(getMusicTrackForScreen('INTRO_VIDEO'), 'menu');
  assert.equal(getMusicTrackForScreen('DAY_TITLE'), 'menu');
  assert.equal(getMusicTrackForScreen('RESULT'), 'menu');
  assert.equal(getMusicTrackForScreen('DEBRIEF'), 'menu');
  assert.equal(getMusicTrackForScreen('ENDING'), 'menu');
  assert.equal(getMusicTrackForScreen('PLAYING'), 'play');
});

test('fallback 85 BPM C-Am-F-G progression contains zero notes below C3 (130.81 Hz)', () => {
  assert.ok(FALLBACK_PROGRESSION.length === 32);
  for (const step of FALLBACK_PROGRESSION) {
    for (const freq of step.chord) {
      assert.ok(
        freq >= MIN_FALLBACK_NOTE_HZ,
        `Chord note ${freq}Hz must be >= C3 (${MIN_FALLBACK_NOTE_HZ}Hz)`
      );
    }
    if (step.melody !== null) {
      assert.ok(
        step.melody >= MIN_FALLBACK_NOTE_HZ,
        `Melody note ${step.melody}Hz must be >= C3 (${MIN_FALLBACK_NOTE_HZ}Hz)`
      );
    }
  }
});
