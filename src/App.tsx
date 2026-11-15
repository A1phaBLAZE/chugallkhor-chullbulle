import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Settings } from 'lucide-react';
import { ConfettiBurst } from './components/ConfettiBurst';
import { CrewBar } from './components/CrewBar';
import { DayCard } from './components/DayCard';
import {
  AboutNasaScreen,
  AboutSystemsScreen,
  ContactingNasaScreen,
  CrewScreen,
  DayTitleCardScreen,
  DebriefScreen,
  EndingScreen,
  HowToPlayScreen,
  MainMenuScreen,
  ResultScreen,
  SettingsModal,
  SplashScreen,
} from './components/GameScreens';
import { MissionControlCardModal, TopHudMeters } from './components/MeterBar';
import { MiniGameModal } from './components/MiniGameModal';
import { MissionTrail } from './components/MissionTrail';
import { MoonFooterArt } from './components/MoonFooterArt';
import { MusicControl } from './components/MusicControl';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VideoStage } from './components/VideoStage';
import {
  activateCrewAbility,
  advanceToNextDay,
  answerResultQuickQuestion,
  attemptDay10Launch,
  clearSavedMission,
  createInitialGameState,
  getLaunchRequirements,
  getOrderedChoicesForDay,
  loadCheckpoint,
  loadEarnedMissionPatches,
  loadGameProgress,
  resolveDayTurn,
  runDay10SafetyCheck,
  saveCheckpoint,
  saveGameProgress,
} from './game/engine';
import {
  DAY10_LAUNCH_MINIGAME,
  MISSION_DAYS,
  VIDEO_CONFIG,
} from './game/gameData';
import {
  ARCHIVED_NASA_BUNDLE,
  fetchAllNasaMissionData,
} from './game/nasaService';
import {
  CheckpointSnapshot,
  CrewId,
  DayChoice,
  GameState,
  MeterKey,
  NasaMissionBundle,
  ScreenName,
} from './game/types';
import { getMusicTrackForScreen } from './utils/audioRules';
import {
  fadeMusicOutOnFail,
  loadEasyModePreference,
  loadMusicEnabledPreference,
  loadMusicVolumePreference,
  loadMutedPreference,
  markMusicUserInteracted,
  playSound,
  playWinJingle,
  saveEasyModePreference,
  saveMusicEnabledPreference,
  saveMusicVolumePreference,
  saveMutedPreference,
  stopAllMusic,
  triggerWarningVibration,
  updateMusicController,
} from './utils/soundFx';

type ActiveMiniGame =
  | { kind: 'choice'; choice: DayChoice }
  | { kind: 'launch' };

