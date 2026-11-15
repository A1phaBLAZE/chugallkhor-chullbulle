import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  FastForward,
  Globe,
  HelpCircle,
  Lightbulb,
  Radio,
  Rocket,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  XCircle,
  Zap,
} from 'lucide-react';
import { Meters, MiniGameConfig } from '../game/types';
import { playSound } from '../utils/soundFx';

interface MiniGameModalProps {
  config: MiniGameConfig;
  easyMode: boolean;
  isMuted: boolean;
  launchMeters?: Meters;
  launchReq?: { power: number; airWater: number; radiation: number; food: number };
  onComplete: (succeeded: boolean) => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  config,
  easyMode,
  isMuted,
  launchMeters,
  launchReq,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'PLAYING' | 'DONE'>('PLAYING');
  const [succeeded, setSucceeded] = useState(false);
  const [wasSkipped, setWasSkipped] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(config.durationSec * 1000);
  const [shakeCard, setShakeCard] = useState(false);

  const finishGame = (didWin: boolean, skipped = false) => {
    if (phase === 'DONE') return;
    setSucceeded(didWin);
    setWasSkipped(skipped);
    setPhase('DONE');
    playSound(didWin ? 'jingle' : 'ohno', isMuted);
  };

  // Countdown bar (paused in Easy Mode)
  useEffect(() => {
    if (phase !== 'PLAYING' || easyMode) return;
    const start = Date.now();
    const total = config.durationSec * 1000;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const rem = Math.max(0, total - elapsed);
      setTimeLeftMs(rem);
      if (rem <= 0) {
        window.clearInterval(id);
        setSucceeded(false);
        setWasSkipped(false);
        setPhase('DONE');
        playSound('ohno', isMuted);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, easyMode, config.durationSec, isMuted]);

  // Easy Mode: auto-complete gently after 550ms (launch_checklist still checks real launch minimums!)
  useEffect(() => {
    if (!easyMode || phase !== 'PLAYING') return;
    const t = window.setTimeout(() => {
      const didPass =
        config.id === 'launch_checklist' && launchMeters && launchReq
          ? launchMeters.power >= launchReq.power &&
            launchMeters.airWater >= launchReq.airWater &&
            launchMeters.radiation >= launchReq.radiation &&
            launchMeters.food >= launchReq.food
          : true;
      setSucceeded(didPass);
      setPhase('DONE');
      playSound(didPass ? 'jingle' : 'ohno', isMuted);
    }, 550);
    return () => window.clearTimeout(t);
  }, [easyMode, phase, isMuted, config.id, launchMeters, launchReq]);

  const progressPct = Math.max(
    0,
    Math.min(100, (timeLeftMs / (config.durationSec * 1000)) * 100)
  );

  const triggerShake = () => {
    setShakeCard(true);
    window.setTimeout(() => setShakeCard(false), 450);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Mini-game: ${config.title}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}
      className="fixed inset-0 z-50 bg-[#070E27]/85 flex items-start justify-center px-3 pb-3 sm:px-4 sm:pb-4 overflow-y-auto"
    >
      <div
        className={`storybook-card w-full max-w-lg my-auto p-4 sm:p-5 space-y-3 animate-screen-enter ${
          shakeCard ? 'animate-soft-shake' : ''
        }`}
      >
        {/* Header with tiny How to Play help toggle */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-bold text-[#1D4ED8] uppercase tracking-wide">
              Quick Hands-On Mini-Game
            </p>
            <h2 className="font-display text-[26px] sm:text-[30px] font-bold text-[#0B1736] leading-tight">
              {config.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('tap', isMuted);
              setShowHelp((prev) => !prev);
            }}
            aria-label="How to play"
            className="min-h-[44px] px-3 rounded-xl bg-sky-100 border-2 border-[#0B1736] text-[14px] font-bold text-[#0B1736] flex items-center gap-1 shrink-0 hover:bg-sky-200"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How to play</span>
          </button>
        </div>

        {showHelp && (
          <div className="rounded-xl bg-sky-100 border-2 border-[#0B1736] px-3 py-2 text-[16px] font-semibold text-[#0B1736]">
            {config.howToPlay}
          </div>
        )}

        {/* Friendly countdown bar */}
        {phase === 'PLAYING' && !easyMode && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[14px] font-bold text-[#0B1736]">
              <span>{config.howToPlay}</span>
              <span className="tabular-nums shrink-0 ml-2">
                {Math.ceil(timeLeftMs / 1000)}s
              </span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-slate-200 border-2 border-[#0B1736] overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  progressPct < 30 ? 'bg-amber-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'PLAYING' && easyMode && (
          <div className="rounded-xl bg-emerald-200 border-2 border-[#0B1736] px-3 py-2 text-center text-[17px] font-bold text-[#0B1736]">
            Easy Mode ON — Crew helping automatically!
          </div>
        )}

        {/* Arena or Completion View */}
        {phase === 'PLAYING' ? (
          <>
            <div className="rounded-[18px] bg-[#0B1736] border-[3px] border-[#0B1736] p-3 text-[#FFF8E7]">
              {config.id === 'wipe_dust' && (
                <WipeDustArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'pop_co2' && (
                <PopCo2Arena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'stack_tanks' && (
                <StackTanksArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'water_plants' && (
                <WaterPlantsArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'face_sun' && (
                <FaceSunArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'find_ice' && (
                <FindIceArena
                  isMuted={isMuted}
                  onWrongTap={triggerShake}
                  onWin={() => finishGame(true)}
                  onOutOfTries={() => finishGame(false)}
                />
              )}
              {config.id === 'pedal_power' && (
                <PedalPowerArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'spacewalk_dash' && (
                <SpacewalkDashArena
                  isMuted={isMuted}
                  progressPct={100 - progressPct}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'point_antenna' && (
                <PointAntennaArena
                  isMuted={isMuted}
                  onWin={() => finishGame(true)}
                />
              )}
              {config.id === 'launch_checklist' && launchMeters && launchReq && (
                <LaunchChecklistArena
                  isMuted={isMuted}
                  meters={launchMeters}
                  req={launchReq}
                  onFinished={(allReady) => finishGame(allReady)}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => finishGame(false, true)}
              className="w-full glossy-btn bg-slate-200 text-[#0B1736] text-[19px] font-bold flex items-center justify-center gap-2"
            >
              <FastForward className="w-5 h-5" />
              <span>Skip Mini-Game</span>
            </button>
          </>
        ) : (
          <div className="space-y-3 animate-screen-enter">
            <div
              className={`rounded-[18px] border-[3px] border-[#0B1736] p-4 text-center ${
                succeeded ? 'bg-emerald-200' : 'bg-amber-100'
              }`}
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-[#FFF8E7] border-2 border-[#0B1736] flex items-center justify-center mb-2">
                {succeeded ? (
                  <Sparkles className="w-7 h-7 text-amber-500" />
                ) : (
                  <XCircle className="w-7 h-7 text-amber-700" />
                )}
              </div>
              <p className="font-display text-[26px] font-bold text-[#0B1736]">
                {config.id === 'launch_checklist'
                  ? succeeded
                    ? 'All 4 Lights Green — Ready!'
                    : 'Red Light! System Too Low!'
                  : succeeded
                    ? easyMode
                      ? 'Easy Mode Win!'
                      : 'Great Job! Full Boost!'
                    : wasSkipped
                      ? 'Skipped — Half Boost Earned!'
                      : 'Time Up — Half Boost Earned!'}
              </p>
              <p className="mt-1.5 text-[18px] font-semibold text-[#0B1736] leading-snug">
                {config.astronautFactLine}
              </p>
            </div>

            <button
              type="button"
              data-testid="minigame-next"
              onClick={() => onComplete(succeeded)}
              className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* 1. Day 1: Wipe the dust (swipe pointer across >= 10 of 12 dusty patches = 83%+) */
const WipeDustArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const [cleaned, setCleaned] = useState<boolean[]>(() => Array(12).fill(false));
  const [isSwiping, setIsSwiping] = useState(false);

  const wipeAtPoint = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const tile = el?.closest('[data-dust-idx]') as HTMLElement | null;
    if (!tile) return;
    const idx = Number(tile.dataset.dustIdx);
    if (Number.isNaN(idx)) return;
    setCleaned((prev) => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      playSound('pop', isMuted);
      const count = next.filter(Boolean).length;
      if (count >= 10) {
        window.setTimeout(onWin, 120);
      }
      return next;
    });
  };

  const pct = Math.round((cleaned.filter(Boolean).length / 12) * 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Solar Panel Cleanliness</span>
        <span className="text-amber-300 tabular-nums">{pct}% / 80%</span>
      </div>
      <div
        className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-sky-950 border-2 border-sky-400 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          setIsSwiping(true);
          wipeAtPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (isSwiping) wipeAtPoint(e.clientX, e.clientY);
        }}
        onPointerUp={() => setIsSwiping(false)}
        onPointerCancel={() => setIsSwiping(false)}
      >
        {cleaned.map((isClean, i) => (
          <div
            key={i}
            data-dust-idx={i}
            className={`h-14 sm:h-16 rounded-xl border-2 flex items-center justify-center font-bold text-[14px] transition-all select-none ${
              isClean
                ? 'bg-sky-400 border-amber-300 text-[#0B1736]'
                : 'bg-slate-500 border-slate-300 text-slate-100'
            }`}
          >
            {isClean ? '✨ Clean' : 'Dusty'}
          </div>
        ))}
      </div>
    </div>
  );
};

/* 2. Day 2: Pop 8 floating CO2 bubbles */
const PopCo2Arena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const spots = useMemo(
    () => [
      { id: 0, left: '8%', top: '12%' },
      { id: 1, left: '34%', top: '8%' },
      { id: 2, left: '62%', top: '14%' },
      { id: 3, left: '78%', top: '36%' },
      { id: 4, left: '16%', top: '52%' },
      { id: 5, left: '44%', top: '42%' },
      { id: 6, left: '24%', top: '72%' },
      { id: 7, left: '66%', top: '68%' },
    ],
    []
  );
  const [popped, setPopped] = useState<boolean[]>(() => Array(8).fill(false));

  const popOne = (idx: number) => {
    setPopped((prev) => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      playSound('pop', isMuted);
      if (next.every(Boolean)) {
        window.setTimeout(onWin, 120);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Pop CO2 Bubbles</span>
        <span className="text-sky-300 tabular-nums">
          {popped.filter(Boolean).length} / 8
        </span>
      </div>
      <div
        className="relative h-56 rounded-xl bg-gradient-to-b from-sky-900 to-[#0B1736] border-2 border-sky-400 overflow-hidden select-none"
        style={{ touchAction: 'none' }}
      >
        {spots.map((b, i) =>
          popped[i] ? null : (
            <button
              key={b.id}
              type="button"
              onPointerDown={() => popOne(i)}
              style={{ left: b.left, top: b.top, animationDelay: `${i * 180}ms` }}
              className="absolute w-14 h-14 rounded-full bg-amber-300 text-[#0B1736] border-[2.5px] border-white font-bold text-[15px] shadow-md flex items-center justify-center animate-float-slow active:scale-90"
            >
              CO₂
            </button>
          )
        )}
      </div>
    </div>
  );
};

/* 3. Day 3: Stack 3 blue water tanks onto glowing storm shelter outlines */
const StackTanksArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const [placedSlots, setPlacedSlots] = useState<(number | null)[]>([
    null,
    null,
    null,
  ]);
  const [selectedTank, setSelectedTank] = useState<number | null>(null);
  const [draggingTank, setDraggingTank] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const placedTanks = new Set(placedSlots.filter((t): t is number => t !== null));

  const placeTankInSlot = (tankId: number, slotIdx: number) => {
    setPlacedSlots((prev) => {
      if (prev[slotIdx] !== null || prev.includes(tankId)) return prev;
      const next = [...prev];
      next[slotIdx] = tankId;
      playSound('build', isMuted);
      if (next.every((s) => s !== null)) {
        window.setTimeout(onWin, 140);
      }
      return next;
    });
    setSelectedTank(null);
  };

  const handlePointerDrop = (clientX: number, clientY: number) => {
    if (draggingTank === null) return;
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest('[data-tank-slot]') as HTMLElement | null;
    if (slotEl) {
      const slotIdx = Number(slotEl.dataset.tankSlot);
      if (!Number.isNaN(slotIdx)) {
        placeTankInSlot(draggingTank, slotIdx);
      }
    }
    setDraggingTank(null);
    setDragPos(null);
  };

  return (
    <div
      ref={arenaRef}
      className="space-y-3 select-none relative"
      style={{ touchAction: 'none' }}
      onPointerMove={(e) => {
        if (draggingTank !== null) {
          setDragPos({ x: e.clientX, y: e.clientY });
        }
      }}
      onPointerUp={(e) => handlePointerDrop(e.clientX, e.clientY)}
      onPointerCancel={() => {
        setDraggingTank(null);
        setDragPos(null);
      }}
    >
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Storm Shelter Armor</span>
        <span className="text-sky-300 tabular-nums">
          {placedTanks.size} / 3 Tanks
        </span>
      </div>

      {/* 3 Glowing Outline Slots around the Shelter */}
      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-900 border-2 border-purple-400">
        {['Left Wall', 'Roof Top', 'Right Wall'].map((slotLabel, idx) => {
          const filled = placedSlots[idx] !== null;
          return (
            <button
              key={slotLabel}
              type="button"
              data-tank-slot={idx}
              onClick={() => {
                if (!filled && selectedTank !== null) {
                  placeTankInSlot(selectedTank, idx);
                }
              }}
              className={`min-h-[72px] rounded-xl border-[2.5px] flex flex-col items-center justify-center gap-1 text-[13px] font-bold transition ${
                filled
                  ? 'bg-sky-400 border-white text-[#0B1736]'
                  : 'bg-sky-950/70 border-dashed border-sky-300 text-sky-200 animate-pulse'
              }`}
            >
              <Droplets className="w-5 h-5" />
              <span>{filled ? 'Shielded!' : slotLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 3 Draggable Water Tanks */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {[0, 1, 2].map((tankId) => {
          const used = placedTanks.has(tankId);
          return (
            <button
              key={tankId}
              type="button"
              disabled={used}
              onPointerDown={(e) => {
                if (used) return;
                setSelectedTank(tankId);
                setDraggingTank(tankId);
                setDragPos({ x: e.clientX, y: e.clientY });
              }}
              className={`min-h-[56px] px-3.5 rounded-xl border-2 border-white font-bold text-[15px] flex items-center gap-1.5 transition ${
                used
                  ? 'bg-slate-700 text-slate-400 border-slate-600 opacity-40'
                  : selectedTank === tankId
                    ? 'bg-sky-300 text-[#0B1736] ring-2 ring-amber-300'
                    : 'bg-sky-500 text-white hover:bg-sky-400'
              }`}
            >
              <Droplets className="w-5 h-5" />
              <span>Tank {tankId + 1}</span>
            </button>
          );
        })}
      </div>

      {draggingTank !== null && dragPos && (
        <div
          className="fixed z-[60] pointer-events-none px-3 py-2 rounded-xl bg-sky-400 text-[#0B1736] border-2 border-white font-bold text-[15px] shadow-xl flex items-center gap-1"
          style={{
            left: dragPos.x - 44,
            top: dragPos.y - 24,
          }}
        >
          <Droplets className="w-4 h-4" />
          <span>Tank {draggingTank + 1}</span>
        </div>
      )}
    </div>
  );
};

/* 4. Day 4: Tap 5 plants once, then tap the Light button */
const WaterPlantsArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const [watered, setWatered] = useState<boolean[]>(() => Array(5).fill(false));
  const [lightOn, setLightOn] = useState(false);

  const allWatered = watered.every(Boolean);

  const tapPlant = (idx: number) => {
    setWatered((prev) => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      playSound('pop', isMuted);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Veggie Plant Tray</span>
        <span className="text-emerald-300 tabular-nums">
          {watered.filter(Boolean).length} / 5 Watered
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {watered.map((isWet, idx) => (
          <button
            key={idx}
            type="button"
            onPointerDown={() => tapPlant(idx)}
            className={`min-h-[76px] rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[13px] font-bold transition ${
              isWet
                ? 'bg-emerald-300 border-white text-[#0B1736]'
                : 'bg-slate-800 border-amber-300 text-amber-100 hover:bg-slate-700'
            }`}
          >
            <Sprout className="w-6 h-6" />
            <span>{isWet ? 'Wet!' : 'Tap'}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!allWatered || lightOn}
        onClick={() => {
          setLightOn(true);
          playSound('boost', isMuted);
          window.setTimeout(onWin, 150);
        }}
        className={`w-full min-h-[56px] rounded-xl border-2 font-display text-[20px] font-bold flex items-center justify-center gap-2 transition ${
          allWatered
            ? 'bg-amber-400 border-white text-[#0B1736] animate-pulse'
            : 'bg-slate-800 border-slate-600 text-slate-400 opacity-60'
        }`}
      >
        <Lightbulb className="w-6 h-6" />
        <span>
          {allWatered ? 'Tap Grow Light ON!' : 'Water all 5 plants first'}
        </span>
      </button>
    </div>
  );
};

/* 5. Day 5: Move slider to tilt solar panel until power hits peak */
const FaceSunArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const [angle, setAngle] = useState(20);
  const targetAngle = 68;
  const diff = Math.abs(angle - targetAngle);
  const powerPct = Math.max(10, Math.round(100 - diff * 1.65));
  const hitPeak = powerPct >= 92;

  const wonRef = useRef(false);
  useEffect(() => {
    if (hitPeak && !wonRef.current) {
      wonRef.current = true;
      playSound('boost', isMuted);
      window.setTimeout(onWin, 250);
    }
  }, [hitPeak, isMuted, onWin]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Solar Panel Tilt</span>
        <span
          className={`tabular-nums ${
            hitPeak ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          Power Output: {powerPct}%
        </span>
      </div>

      <div className="h-28 rounded-xl bg-gradient-to-r from-[#0B1736] to-amber-900/60 border-2 border-amber-300 flex items-center justify-around px-4">
        <div
          className="w-24 h-6 rounded-lg bg-sky-400 border-2 border-white transition-transform"
          style={{ transform: `rotate(${angle - 55}deg)` }}
        />
        <Sun className="w-12 h-12 text-amber-300 animate-float-slow" />
      </div>

      <div className="h-4 w-full rounded-full bg-slate-800 border-2 border-white overflow-hidden">
        <div
          className={`h-full transition-all ${
            hitPeak ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
          style={{ width: `${powerPct}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={90}
        value={angle}
        aria-label="Tilt solar panel angle"
        onChange={(e) => setAngle(Number(e.target.value))}
        className="w-full h-10 accent-amber-400 cursor-pointer"
      />
    </div>
  );
};

/* 6. Day 6: Tap the glowing crater; wrong taps shake; rover gets 3 tries */
const FindIceArena: React.FC<{
  isMuted: boolean;
  onWrongTap: () => void;
  onWin: () => void;
  onOutOfTries: () => void;
}> = ({ isMuted, onWrongTap, onWin, onOutOfTries }) => {
  const [iceIndex] = useState(() => Math.floor(Math.random() * 4));
  const [triesLeft, setTriesLeft] = useState(3);

  const handleTap = (idx: number) => {
    if (idx === iceIndex) {
      playSound('boost', isMuted);
      window.setTimeout(onWin, 120);
      return;
    }
    const nextTries = triesLeft - 1;
    setTriesLeft(nextTries);
    onWrongTap();
    playSound('ohno', isMuted);
    if (nextTries <= 0) {
      window.setTimeout(onOutOfTries, 250);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Tap the Glowing Ice Crater</span>
        <span className="text-sky-300 tabular-nums">Tries: {triesLeft} / 3</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((idx) => {
          const isIce = idx === iceIndex;
          return (
            <button
              key={idx}
              type="button"
              onPointerDown={() => handleTap(idx)}
              className={`min-h-[82px] rounded-full border-[3px] font-bold text-[17px] flex items-center justify-center transition active:scale-95 ${
                isIce
                  ? 'bg-sky-900 border-cyan-300 text-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.7)] animate-pulse'
                  : 'bg-slate-800 border-slate-500 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Crater {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* 7. Day 7: Pedal power — 20 taps in 8 seconds */
const PedalPowerArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const [taps, setTaps] = useState(0);

  const handlePedal = () => {
    setTaps((prev) => {
      const next = prev + 1;
      playSound('pop', isMuted);
      if (next >= 20) {
        window.setTimeout(onWin, 100);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Workout Taps</span>
        <span className="text-emerald-300 tabular-nums">
          {Math.min(20, taps)} / 20
        </span>
      </div>

      <div className="h-4 w-full rounded-full bg-slate-800 border-2 border-white overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-all duration-75"
          style={{ width: `${Math.min(100, (taps / 20) * 100)}%` }}
        />
      </div>

      <button
        type="button"
        onPointerDown={handlePedal}
        className="w-full min-h-[96px] rounded-[18px] bg-amber-400 border-[3px] border-white text-[#0B1736] font-display text-[28px] font-bold active:scale-95 transition shadow-lg"
      >
        PEDAL FAST! 🚲
      </button>
    </div>
  );
};

/* 8. Day 8: Tap 8 handrails in order (1..8) before radiation-warning bar fills */
const SpacewalkDashArena: React.FC<{
  isMuted: boolean;
  progressPct: number;
  onWin: () => void;
}> = ({ isMuted, progressPct, onWin }) => {
  const [nextRail, setNextRail] = useState(1);

  const tapRail = (num: number) => {
    if (num !== nextRail) return;
    playSound('pop', isMuted);
    if (num === 8) {
      window.setTimeout(onWin, 120);
    } else {
      setNextRail(num + 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[14px] font-bold">
          <span>Radiation Warning Bar</span>
          <span className="text-rose-300 tabular-nums">
            {Math.min(100, Math.round(progressPct))}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-800 border border-white overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-75"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
          const done = num < nextRail;
          const isCurrent = num === nextRail;
          return (
            <button
              key={num}
              type="button"
              onPointerDown={() => tapRail(num)}
              className={`min-h-[60px] rounded-xl border-2 font-display text-[20px] font-bold transition ${
                done
                  ? 'bg-emerald-400 border-white text-[#0B1736]'
                  : isCurrent
                    ? 'bg-amber-400 border-white text-[#0B1736] animate-pulse'
                    : 'bg-slate-800 border-slate-500 text-slate-300'
              }`}
            >
              {done ? '✓' : num}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* 9. Day 9: Move slider until 5 signal bars fill and Earth lights up */
const PointAntennaArena: React.FC<{ isMuted: boolean; onWin: () => void }> = ({
  isMuted,
  onWin,
}) => {
  const [aim, setAim] = useState(15);
  const targetAim = 72;
  const dist = Math.abs(aim - targetAim);
  const bars =
    dist <= 6 ? 5 : dist <= 14 ? 4 : dist <= 24 ? 3 : dist <= 36 ? 2 : 1;
  const earthLit = bars === 5;

  const wonRef = useRef(false);
  useEffect(() => {
    if (earthLit && !wonRef.current) {
      wonRef.current = true;
      playSound('boost', isMuted);
      window.setTimeout(onWin, 250);
    }
  }, [earthLit, isMuted, onWin]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Aim Antenna Dish</span>
        <span
          className={`tabular-nums ${
            earthLit ? 'text-emerald-300' : 'text-sky-300'
          }`}
        >
          Signal: {bars} / 5
        </span>
      </div>

      <div className="h-28 rounded-xl bg-slate-900 border-2 border-sky-400 flex items-center justify-around px-4">
        <Radio
          className="w-11 h-11 text-amber-300 transition-transform"
          style={{ transform: `rotate(${aim - 65}deg)` }}
        />

        <div className="flex items-end gap-1.5 h-14">
          {[1, 2, 3, 4, 5].map((b) => (
            <div
              key={b}
              className={`w-3 rounded-t ${
                b <= bars ? 'bg-emerald-400' : 'bg-slate-700'
              }`}
              style={{ height: `${b * 10}px` }}
            />
          ))}
        </div>

        <Globe
          className={`w-12 h-12 transition-all ${
            earthLit
              ? 'text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)] scale-110'
              : 'text-slate-600'
          }`}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={aim}
        aria-label="Aim Earth antenna slider"
        onChange={(e) => setAim(Number(e.target.value))}
        className="w-full h-10 accent-sky-400 cursor-pointer"
      />
    </div>
  );
};

/* 10. Day 10 (always plays): Launch checklist — tap 4 system lights */
const LaunchChecklistArena: React.FC<{
  isMuted: boolean;
  meters: Meters;
  req: { power: number; airWater: number; radiation: number; food: number };
  onFinished: (allReady: boolean) => void;
}> = ({ isMuted, meters, req, onFinished }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const finishedRef = useRef(false);

  const items = [
    {
      key: 'power' as const,
      label: 'Power',
      val: meters.power,
      min: req.power,
      Icon: Zap,
    },
    {
      key: 'airWater' as const,
      label: 'Air & Water',
      val: meters.airWater,
      min: req.airWater,
      Icon: Droplets,
    },
    {
      key: 'radiation' as const,
      label: 'Radiation',
      val: meters.radiation,
      min: req.radiation,
      Icon: Shield,
    },
    {
      key: 'food' as const,
      label: 'Food',
      val: meters.food,
      min: req.food,
      Icon: Sprout,
    },
  ];

  const tapLight = (key: string, ok: boolean) => {
    setChecked((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      playSound(ok ? 'pop' : 'ohno', isMuted);
      if (Object.keys(next).length === 4 && !finishedRef.current) {
        finishedRef.current = true;
        const allOk = items.every((it) => it.val >= it.min);
        window.setTimeout(() => onFinished(allOk), 300);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>Tap All 4 Launch Lights</span>
        <span className="text-amber-300 tabular-nums">
          {Object.keys(checked).length} / 4 Checked
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => {
          const isChecked = Boolean(checked[it.key]);
          const ok = it.val >= it.min;
          const Icon = it.Icon;

          return (
            <button
              key={it.key}
              type="button"
              onPointerDown={() => tapLight(it.key, ok)}
              className={`min-h-[76px] rounded-xl border-2 px-3 py-2 flex items-center justify-between gap-2 font-bold transition ${
                !isChecked
                  ? 'bg-slate-800 border-amber-300 text-white hover:bg-slate-700'
                  : ok
                    ? 'bg-emerald-400 border-white text-[#0B1736]'
                    : 'bg-rose-400 border-white text-[#0B1736]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-5 h-5 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-[16px]">{it.label}</div>
                  <div className="text-[13px] tabular-nums">
                    {it.val} / {it.min}
                  </div>
                </div>
              </div>
              {isChecked ? (
                ok ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 shrink-0" />
                )
              ) : (
                <Rocket className="w-5 h-5 shrink-0 text-amber-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
