import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Droplets,
  Gamepad2,
  Heart,
  Image as ImageIcon,
  Rocket,
  Search,
  Shield,
  ShieldPlus,
  Sprout,
  Star,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  formatNasaCmeLine,
  formatNasaSepLine,
  formatNasaStormHeadline,
} from '../game/nasaService';
import {
  DayChoice,
  DayDefinition,
  GameState,
  NasaDayPhoto,
  NasaMissionBundle,
} from '../game/types';

interface DayCardProps {
  dayDef: DayDefinition;
  gameState: GameState;
  nasaInfo: NasaMissionBundle;
  dayPhoto?: NasaDayPhoto;
  orderedChoices: DayChoice[];
  launchReq: { power: number; airWater: number; radiation: number; food: number };
  canLaunch: boolean;
  onSelectChoice: (choice: DayChoice) => void;
  onSafetyCheck: () => void;
  onLaunch: () => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

function renderChoiceChips(choice: DayChoice, stormLevel: number) {
  const eff = choice.effect;
  const chips: {
    key: string;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    cls: string;
  }[] = [];

  if (eff.power) {
    chips.push({
      key: 'power',
      label: `Power ${eff.power > 0 ? '+' : ''}${eff.power}`,
      Icon: Zap,
      cls: 'bg-yellow-200 text-amber-950 border-amber-700',
    });
  }
  if (eff.airWater) {
    chips.push({
      key: 'airWater',
      label: `Air/Water ${eff.airWater > 0 ? '+' : ''}${eff.airWater}`,
      Icon: Droplets,
      cls: 'bg-sky-200 text-sky-950 border-sky-700',
    });
  }
  const radVal = eff.stormRadiationMultiplier
    ? eff.stormRadiationMultiplier * stormLevel
    : eff.radiation;
  if (radVal) {
    chips.push({
      key: 'radiation',
      label: `Radiation ${radVal > 0 ? '+' : ''}${radVal}`,
      Icon: Shield,
      cls: 'bg-purple-200 text-purple-950 border-purple-700',
    });
  }
  if (eff.food) {
    chips.push({
      key: 'food',
      label: `Food ${eff.food > 0 ? '+' : ''}${eff.food}`,
      Icon: Sprout,
      cls: 'bg-emerald-200 text-emerald-950 border-emerald-700',
    });
  }
  if (eff.mood) {
    chips.push({
      key: 'mood',
      label: `Mood ${eff.mood > 0 ? '+' : ''}${eff.mood}`,
      Icon: Heart,
      cls: 'bg-pink-200 text-pink-950 border-pink-700',
    });
  }
  if (eff.science) {
    chips.push({
      key: 'science',
      label: `Science ${eff.science > 0 ? '+' : ''}${eff.science}`,
      Icon: Star,
      cls: 'bg-amber-200 text-amber-950 border-amber-700',
    });
  }

  return chips;
}

export const DayCard: React.FC<DayCardProps> = ({
  dayDef,
  gameState,
  nasaInfo,
  dayPhoto,
  orderedChoices,
  launchReq,
  canLaunch,
  onSelectChoice,
  onSafetyCheck,
  onLaunch,
  onSpeakingChange,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showFactModal, setShowFactModal] = useState(false);

  const isBerryPreviewingTomorrow =
    gameState.deepScanRevealedForDay === gameState.day;

  useEffect(() => {
    setImgFailed(false);
    setShowFactModal(false);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    };
  }, [dayDef.day, onSpeakingChange]);