export default function App() {
  const isAutoStart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [screen, setScreen] = useState<ScreenName>(() =>
    isAutoStart ? 'PLAYING' : 'SPLASH'
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState()
  );
  const [savedProgress, setSavedProgress] = useState<GameState | null>(() =>
    loadGameProgress()
  );
  const [checkpoint, setCheckpoint] = useState<CheckpointSnapshot | null>(() =>
    loadCheckpoint()
  );
  const [nasaInfo, setNasaInfo] = useState<NasaMissionBundle>(
    ARCHIVED_NASA_BUNDLE
  );
  const [nasaFetchDone, setNasaFetchDone] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(
    () => loadMutedPreference() || !loadMusicEnabledPreference()
  );
  const [easyMode, setEasyMode] = useState<boolean>(() =>
    loadEasyModePreference()
  );
  const [musicVolume, setMusicVolume] = useState<number>(() =>
    loadMusicVolumePreference()
  );
  const [isTabHidden, setIsTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isGoldVideoActive, setIsGoldVideoActive] = useState(false);
  const [isStorySpeaking, setIsStorySpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [inspectMeter, setInspectMeter] = useState<MeterKey | null>(null);
  const [activeMiniGame, setActiveMiniGame] = useState<ActiveMiniGame | null>(
    null
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [crewReaction, setCrewReaction] = useState<
    'bounce' | 'wobble' | 'idle'
  >('idle');
  const [earnedPatches, setEarnedPatches] = useState<number[]>(() =>
    loadEarnedMissionPatches()
  );

  const fetchStartedRef = useRef(false);
  const confettiTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
    }
    confettiTimerRef.current = window.setTimeout(() => {
      setShowConfetti(false);
    }, 2300);
  }, []);

  const triggerCrewReaction = useCallback((kind: 'bounce' | 'wobble') => {
    setCrewReaction(kind);
    if (reactionTimerRef.current !== null) {
      window.clearTimeout(reactionTimerRef.current);
    }
    reactionTimerRef.current = window.setTimeout(() => {
      setCrewReaction('idle');
    }, 1800);
  }, []);

  // Unlock background music strictly after the player's first tap or keypress
  useEffect(() => {
    const unlock = () => {
      markMusicUserInteracted();
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  // Pause music cleanly when tab is hidden or app goes to background
  useEffect(() => {
    const onVisChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    const onPageHide = () => setIsTabHidden(true);
    const onPageShow = () =>
      setIsTabHidden(document.visibilityState === 'hidden');

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // Sync music controller across screens, mute, volume, video/TTS ducking, and tab state
  useEffect(() => {
    updateMusicController({
      track: getMusicTrackForScreen(screen),
      isMuted,
      musicEnabled: !isMuted,
      musicVolume,
      isDucked: isVideoPlaying || isStorySpeaking,
      isTabHidden,
    });
  }, [screen, isMuted, musicVolume, isVideoPlaying, isStorySpeaking, isTabHidden]);

  useEffect(() => {
    return () => {
      stopAllMusic();
      if (confettiTimerRef.current !== null) {
        window.clearTimeout(confettiTimerRef.current);
      }
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
      }
    };
  }, []);

  // Fetch all NASA data once on game start (cached 6h in localStorage, 8s timeout per request)
  useEffect(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    let active = true;
    fetchAllNasaMissionData().then((bundle) => {
      if (!active) return;
      setNasaInfo(bundle);
      setNasaFetchDone(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-advance from Contacting NASA screen as soon as fetch settles
  useEffect(() => {
    if (screen === 'CONTACTING_NASA' && nasaFetchDone) {
      setScreen('INTRO_VIDEO');
    }
  }, [screen, nasaFetchDone]);

  // Sync document.body.dataset.state for accessibility & verification
  useEffect(() => {
    if (screen === 'SPLASH' || screen === 'MENU') {
      document.body.dataset.state = 'title';
    } else if (
      screen === 'FAIL_VIDEO' ||
      screen === 'DEBRIEF' ||
      screen === 'ENDING'
    ) {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen]);

  // Gentle mobile vibration + soft boop chime if any system drops under 30
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const { power, airWater, radiation, food, mood } = gameState.meters;
    if (
      power < 30 ||
      airWater < 30 ||
      radiation < 30 ||
      food < 30 ||
      mood < 30
    ) {
      triggerWarningVibration();
      playSound('warning', isMuted);
    }
  }, [screen, gameState.day, gameState.meters, isMuted]);

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
  }, []);

  const handleToggleSound = useCallback(() => {
    markMusicUserInteracted();
    setIsMuted((prev) => {
      const next = !prev;
      saveMutedPreference(next);
      saveMusicEnabledPreference(!next);
      if (!next) {
        playSound('tap', false);
      }
      return next;
    });
  }, []);

  const handleToggleEasyMode = useCallback(() => {
    setEasyMode((prev) => {
      const next = !prev;
      saveEasyModePreference(next);
      playSound('tap', isMuted);
      return next;
    });
  }, [isMuted]);

  const handleChangeMusicVolume = useCallback((vol: number) => {
    markMusicUserInteracted();
    const clamped = Math.max(0, Math.min(1, vol));
    setMusicVolume(clamped);
    saveMusicVolumePreference(clamped);
  }, []);

  const startNewMission = useCallback(
    (skipIntro = false) => {
      playSound('tap', isMuted);
      const fresh = createInitialGameState();
      const initialCp: CheckpointSnapshot = { savedAtDay: 1, state: fresh };
      setGameState(fresh);
      setToastBanner(null);
      setInspectMeter(null);
      setActiveMiniGame(null);
      saveGameProgress(fresh);
      saveCheckpoint(fresh);
      setSavedProgress(fresh);
      setCheckpoint(initialCp);

      if (skipIntro) {
        setScreen('DAY_TITLE');
      } else if (!nasaFetchDone) {
        setScreen('CONTACTING_NASA');
      } else {
        setScreen('INTRO_VIDEO');
      }
    },
    [isMuted, nasaFetchDone]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (screen === 'SPLASH' || screen === 'MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (screen === 'SPLASH') {
            playSound('tap', isMuted);
            setScreen('MENU');
          } else if (!showSettings) {
            startNewMission(false);
          }
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleSound();
      } else if (e.key === 'Escape') {
        setInspectMeter(null);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, isMuted, showSettings, startNewMission, handleToggleSound]);

  const handleResumeSaved = () => {
    if (!savedProgress) return;
    playSound('tap', isMuted);
    setGameState(savedProgress);
    setToastBanner(null);
    setScreen('PLAYING');
  };

  const handleActivateAbility = (crewId: CrewId, overclockMeter?: MeterKey) => {
    const { nextState, message, triggeredFullDayResult } = activateCrewAbility(
      gameState,
      crewId,
      {
        overclockMeter,
        stormLevel: nasaInfo.stormLevel,
        nasaInfo,
      }
    );
    showToast(message);

    if (triggeredFullDayResult) {
      triggerCrewReaction('bounce');
      setGameState(nextState);
      saveGameProgress(nextState);
      setSavedProgress(nextState);
      if (nextState.failReason) {
        fadeMusicOutOnFail();
        triggerWarningVibration();
        setScreen('FAIL_VIDEO');
      } else {
        playSound('boost', isMuted);
        if (nextState.lastResult?.dayStars === 3) {
          playWinJingle(isMuted, musicVolume);
        }
        setScreen('RESULT');
      }
      return;
    }

    if (nextState !== gameState) {
      playSound('boost', isMuted);
      triggerCrewReaction('bounce');
      setGameState(nextState);
      saveGameProgress(nextState);
      setSavedProgress(nextState);
    } else {
      playSound('warning', isMuted);
      triggerCrewReaction('wobble');
    }
  };

  const finalizeDayChoice = (
    choice: DayChoice,
    miniGameSucceeded?: boolean
  ) => {
    const nextState = resolveDayTurn(gameState, choice, {
      stormLevel: nasaInfo.stormLevel,
      nasaInfo,
      miniGameSucceeded,
    });
    setToastBanner(null);
    setGameState(nextState);
    saveGameProgress(nextState);
    setSavedProgress(nextState);

    if (nextState.failReason) {
      fadeMusicOutOnFail();
      triggerWarningVibration();
      triggerCrewReaction('wobble');
      setScreen('FAIL_VIDEO');
    } else {
      if (choice.miniGame && miniGameSucceeded) {
        triggerConfetti();
        triggerCrewReaction('bounce');
        playSound('star', isMuted);
      } else if (choice.miniGame && miniGameSucceeded === false) {
        triggerCrewReaction('wobble');
        playSound('warning', isMuted);
      } else {
        playSound('star', isMuted);
        triggerCrewReaction('bounce');
      }
      if (nextState.lastResult?.dayStars === 3) {
        playWinJingle(isMuted, musicVolume);
      }
      if (
        nextState.lastResult?.triageAutoSaved ||
        nextState.lastResult?.moodZeroTriggered
      ) {
        triggerWarningVibration();
        triggerCrewReaction('wobble');
      }
      setScreen('RESULT');
    }
  };

  const handleSelectChoice = (choice: DayChoice) => {
    playSound('tap', isMuted);
    if (choice.miniGame) {
      setActiveMiniGame({ kind: 'choice', choice });
      return;
    }
    finalizeDayChoice(choice);
  };

  const handleAnswerQuickQuestion = (optionIndex: 0 | 1 | 2) => {
    const prevStars = gameState.lastResult?.dayStars ?? 0;
    const { nextState, isCorrect } = answerResultQuickQuestion(
      gameState,
      optionIndex
    );
    if (nextState !== gameState) {
      if (isCorrect) {
        playSound('jingle', isMuted);
        triggerConfetti();
        setEarnedPatches(loadEarnedMissionPatches());
        if (prevStars < 3 && nextState.lastResult?.dayStars === 3) {
          playWinJingle(isMuted, musicVolume);
        }
      } else {
        playSound('tap', isMuted);
      }
      setGameState(nextState);
      saveGameProgress(nextState);
      setSavedProgress(nextState);
    }
  };

  const handleResultContinue = () => {
    const nextState = advanceToNextDay(gameState);
    setToastBanner(null);

    if (nextState.failReason) {
      fadeMusicOutOnFail();
      triggerWarningVibration();
      setGameState(nextState);
      setScreen('FAIL_VIDEO');
      return;
    }

    if (nextState.day === 4 || nextState.day === 7) {
      saveCheckpoint(nextState);
      setCheckpoint({ savedAtDay: nextState.day, state: nextState });
    }

    playSound('tap', isMuted);
    setGameState(nextState);
    saveGameProgress(nextState);
    setSavedProgress(nextState);

    if (nextState.day === 3 || nextState.day === 6 || nextState.day === 8) {
      setScreen('CRISIS_CLIP');
    } else {
      setScreen('DAY_TITLE');
    }
  };

  const handleDay10SafetyCheck = () => {
    const { nextState, message } = runDay10SafetyCheck(gameState);
    if (nextState !== gameState) {
      playSound('boost', isMuted);
      triggerCrewReaction('bounce');
      setGameState(nextState);
      saveGameProgress(nextState);
      setSavedProgress(nextState);
    } else {
      playSound('warning', isMuted);
      triggerCrewReaction('wobble');
    }
    showToast(message);
  };

  const handleDay10Launch = () => {
    playSound('tap', isMuted);
    setActiveMiniGame({ kind: 'launch' });
  };

  const finalizeDay10Launch = () => {
    const finalState = attemptDay10Launch(gameState);
    setGameState(finalState);

    if (finalState.failReason) {
      fadeMusicOutOnFail();
      triggerWarningVibration();
      setScreen('FAIL_VIDEO');
    } else {
      playSound('success', isMuted);
      playWinJingle(isMuted, musicVolume);
      triggerConfetti();
      clearSavedMission();
      setSavedProgress(null);
      setScreen('ENDING');
    }
  };

  const handleRetryCheckpoint = () => {
    const cp = checkpoint ?? loadCheckpoint();
    playSound('tap', isMuted);
    if (cp) {
      setGameState(cp.state);
      saveGameProgress(cp.state);
      setSavedProgress(cp.state);
    } else {
      const fresh = createInitialGameState();
      setGameState(fresh);
    }
    setToastBanner(null);
    setScreen('DAY_TITLE');
  };

  const currentDayDef = MISSION_DAYS.find((d) => d.day === gameState.day)!;
  const orderedChoices = getOrderedChoicesForDay(gameState);
  const launchReq = getLaunchRequirements(gameState);
  const canLaunch =
    gameState.meters.power >= launchReq.power &&
    gameState.meters.airWater >= launchReq.airWater &&
    gameState.meters.radiation >= launchReq.radiation &&
    gameState.meters.food >= launchReq.food;

  const isWideInfoScreen =
    screen === 'ABOUT_SYSTEMS' ||
    screen === 'NASA_DATA' ||
    screen === 'CREW' ||
    screen === 'HOW_TO_PLAY' ||
    screen === 'RESULT' ||
    screen === 'ENDING';

  const combinedPatchDays = useMemo(() => {
    const set = new Set<number>([
      ...earnedPatches,
      ...gameState.patchEarnedDays,
    ]);
    return Array.from(set).sort((a, b) => a - b);
  }, [earnedPatches, gameState.patchEarnedDays]);

  const isDistractionFreeMusic =
    Boolean(activeMiniGame) ||
    screen === 'DAY_TITLE' ||
    screen === 'INTRO_VIDEO' ||
    screen === 'CRISIS_CLIP' ||
    screen === 'FAIL_VIDEO' ||
    (screen === 'ENDING' && isGoldVideoActive);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-x-hidden flex flex-col items-center">
      <MoonFooterArt />
      <OfflineIndicator />
      <ConfettiBurst active={showConfetti} />

      <MusicControl
        soundEnabled={!isMuted}
        musicVolume={musicVolume}
        distractionFree={isDistractionFreeMusic}
        onToggleSound={handleToggleSound}
        onChangeVolume={handleChangeMusicVolume}
      />

      {screen === 'PLAYING' ? (
        <main
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
          className="relative z-10 w-full max-w-[960px] px-3 sm:px-6 pb-20 flex-1 flex flex-col gap-2"
        >
          {/* Top Mission Header */}
          <header className="flex items-center justify-between gap-1.5 sm:gap-2 pr-[54px] sm:pr-[62px]">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <img
                src="/icon.svg"
                alt="Moon Base"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-[#FFF8E7] shrink-0"
              />
              <div className="text-[#FFF8E7] min-w-0">
                <p className="text-[12px] sm:text-[15px] font-bold text-amber-300 leading-none whitespace-nowrap">
                  Day {gameState.day}/10 · Before Sunset
                </p>
                <h1 className="font-display text-[17px] sm:text-[26px] font-bold leading-tight whitespace-nowrap">
                  Moon Base Mission
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="Open Settings"
                className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] rounded-[13px] sm:rounded-[16px] bg-[#FFF8E7] border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] flex items-center justify-center text-[#0B1736] hover:bg-amber-50 active:translate-y-0.5 transition"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound('tap', isMuted);
                  setScreen('MENU');
                }}
                aria-label="Open main menu"
                className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] rounded-[13px] sm:rounded-[16px] bg-[#FFF8E7] border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] flex items-center justify-center text-[#0B1736] hover:bg-amber-50 active:translate-y-0.5 transition"
              >
                <Home className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </header>

          {/* 10-Dot Mission Trail */}
          <MissionTrail currentDay={gameState.day} />

          {/* 4 Equal Base Systems in a 2x2 Grid + Mood & Science Stars */}
          <TopHudMeters
            meters={gameState.meters}
            onInspectMeter={(m) => {
              playSound('tap', isMuted);
              setInspectMeter(m);
            }}
          />

          {toastBanner && (
            <div
              role="status"
              className="rounded-[16px] bg-amber-300 border-[2.5px] border-[#0B1736] px-4 py-2 text-[17px] font-bold text-[#0B1736] shadow-[0_3px_0_#0B1736] text-center"
            >
              {toastBanner}
            </div>
          )}

          {/* Middle Day Card */}
          <DayCard
            dayDef={currentDayDef}
            gameState={gameState}
            nasaInfo={nasaInfo}
            dayPhoto={nasaInfo.dayPhotos[gameState.day]}
            orderedChoices={orderedChoices}
            launchReq={launchReq}
            canLaunch={canLaunch}
            onSelectChoice={handleSelectChoice}
            onSafetyCheck={handleDay10SafetyCheck}
            onLaunch={handleDay10Launch}
            onSpeakingChange={setIsStorySpeaking}
          />

          {/* Bottom Crew Circles + 1-line Speech Bubble */}
          <CrewBar
            gameState={gameState}
            stormLevel={nasaInfo.stormLevel}
            crewReaction={crewReaction}
            onActivateAbility={handleActivateAbility}
          />

          {inspectMeter && (
            <MissionControlCardModal
              meterKey={inspectMeter}
              value={gameState.meters[inspectMeter]}
              onClose={() => setInspectMeter(null)}
            />
          )}

          {activeMiniGame && (
            <MiniGameModal
              config={
                activeMiniGame.kind === 'choice'
                  ? activeMiniGame.choice.miniGame!
                  : DAY10_LAUNCH_MINIGAME
              }
              easyMode={easyMode}
              isMuted={isMuted}
              launchMeters={
                activeMiniGame.kind === 'launch' ? gameState.meters : undefined
              }
              launchReq={
                activeMiniGame.kind === 'launch' ? launchReq : undefined
              }
              onComplete={(succeeded) => {
                const pending = activeMiniGame;
                setActiveMiniGame(null);
                if (pending.kind === 'choice') {
                  finalizeDayChoice(pending.choice, succeeded);
                } else {
                  finalizeDay10Launch();
                }
              }}
            />
          )}
        </main>
      ) : (
        <main
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
          className={`relative z-10 w-full px-3 sm:px-5 pb-24 my-auto ${
            isWideInfoScreen ? 'max-w-[920px]' : 'max-w-[560px]'
          }`}
        >
          {screen === 'SPLASH' && (
            <SplashScreen
              onContinue={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'MENU' && (
            <MainMenuScreen
              onPlayNew={() => startNewMission(false)}
              onResumeSaved={handleResumeSaved}
              hasSavedGame={Boolean(
                savedProgress &&
                  !savedProgress.failReason &&
                  !savedProgress.endingTier
              )}
              savedDay={savedProgress?.day}
              easyMode={easyMode}
              onOpenSettings={() => {
                playSound('tap', isMuted);
                setShowSettings(true);
              }}
              onOpenAboutSystems={() => {
                playSound('tap', isMuted);
                setScreen('ABOUT_SYSTEMS');
              }}
              onOpenHowToPlay={() => {
                playSound('tap', isMuted);
                setScreen('HOW_TO_PLAY');
              }}
              onOpenCrew={() => {
                playSound('tap', isMuted);
                setScreen('CREW');
              }}
              onOpenNasaData={() => {
                playSound('tap', isMuted);
                setScreen('NASA_DATA');
              }}
            />
          )}

          {screen === 'CONTACTING_NASA' && (
            <ContactingNasaScreen
              onStartNow={() => {
                playSound('tap', isMuted);
                setScreen('INTRO_VIDEO');
              }}
            />
          )}

          {screen === 'ABOUT_SYSTEMS' && (
            <AboutSystemsScreen
              onBack={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'HOW_TO_PLAY' && (
            <HowToPlayScreen
              onBack={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'CREW' && (
            <CrewScreen
              earnedPatchDays={combinedPatchDays}
              onBack={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'NASA_DATA' && (
            <AboutNasaScreen
              nasaInfo={nasaInfo}
              onBack={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'INTRO_VIDEO' && (
            <VideoStage
              src={VIDEO_CONFIG.intro}
              title="Four Cats, One Moon Dream"
              caption="Our four cat friends land near the Moon’s south pole 10 days before sunset. Help them survive and launch home!"
              variant="intro"
              onPlayingChange={setIsVideoPlaying}
              onComplete={() => {
                playSound('tap', isMuted);
                setScreen('DAY_TITLE');
              }}
            />
          )}

          {screen === 'CRISIS_CLIP' && (
            <VideoStage
              src={VIDEO_CONFIG.crisis}
              title={`Day ${gameState.day}: ${currentDayDef.title}`}
              caption={currentDayDef.story}
              variant="crisis"
              onPlayingChange={setIsVideoPlaying}
              onComplete={() => {
                playSound('tap', isMuted);
                setScreen('DAY_TITLE');
              }}
            />
          )}

          {screen === 'DAY_TITLE' && (
            <DayTitleCardScreen
              day={gameState.day}
              onNext={() => {
                playSound('tap', isMuted);
                setScreen('PLAYING');
              }}
            />
          )}

          {screen === 'RESULT' && gameState.lastResult && (
            <ResultScreen
              result={gameState.lastResult}
              onAnswerQuickQuestion={handleAnswerQuickQuestion}
              onContinue={handleResultContinue}
            />
          )}

          {screen === 'FAIL_VIDEO' && (
            <VideoStage
              src={VIDEO_CONFIG.fail}
              title="Emergency Return Pod"
              caption="The rescue pod brought our four cat astronauts safely back to orbit. Let’s learn the real science!"
              variant="fail"
              onPlayingChange={setIsVideoPlaying}
              onComplete={() => {
                playSound('tap', isMuted);
                setScreen('DEBRIEF');
              }}
            />
          )}

          {screen === 'DEBRIEF' && gameState.failReason && (
            <DebriefScreen
              failReason={gameState.failReason}
              dayReached={gameState.day}
              checkpoint={checkpoint}
              onRetryCheckpoint={handleRetryCheckpoint}
              onRestartDay1={() => startNewMission(true)}
              onBackToMenu={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}

          {screen === 'ENDING' && gameState.endingTier && (
            <VideoEndingWrapper
              tier={gameState.endingTier}
              gameState={gameState}
              earnedPatchDays={combinedPatchDays}
              onPlayingChange={setIsVideoPlaying}
              onGoldVideoActiveChange={setIsGoldVideoActive}
              onPlayAgain={() => startNewMission(true)}
              onBackToMenu={() => {
                playSound('tap', isMuted);
                setScreen('MENU');
              }}
            />
          )}
        </main>
      )}

      {showSettings && (
        <SettingsModal
          easyMode={easyMode}
          onToggleEasyMode={handleToggleEasyMode}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

const VideoEndingWrapper: React.FC<{
  tier: 'GOLD' | 'SILVER';
  gameState: GameState;
  earnedPatchDays: number[];
  onPlayingChange: (isPlaying: boolean) => void;
  onGoldVideoActiveChange: (active: boolean) => void;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}> = ({
  tier,
  gameState,
  earnedPatchDays,
  onPlayingChange,
  onGoldVideoActiveChange,
  onPlayAgain,
  onBackToMenu,
}) => {
  const [showSummary, setShowSummary] = useState(tier === 'SILVER');

  useEffect(() => {
    const active = tier === 'GOLD' && !showSummary;
    onGoldVideoActiveChange(active);
    return () => onGoldVideoActiveChange(false);
  }, [tier, showSummary, onGoldVideoActiveChange]);

  if (!showSummary && tier === 'GOLD') {
    return (
      <VideoStage
        src={VIDEO_CONFIG.gold}
        title="Gold Rescue Liftoff!"
        caption="Hooray! All four cat astronauts lifted off before lunar sunset with top Moon science!"
        variant="gold"
        onPlayingChange={onPlayingChange}
        onComplete={() => setShowSummary(true)}
      />
    );
  }

  return (
    <EndingScreen
      tier={tier}
      gameState={gameState}
      earnedPatchDays={earnedPatchDays}
      onPlayAgain={onPlayAgain}
      onBackToMenu={onBackToMenu}
    />
  );
};