  const handleToggleListen = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      onSpeakingChange?.(false);
      return;
    }
    window.speechSynthesis.cancel();
    const text = `Day ${dayDef.day}: ${dayDef.title}. ${dayDef.story}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.05;
    utter.onend = () => {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    };
    utter.onerror = () => {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    };
    setIsSpeaking(true);
    onSpeakingChange?.(true);
    window.speechSynthesis.speak(utter);
  };

  const photoUrl = dayPhoto?.imageUrl;
  const showPhoto = Boolean(photoUrl && !imgFailed);

  return (
    <>
      <section
        aria-label={`Day ${dayDef.day}: ${dayDef.title}`}
        className="storybook-card p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start animate-screen-enter"
      >
        {/* Left Column on Desktop: Real NASA Photo + Tap-to-Open Magnifying Glass Fact Button */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="rounded-[16px] overflow-hidden border-[2.5px] border-[#0B1736] bg-[#102052]">
            {showPhoto ? (
              <img
                src={photoUrl!}
                alt={dayPhoto?.caption || dayDef.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-36 md:h-48 object-cover"
              />
            ) : (
              <div className="w-full h-32 md:h-48 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#172554] to-[#1E3A8A] text-[#FFF8E7]">
                <ImageIcon className="w-9 h-9 text-sky-300 mb-1.5" />
                <p className="text-[17px] font-bold">{dayDef.title}</p>
                <p className="text-[14px] text-sky-200">
                  NASA Photo Topic: {dayDef.photoQuery}
                </p>
              </div>
            )}
            <div className="bg-[#0B1736] text-[#FFF8E7] px-3 py-1.5 flex items-center justify-between gap-2 text-[14px]">
              <span className="truncate font-semibold">
                {dayPhoto?.caption || `NASA Archive: ${dayDef.title}`}
              </span>
              <span className="shrink-0 font-bold text-amber-300">
                Credit: NASA
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="did-you-know-btn"
            onClick={() => setShowFactModal(true)}
            className="w-full min-h-[52px] rounded-[16px] bg-sky-100 border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] px-3.5 py-2 flex items-center justify-between gap-2 text-[#0B1736] hover:bg-sky-200 active:translate-y-0.5 transition"
          >
            <div className="flex items-center gap-2 font-bold text-[17px]">
              <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#0B1736] flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <span>Did you know?</span>
            </div>
            <span className="text-[14px] font-bold text-[#1D4ED8]">
              Tap to read
            </span>
          </button>
        </div>

        {/* Right Column on Desktop: Title + Listen + 2-sentence Story + Alerts + 3 Choices */}
        <div className="md:col-span-7 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <p className="text-[16px] font-bold text-[#1D4ED8] leading-none">
                Day {dayDef.day} of 10
              </p>
              <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0B1736] leading-tight mt-0.5">
                {dayDef.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleToggleListen}
              aria-label={isSpeaking ? 'Stop reading story aloud' : 'Listen to story read aloud'}
              className="min-h-[46px] px-3.5 rounded-[14px] bg-sky-200 border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] text-[17px] font-bold text-[#0B1736] flex items-center gap-1.5 shrink-0 hover:bg-sky-300 active:translate-y-0.5"
            >
              {isSpeaking ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
              <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
            </button>
          </div>

          <p className="text-[20px] text-[#0B1736] leading-snug">{dayDef.story}</p>

          {/* Day 3 & Day 8 NASA Space Weather Box */}
          {dayDef.day === 3 && (
            <div className="rounded-[14px] bg-purple-100 border-2 border-[#0B1736] p-2.5 text-[16px] text-[#0B1736] space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-purple-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {formatNasaStormHeadline(nasaInfo)} · Storm Level {nasaInfo.stormLevel}
                </span>
              </div>
              <p>{formatNasaCmeLine(nasaInfo)}</p>
            </div>
          )}

          {dayDef.day === 8 && (
            <div className="rounded-[14px] bg-purple-100 border-2 border-[#0B1736] p-2.5 text-[16px] text-[#0B1736] space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-purple-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {nasaInfo.isLive ? 'LIVE NASA DONKI' : 'ARCHIVED EXAMPLE (not live)'}: Storm Level {nasaInfo.stormLevel}
                </span>
              </div>
              <p>{formatNasaSepLine(nasaInfo)}</p>
            </div>
          )}

          {dayDef.day === 9 && gameState.launchReqRevealed && (
            <div className="rounded-[14px] bg-emerald-100 border-2 border-[#0B1736] px-3 py-2 text-[16px] font-bold text-emerald-950">
              Day 10 Needs: Power {launchReq.power}, Air &amp; Water{' '}
              {launchReq.airWater}, Radiation {launchReq.radiation}, Food{' '}
              {launchReq.food}.
            </div>
          )}

          {/* 3 Choices OR Day 10 Launch Controls */}
          <div className="space-y-2 pt-0.5">
            {gameState.day < 10 ? (
              orderedChoices.map((choice) => {
                const chips = renderChoiceChips(choice, nasaInfo.stormLevel);
                const hasMiniGame = Boolean(choice.miniGame);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    data-choice-id={choice.id}
                    onClick={() => onSelectChoice(choice)}
                    className={`w-full glossy-btn text-[#0B1736] px-3.5 py-2.5 text-left flex flex-col justify-center gap-1 ${
                      hasMiniGame
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'bg-white hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="font-display text-[19px] sm:text-[21px] font-bold leading-tight">
                        {choice.label}
                      </span>
                      {hasMiniGame && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-300 border-2 border-[#0B1736] px-2.5 py-0.5 text-[14px] font-bold text-[#0B1736]">
                          <Gamepad2 className="w-4 h-4" />
                          <span>(play)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {chips.map((c) => {
                        const Icon = c.Icon;
                        return (
                          <span
                            key={c.key}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[14px] font-bold ${c.cls}`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{c.label}</span>
                          </span>
                        );
                      })}
                      {choice.effect.tomorrowDelta && (
                        <span className="text-[14px] font-bold text-rose-800">
                          · Wears down tomorrow
                        </span>
                      )}
                      {isBerryPreviewingTomorrow && choice.hiddenHint && (
                        <span className="text-[14px] font-bold text-purple-800">
                          · Deep Scan: {choice.hiddenHint}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[16px] font-bold tabular-nums">
                  <div
                    className={`rounded-xl border-2 border-[#0B1736] px-2.5 py-2 ${
                      gameState.meters.power >= launchReq.power
                        ? 'bg-emerald-200 text-[#0B1736]'
                        : 'bg-rose-200 text-[#0B1736]'
                    }`}
                  >
                    Power {gameState.meters.power}/{launchReq.power}
                  </div>
                  <div
                    className={`rounded-xl border-2 border-[#0B1736] px-2.5 py-2 ${
                      gameState.meters.airWater >= launchReq.airWater
                        ? 'bg-emerald-200 text-[#0B1736]'
                        : 'bg-rose-200 text-[#0B1736]'
                    }`}
                  >
                    Air/Water {gameState.meters.airWater}/{launchReq.airWater}
                  </div>
                  <div
                    className={`rounded-xl border-2 border-[#0B1736] px-2.5 py-2 ${
                      gameState.meters.radiation >= launchReq.radiation
                        ? 'bg-emerald-200 text-[#0B1736]'
                        : 'bg-rose-200 text-[#0B1736]'
                    }`}
                  >
                    Radiation {gameState.meters.radiation}/{launchReq.radiation}
                  </div>
                  <div
                    className={`rounded-xl border-2 border-[#0B1736] px-2.5 py-2 ${
                      gameState.meters.food >= launchReq.food
                        ? 'bg-emerald-200 text-[#0B1736]'
                        : 'bg-rose-200 text-[#0B1736]'
                    }`}
                  >
                    Food {gameState.meters.food}/{launchReq.food}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={gameState.meters.power < 10}
                  onClick={onSafetyCheck}
                  className="w-full glossy-btn bg-sky-200 text-[#0B1736] font-display text-[19px] font-bold flex items-center justify-center gap-2 disabled:opacity-45"
                >
                  <ShieldPlus className="w-5 h-5" />
                  <span>Safety Check: 10 Power → Radiation +10</span>
                </button>

                <button
                  type="button"
                  data-testid="launch-checklist-btn"
                  onClick={onLaunch}
                  className={`w-full glossy-btn font-display text-[22px] font-bold flex items-center justify-center gap-2 ${
                    canLaunch
                      ? 'bg-amber-400 text-[#0B1736]'
                      : 'bg-rose-300 text-[#0B1736]'
                  }`}
                >
                  <Rocket className="w-6 h-6" />
                  <span>Run Launch Checklist</span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-[#FFF8E7] border-2 border-[#0B1736] px-2 py-0.5 text-[14px]">
                    (play)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tap-to-Open Magnifying Glass "Did You Know?" Modal */}
      {showFactModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Did you know fact"
          className="fixed inset-0 z-50 bg-[#070E27]/80 flex items-center justify-center p-4"
        >
          <div className="storybook-card w-full max-w-md p-5 space-y-3 animate-screen-enter">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#1E3A8A] font-display text-[24px] font-bold">
                <BookOpen className="w-6 h-6 shrink-0" />
                <span>Did you know?</span>
              </div>
              <button
                type="button"
                aria-label="Close fact"
                onClick={() => setShowFactModal(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-200 border-2 border-[#0B1736] flex items-center justify-center text-[#0B1736]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-[16px] bg-sky-100 border-2 border-[#0B1736] p-3.5 text-[19px] text-[#0B1736] leading-snug">
              {dayDef.didYouKnow}
            </div>

            {dayDef.newWord && (
              <div className="rounded-[16px] bg-amber-100 border-2 border-[#0B1736] p-3 text-[17px] text-[#0B1736] leading-snug">
                <strong>{dayDef.newWord.term}:</strong> {dayDef.newWord.definition}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFactModal(false)}
              className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
