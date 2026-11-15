import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Compass,
  ExternalLink,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Rocket,
  Satellite,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import {
  CREW_MEMBERS,
  FAIL_DEBRIEFS,
  MISSION_DAYS,
  NASA_DATA_SOURCES,
} from '../game/gameData';
import {
  formatNasaCmeLine,
  formatNasaSepLine,
  formatNasaStormHeadline,
} from '../game/nasaService';
import {
  CheckpointSnapshot,
  DayResultSummary,
  EndingTier,
  FailReason,
  GameState,
  NasaMissionBundle,
} from '../game/types';
import { BaseSystemsGridCards, SYSTEM_VISUALS } from './MeterBar';
import { MissionPatchCard } from './MissionPatchCard';
import { PWAInstallButton } from './PWAInstallButton';

export const SettingsModal: React.FC<{
  easyMode: boolean;
  onToggleEasyMode: () => void;
  onClose: () => void;
}> = ({ easyMode, onToggleEasyMode, onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Game Settings"
    className="fixed inset-0 z-50 bg-[#070E27]/80 flex items-center justify-center p-4"
  >
    <div className="storybook-card w-full max-w-md p-5 space-y-4 animate-screen-enter">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-[26px] font-bold text-[#0B1736]">
          <Settings className="w-6 h-6 text-[#1D4ED8]" />
          <span>Settings</span>
        </div>
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-200 border-2 border-[#0B1736] flex items-center justify-center text-[#0B1736]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={easyMode}
          onClick={onToggleEasyMode}
          className={`w-full min-h-[64px] rounded-[16px] border-[2.5px] border-[#0B1736] px-4 py-3 flex items-center justify-between gap-3 text-left transition ${
            easyMode ? 'bg-emerald-200' : 'bg-white'
          }`}
        >
          <div>
            <p className="font-display text-[20px] font-bold text-[#0B1736]">
              Easy Mode
            </p>
            <p className="text-[15px] text-slate-700">
              Mini-games succeed automatically for younger players
            </p>
          </div>
          <span
            className={`shrink-0 rounded-xl border-2 border-[#0B1736] px-3 py-1 text-[16px] font-bold ${
              easyMode ? 'bg-emerald-400 text-[#0B1736]' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {easyMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
      >
        Done
      </button>
    </div>
  </div>
);

export const SplashScreen: React.FC<{
  onContinue: () => void;
}> = ({ onContinue }) => (
  <div className="storybook-card flex flex-col justify-between p-6 text-center animate-screen-enter">
    <div className="flex flex-col items-center justify-center py-4">
      <div className="w-32 h-32 rounded-full bg-amber-300 border-[4px] border-[#0B1736] shadow-[0_6px_0_#0B1736] flex items-center justify-center animate-float-slow mb-5">
        <img
          src="/capt.png"
          alt="Capt. Space cat astronaut"
          referrerPolicy="no-referrer"
          className="w-24 h-24 rounded-full object-cover border-[3px] border-[#0B1736] bg-[#79e3fe]"
        />
      </div>

      <p className="text-[18px] font-bold text-[#1D4ED8] mb-1">
        4 Cat Friends · 10 Days Before Moon Sunset
      </p>
      <h1 className="font-display text-[34px] sm:text-[38px] font-bold text-[#0B1736] leading-tight">
        Moon Base Mission
      </h1>
      <p
        className="mt-3 text-[20px] text-slate-800 max-w-md leading-snug"
        style={{ textWrap: 'balance' }}
      >
        Keep Power, Air &amp; Water, Radiation Protection, and Food healthy until the rocket launches on Day 10!
      </p>
    </div>

    <div className="space-y-2.5 pt-2">
      <button
        type="button"
        data-start="true"
        onClick={onContinue}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold flex items-center justify-center gap-2"
      >
        <Rocket className="w-6 h-6" />
        <span>Start Mission</span>
      </button>
      <p className="text-[16px] text-slate-600">Press Enter or Space to begin</p>
    </div>
  </div>
);

export const MainMenuScreen: React.FC<{
  onPlayNew: () => void;
  onResumeSaved: () => void;
  hasSavedGame: boolean;
  savedDay?: number;
  easyMode: boolean;
  onOpenSettings: () => void;
  onOpenAboutSystems: () => void;
  onOpenHowToPlay: () => void;
  onOpenCrew: () => void;
  onOpenNasaData: () => void;
}> = ({
  onPlayNew,
  onResumeSaved,
  hasSavedGame,
  savedDay,
  easyMode,
  onOpenSettings,
  onOpenAboutSystems,
  onOpenHowToPlay,
  onOpenCrew,
  onOpenNasaData,
}) => (
  <div className="storybook-card flex flex-col justify-between p-5 sm:p-6 gap-4 animate-screen-enter">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img
          src="/icon.svg"
          alt="Moon Base Mission emblem"
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-[#0B1736] shrink-0"
        />
        <div className="min-w-0">
          <h1 className="font-display text-[19px] sm:text-[32px] font-bold text-[#0B1736] leading-tight whitespace-nowrap">
            Moon Base Mission
          </h1>
          <p className="text-[13px] sm:text-[16px] font-bold text-[#1D4ED8] mt-0.5 truncate">
            South Pole Rescue {easyMode ? '· Easy Mode ON' : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open Settings"
          className="min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-[14px] sm:rounded-[16px] bg-[#FFF8E7] border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] flex items-center justify-center text-[#0B1736] hover:bg-amber-50 active:translate-y-0.5 transition"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
      {CREW_MEMBERS.map((c) => (
        <div
          key={c.id}
          className="flex flex-col items-center rounded-[16px] bg-sky-50 border-2 border-[#0B1736] p-1.5 sm:p-2"
        >
          <img
            src={c.avatar}
            alt={c.name}
            referrerPolicy="no-referrer"
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full object-cover bg-[#79e3fe] border-[2.5px]"
            style={{ borderColor: c.accentColor }}
          />
          <span className="mt-1 text-[11.5px] sm:text-[14px] font-bold text-[#0B1736] text-center whitespace-nowrap">
            {c.name}
          </span>
        </div>
      ))}
    </div>

    <div className="space-y-3">
      <button
        type="button"
        data-start="true"
        onClick={onPlayNew}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold flex items-center justify-center gap-2"
      >
        <Play className="w-6 h-6 fill-current" />
        <span>Play New Mission</span>
      </button>

      {hasSavedGame && (
        <button
          type="button"
          onClick={onResumeSaved}
          className="w-full glossy-btn bg-emerald-300 text-[#0B1736] font-display text-[22px] font-bold flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Continue Mission (Day {savedDay})</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenAboutSystems}
        className="w-full glossy-btn bg-sky-200 text-[#0B1736] font-display text-[21px] font-bold flex items-center justify-center gap-2"
      >
        <Layers className="w-5 h-5" />
        <span>About the Base Systems</span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenHowToPlay}
          className="min-h-[64px] rounded-[16px] bg-white border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] px-2 py-2 flex flex-col items-center justify-center gap-1 text-[15px] font-bold text-[#0B1736] hover:bg-amber-50"
        >
          <HelpCircle className="w-5 h-5 text-[#1D4ED8]" />
          <span>How to Play</span>
        </button>
        <button
          type="button"
          onClick={onOpenCrew}
          className="min-h-[64px] rounded-[16px] bg-white border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] px-2 py-2 flex flex-col items-center justify-center gap-1 text-[15px] font-bold text-[#0B1736] hover:bg-amber-50"
        >
          <Users className="w-5 h-5 text-amber-600" />
          <span>Crew &amp; Patch</span>
        </button>
        <button
          type="button"
          onClick={onOpenNasaData}
          className="min-h-[64px] rounded-[16px] bg-white border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] px-2 py-2 flex flex-col items-center justify-center gap-1 text-[15px] font-bold text-[#0B1736] hover:bg-amber-50"
        >
          <Satellite className="w-5 h-5 text-emerald-700" />
          <span>NASA Data</span>
        </button>
      </div>
    </div>

    <div className="space-y-2">
      <PWAInstallButton />
      <p className="text-[16px] text-center text-slate-700">
        Ages 7–12 · Works offline · Uses real NASA data &amp; photos
      </p>
    </div>
  </div>
);

export const DayTitleCardScreen: React.FC<{
  day: number;
  onNext: () => void;
}> = ({ day, onNext }) => {
  const dayDef = MISSION_DAYS.find((d) => d.day === day) ?? MISSION_DAYS[0];
  const daysLeft = Math.max(0, 10 - day);

  return (
    <div className="storybook-card p-6 text-center space-y-5 animate-screen-enter">
      <div>
        <p className="text-[18px] font-bold text-[#1D4ED8]">
          {day === 10
            ? 'Sunset Tonight! Launch Day!'
            : `${daysLeft} Earth Day${daysLeft === 1 ? '' : 's'} Until Sunset`}
        </p>
        <h2 className="font-display text-[40px] sm:text-[46px] font-bold text-[#0B1736] leading-tight mt-1">
          Day {day}
        </h2>
        <p className="font-display text-[24px] font-bold text-amber-700">
          {dayDef.title}
        </p>
      </div>

      {/* Four waving cat astronauts */}
      <div className="flex items-center justify-center gap-3 py-2">
        {CREW_MEMBERS.map((member, idx) => (
          <div
            key={member.id}
            style={{ animationDelay: `${idx * 140}ms` }}
            className="flex flex-col items-center animate-crew-wave"
          >
            <img
              src={member.avatar}
              alt={`${member.name} waving`}
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-[#79e3fe] border-[3px]"
              style={{ borderColor: member.accentColor }}
            />
            <span className="mt-1 text-[13px] font-bold text-[#0B1736]">
              {member.name}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        data-testid="day-title-next"
        onClick={onNext}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[24px] font-bold"
      >
        Next
      </button>
    </div>
  );
};

export const ContactingNasaScreen: React.FC<{
  onStartNow: () => void;
}> = ({ onStartNow }) => (
  <div className="storybook-card p-6 text-center space-y-5 animate-screen-enter">
    <div className="mx-auto w-20 h-20 rounded-full bg-sky-200 border-[3px] border-[#0B1736] flex items-center justify-center animate-float-slow">
      <Satellite className="w-10 h-10 text-[#0B1736]" />
    </div>
    <div>
      <h2 className="font-display text-[32px] font-bold text-[#0B1736]">
        Contacting NASA...
      </h2>
      <p className="mt-2 text-[20px] text-slate-800 leading-snug">
        Checking live solar storm forecasts and gathering real Moon photos for all 10 days!
      </p>
    </div>
    <button
      type="button"
      onClick={onStartNow}
      className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
    >
      Next
    </button>
  </div>
);

const InfoSubScreenHeader: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <div className="flex items-center gap-3 border-b-2 border-[#0B1736]/15 pb-3">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back to menu"
      className="min-w-[48px] min-h-[48px] rounded-[16px] bg-white border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] flex items-center justify-center text-[#0B1736] hover:bg-amber-50"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
    <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0B1736] leading-tight">
      {title}
    </h2>
  </div>
);

export const AboutSystemsScreen: React.FC<{ onBack: () => void }> = ({
  onBack,
}) => (
  <div className="storybook-card flex flex-col gap-4 p-5 animate-screen-enter">
    <InfoSubScreenHeader title="About the Base Systems" onBack={onBack} />
    <p className="text-[19px] text-[#0B1736] leading-snug">
      Your Moon base needs all four systems equally! Tap any bar during the game to read its Mission Control Card again.
    </p>
    <BaseSystemsGridCards />
    <p className="rounded-[14px] bg-amber-100 border-2 border-[#0B1736] px-3.5 py-2.5 text-[16px] font-semibold text-[#0B1736]">
      Music: [PASTE TRACK NAMES AND CREDITS HERE]
    </p>
    <button
      type="button"
      onClick={onBack}
      className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
    >
      Back to Menu
    </button>
  </div>
);

export const HowToPlayScreen: React.FC<{ onBack: () => void }> = ({
  onBack,
}) => (
  <div className="storybook-card flex flex-col gap-4 p-5 animate-screen-enter">
    <InfoSubScreenHeader title="How to Play" onBack={onBack} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[18px] text-[#0B1736] leading-snug">
      <div className="rounded-[16px] bg-white border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[22px] font-bold text-[#1D4ED8]">
          1. 10 Days Before Sunset
        </h3>
        <p className="mt-1">
          The cats land near the Moon’s south pole 10 Earth days before sunset. Launch on Day 10 before the 14-day dark lunar night begins!
        </p>
      </div>
      <div className="rounded-[16px] bg-white border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[22px] font-bold text-amber-700">
          2. Play Quick Mini-Games
        </h3>
        <p className="mt-1">
          Choices with <strong>(play)</strong> start a 10-second hands-on mini-game! Succeed for full boosts, or skip for half boosts (costs stay the same).
        </p>
      </div>
      <div className="rounded-[16px] bg-white border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[22px] font-bold text-emerald-800">
          3. Earn Stars &amp; Mission Patch
        </h3>
        <p className="mt-1">
          Earn 1–3 Day Stars and answer each day’s Quick Question right to earn +5 Science Stars and unlock its round Mission Patch badge!
        </p>
      </div>
      <div className="rounded-[16px] bg-white border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[22px] font-bold text-purple-800">
          4. Win Gold on Day 10
        </h3>
        <p className="mt-1">
          Tap the 4 Launch Checklist lights on Day 10. Score over 100 Science, keep all 4 cats safe, and keep all 4 systems above 40 for <strong>Gold</strong>!
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onBack}
      className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
    >
      Back to Menu
    </button>
  </div>
);

export const CrewScreen: React.FC<{
  earnedPatchDays: number[];
  onBack: () => void;
}> = ({ earnedPatchDays, onBack }) => (
  <div className="storybook-card flex flex-col gap-4 p-5 animate-screen-enter">
    <InfoSubScreenHeader title="Crew & Mission Patch" onBack={onBack} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {CREW_MEMBERS.map((member) => (
        <div
          key={member.id}
          className="rounded-[16px] bg-white border-2 border-[#0B1736] p-3.5 flex items-center gap-3.5"
        >
          <img
            src={member.avatar}
            alt={member.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover bg-[#79e3fe] border-[3px] shrink-0"
            style={{ borderColor: member.accentColor }}
          />
          <div className="min-w-0">
            <h3 className="font-display text-[22px] font-bold text-[#0B1736] leading-tight">
              {member.name}
            </h3>
            <p className="text-[16px] font-bold text-[#1D4ED8]">
              {member.role} · {member.abilityName}
            </p>
            <p className="text-[17px] text-slate-800 mt-1 leading-snug">
              {member.abilityDescription}
            </p>
          </div>
        </div>
      ))}
    </div>

    <MissionPatchCard earnedDays={earnedPatchDays} />

    <button
      type="button"
      onClick={onBack}
      className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
    >
      Back to Menu
    </button>
  </div>
);

export const AboutNasaScreen: React.FC<{
  nasaInfo: NasaMissionBundle;
  onBack: () => void;
}> = ({ nasaInfo, onBack }) => (
  <div className="storybook-card flex flex-col gap-4 p-5 animate-screen-enter">
    <InfoSubScreenHeader title="About NASA Data" onBack={onBack} />

    <div className="rounded-[16px] bg-sky-100 border-2 border-[#0B1736] p-4 space-y-1">
      <p className="text-[16px] font-bold text-[#1D4ED8]">
        {nasaInfo.isLive
          ? 'LIVE Space Weather Snapshot'
          : 'ARCHIVED EXAMPLE (not live — offline fallback)'}
      </p>
      <p className="text-[20px] font-bold text-[#0B1736]">
        {formatNasaStormHeadline(nasaInfo)} · Storm Level {nasaInfo.stormLevel}
      </p>
      <p className="text-[18px] text-slate-800">{formatNasaCmeLine(nasaInfo)}</p>
      <p className="text-[18px] text-slate-800">{formatNasaSepLine(nasaInfo)}</p>
    </div>

    <div className="space-y-3">
      {NASA_DATA_SOURCES.map((source) => (
        <div
          key={source.name}
          className="rounded-[16px] bg-white border-2 border-[#0B1736] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-[22px] font-bold text-[#0B1736]">
              {source.name}
            </h3>
            <span className="text-[15px] font-bold text-emerald-800">
              {source.badge}
            </span>
          </div>
          <p className="mt-1 text-[19px] text-slate-800 leading-snug">
            {source.description}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-3">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[18px] font-bold text-[#1D4ED8] hover:underline"
            >
              <span>Visit Official NASA Page</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {source.secondaryUrl && (
              <a
                href={source.secondaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[18px] font-bold text-[#1D4ED8] hover:underline"
              >
                <span>Open NASA OSDR</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>

    <p className="rounded-[14px] bg-amber-100 border-2 border-[#0B1736] px-3.5 py-2.5 text-[16px] font-semibold text-[#0B1736]">
      Music: [PASTE TRACK NAMES AND CREDITS HERE]
    </p>

    <button
      type="button"
      onClick={onBack}
      className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
    >
      Back to Menu
    </button>
  </div>
);

export const ResultScreen: React.FC<{
  result: DayResultSummary;
  onAnswerQuickQuestion: (index: 0 | 1 | 2) => void;
  onContinue: () => void;
}> = ({ result, onAnswerQuickQuestion, onContinue }) => {
  const [activeTab, setActiveTab] = useState<'science' | 'game' | 'nasa'>('science');

  const deltaEntries = (
    Object.entries(result.deltas) as [keyof typeof result.deltas, number][]
  ).filter(([, val]) => val !== 0);

  const labelForDelta = (key: keyof typeof result.deltas) => {
    if (key === 'science') return 'Science';
    if (key === 'radiation') return 'Radiation';
    return SYSTEM_VISUALS[key].label;
  };

  return (
    <div className="storybook-card flex flex-col gap-3 p-4 sm:p-5 animate-screen-enter">
      {/* Header + 1-to-3 Bouncing Day Stars */}
      <div className="text-center">
        <p className="text-[15px] font-bold text-[#1D4ED8]">Day {result.day} Log</p>
        <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0B1736] leading-tight">
          {result.headline}
        </h2>

        <div className="mt-2 flex items-center justify-center gap-2">
          {[1, 2, 3].map((starSlot) => {
            const lit = starSlot <= result.dayStars;
            return (
              <div
                key={starSlot}
                style={{ animationDelay: `${(starSlot - 1) * 140}ms` }}
                className={`w-11 h-11 rounded-full border-[2.5px] border-[#0B1736] flex items-center justify-center ${
                  lit
                    ? 'bg-amber-300 shadow-[0_3px_0_#0B1736] animate-star-pop'
                    : 'bg-slate-200 opacity-60'
                }`}
              >
                <Star
                  className={`w-6 h-6 ${
                    lit ? 'fill-amber-500 text-[#0B1736]' : 'text-slate-400'
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 text-[12px] font-bold">
          <span
            className={`rounded-lg border px-2 py-0.5 ${
              result.actionStarEarned
                ? 'bg-emerald-100 border-emerald-700 text-emerald-900'
                : 'bg-slate-100 border-slate-400 text-slate-600'
            }`}
          >
            {result.actionStarEarned ? '✓ Hands-On Win' : '○ Hands-On'}
          </span>
          <span
            className={`rounded-lg border px-2 py-0.5 ${
              result.noSystemBelow30
                ? 'bg-emerald-100 border-emerald-700 text-emerald-900'
                : 'bg-rose-100 border-rose-700 text-rose-900'
            }`}
          >
            {result.noSystemBelow30 ? '✓ All Systems ≥30' : '○ System <30'}
          </span>
          <span
            className={`rounded-lg border px-2 py-0.5 ${
              result.quickQuestionCorrect
                ? 'bg-emerald-100 border-emerald-700 text-emerald-900'
                : 'bg-slate-100 border-slate-400 text-slate-600'
            }`}
          >
            {result.quickQuestionCorrect ? '✓ Quiz +Patch' : '○ Quiz Star'}
          </span>
        </div>
      </div>

      {/* Meter changes */}
      {deltaEntries.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {deltaEntries.map(([key, val]) => (
            <div
              key={key}
              className={`rounded-[12px] px-2.5 py-1 flex items-center gap-1.5 text-[15px] font-bold border-2 border-[#0B1736] ${
                val > 0 ? 'bg-emerald-200 text-[#0B1736]' : 'bg-rose-200 text-[#0B1736]'
              }`}
            >
              <span className="whitespace-nowrap">{labelForDelta(key)}</span>
              <span className="tabular-nums">{val > 0 ? `+${val}` : val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action summary */}
      <div className="rounded-[14px] bg-white border-2 border-[#0B1736] px-3 py-2 space-y-0.5">
        {result.summaryLines.map((line, idx) => (
          <p key={idx} className="text-[16px] text-[#0B1736] leading-snug">
            • {line}
          </p>
        ))}
      </div>

      {result.deepScanPreview && (
        <div className="rounded-[14px] bg-purple-100 border-2 border-[#0B1736] p-3">
          <div className="flex items-center gap-2 text-[17px] font-bold text-purple-950">
            <Compass className="w-5 h-5" />
            <span>
              Deep Scan — Day {result.deepScanPreview.nextDay}:{' '}
              {result.deepScanPreview.title}
            </span>
          </div>
          <p className="mt-0.5 text-[16px] text-[#0B1736] leading-snug">
            {result.deepScanPreview.story}
          </p>
          <p className="mt-0.5 text-[16px] font-bold text-rose-800">
            Hidden Risk: {result.deepScanPreview.hiddenRisk}
          </p>
        </div>
      )}

      {/* THREE TABS: Real science (default open), In the game, NASA data */}
      <div className="space-y-2">
        <div role="tablist" aria-label="Mission Science Tabs" className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'science'}
            onClick={() => setActiveTab('science')}
            className={`min-h-[46px] rounded-[14px] border-[2.5px] border-[#0B1736] px-2 text-[15px] sm:text-[16px] font-bold transition ${
              activeTab === 'science'
                ? 'bg-emerald-300 text-[#0B1736] shadow-[0_3px_0_#0B1736]'
                : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
            }`}
          >
            Real science
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'game'}
            onClick={() => setActiveTab('game')}
            className={`min-h-[46px] rounded-[14px] border-[2.5px] border-[#0B1736] px-2 text-[15px] sm:text-[16px] font-bold transition ${
              activeTab === 'game'
                ? 'bg-yellow-300 text-[#0B1736] shadow-[0_3px_0_#0B1736]'
                : 'bg-yellow-50 text-amber-950 hover:bg-yellow-100'
            }`}
          >
            In the game
          </button>

          {result.nasaDataBox ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'nasa'}
              onClick={() => setActiveTab('nasa')}
              className={`min-h-[46px] rounded-[14px] border-[2.5px] border-[#0B1736] px-2 text-[15px] sm:text-[16px] font-bold transition ${
                activeTab === 'nasa'
                  ? 'bg-sky-300 text-[#0B1736] shadow-[0_3px_0_#0B1736]'
                  : 'bg-sky-50 text-sky-950 hover:bg-sky-100'
              }`}
            >
              NASA data
            </button>
          ) : (
            <div className="min-h-[46px] rounded-[14px] border-2 border-dashed border-[#0B1736]/25 px-2 flex items-center justify-center text-[13px] font-bold text-slate-500">
              NASA Photo Day
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          className={`rounded-[16px] border-[2.5px] border-[#0B1736] p-3.5 ${
            activeTab === 'science'
              ? 'bg-emerald-100'
              : activeTab === 'game'
                ? 'bg-yellow-100'
                : 'bg-sky-100'
          }`}
        >
          {activeTab === 'science' && (
            <p className="text-[18px] text-[#0B1736] leading-snug">
              {result.realScienceBox}
            </p>
          )}
          {activeTab === 'game' && (
            <div className="space-y-1">
              <span className="inline-block rounded-lg bg-amber-300 border border-[#0B1736] px-2 py-0.5 text-[13px] font-bold text-[#0B1736]">
                Simplified for the game
              </span>
              <p className="text-[18px] text-[#0B1736] leading-snug">
                {result.inGameRuleBox}
              </p>
            </div>
          )}
          {activeTab === 'nasa' && result.nasaDataBox && (
            <div className="space-y-1">
              <span className="inline-block rounded-lg bg-white border border-[#0B1736] px-2 py-0.5 text-[13px] font-bold text-[#1D4ED8]">
                {result.nasaDataBox.statusLabel}
              </span>
              <p className="text-[18px] font-bold text-[#0B1736]">
                {result.nasaDataBox.headline}
              </p>
              <p className="text-[16px] text-slate-800 leading-snug">
                {result.nasaDataBox.detail}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK QUESTION: +5 Science Stars + Day Mission Patch Badge */}
      <div className="rounded-[18px] bg-amber-50 border-[3px] border-[#0B1736] p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[20px] font-bold text-[#0B1736]">
            Quick Question
          </p>
          <span className="text-[15px] font-bold text-amber-800 flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-600" />
            <span>+5 Science · Day {result.day} Badge</span>
          </span>
        </div>

        <p className="text-[18px] font-bold text-[#0B1736] leading-snug">
          {result.quickQuestion.prompt}
        </p>

        <div className="space-y-1.5">
          {result.quickQuestion.options.map((opt, idx) => {
            const optionIndex = idx as 0 | 1 | 2;
            const isCorrectOpt = optionIndex === result.quickQuestion.correctIndex;
            const answered = result.quickQuestionAnswered;

            return (
              <button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => onAnswerQuickQuestion(optionIndex)}
                className={`w-full min-h-[56px] rounded-[16px] border-[2.5px] border-[#0B1736] px-3.5 py-2 text-left text-[17px] font-bold transition flex items-center justify-between gap-2 ${
                  answered
                    ? isCorrectOpt
                      ? 'bg-emerald-300 text-[#0B1736]'
                      : 'bg-slate-200 text-slate-600'
                    : 'bg-white text-[#0B1736] shadow-[0_3px_0_#0B1736] hover:bg-amber-100 active:translate-y-0.5'
                }`}
              >
                <span>{opt}</span>
                {answered && isCorrectOpt && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-900 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {result.quickQuestionAnswered && (
          <div
            role="status"
            className={`rounded-[14px] border-2 border-[#0B1736] p-2.5 text-[17px] font-bold ${
              result.quickQuestionCorrect
                ? 'bg-emerald-200 text-[#0B1736]'
                : 'bg-sky-100 text-[#0B1736]'
            }`}
          >
            {result.quickQuestionCorrect
              ? `Hooray! +5 Science Stars & Day ${result.day} Patch unlocked! ${result.quickQuestion.rightCheer}`
              : `${result.quickQuestion.wrongHint} Correct answer: ${
                  result.quickQuestion.options[result.quickQuestion.correctIndex]
                }.`}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
      >
        {result.day < 10 ? `Next: Day ${result.day + 1}` : 'Next: Mission Result'}
      </button>
    </div>
  );
};

export const DebriefScreen: React.FC<{
  failReason: FailReason;
  dayReached: number;
  checkpoint: CheckpointSnapshot | null;
  onRetryCheckpoint: () => void;
  onRestartDay1: () => void;
  onBackToMenu: () => void;
}> = ({
  failReason,
  dayReached,
  checkpoint,
  onRetryCheckpoint,
  onRestartDay1,
  onBackToMenu,
}) => {
  const info = FAIL_DEBRIEFS[failReason];

  return (
    <div className="storybook-card flex flex-col gap-3.5 p-5 animate-screen-enter">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-200 border-[3px] border-[#0B1736] flex items-center justify-center text-rose-800 mb-2">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <p className="text-[16px] font-bold text-rose-700">
          Mission Control Debrief · Reached Day {dayReached}
        </p>
        <h2 className="font-display text-[30px] font-bold text-[#0B1736] leading-tight mt-0.5">
          {info.title}
        </h2>
        <p className="mt-1 text-[18px] text-slate-800">{info.subtitle}</p>
      </div>

      {/* Encouraging one-liner from the crew */}
      <div className="rounded-[16px] bg-sky-100 border-2 border-[#0B1736] p-3 flex items-center gap-3">
        <img
          src="/capt.png"
          alt="Crew encouragement"
          referrerPolicy="no-referrer"
          className="w-12 h-12 rounded-full object-cover border-2 border-[#0B1736] bg-[#79e3fe] shrink-0"
        />
        <p className="text-[17px] font-bold text-[#0B1736] leading-snug">
          {info.crewEncouragement}
        </p>
      </div>

      <div className="rounded-[16px] bg-emerald-100 border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[20px] font-bold text-emerald-950">
          Real Space Science Reason
        </h3>
        <p className="mt-1 text-[18px] text-[#0B1736] leading-snug">
          {info.scienceReason}
        </p>
      </div>

      <div className="rounded-[16px] bg-yellow-100 border-2 border-[#0B1736] p-3.5">
        <h3 className="font-display text-[20px] font-bold text-amber-950">
          Next Try Tip
        </h3>
        <p className="mt-1 text-[18px] text-[#0B1736] leading-snug">
          {info.tip}
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {checkpoint && checkpoint.savedAtDay > 1 ? (
          <button
            type="button"
            data-start="true"
            onClick={onRetryCheckpoint}
            className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Try Again (Day {checkpoint.savedAtDay})</span>
          </button>
        ) : (
          <button
            type="button"
            data-start="true"
            onClick={onRestartDay1}
            className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Try Again</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {checkpoint && checkpoint.savedAtDay > 1 && (
            <button
              type="button"
              onClick={onRestartDay1}
              className="glossy-btn bg-white text-[18px] font-bold text-[#0B1736]"
            >
              Restart Day 1
            </button>
          )}
          <button
            type="button"
            onClick={onBackToMenu}
            className={`glossy-btn bg-slate-200 text-[18px] font-bold text-[#0B1736] ${
              !(checkpoint && checkpoint.savedAtDay > 1) ? 'col-span-2' : ''
            }`}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export const EndingScreen: React.FC<{
  tier: EndingTier;
  gameState: GameState;
  earnedPatchDays: number[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}> = ({ tier, gameState, earnedPatchDays, onPlayAgain, onBackToMenu }) => {
  const isGold = tier === 'GOLD';

  return (
    <div className="storybook-card flex flex-col gap-3.5 p-5 text-center animate-screen-enter">
      <div>
        <div
          className={`mx-auto w-20 h-20 rounded-full border-[3px] border-[#0B1736] shadow-[0_4px_0_#0B1736] flex items-center justify-center mb-2 ${
            isGold ? 'bg-amber-300 text-[#0B1736]' : 'bg-slate-200 text-[#0B1736]'
          }`}
        >
          {isGold ? (
            <Sparkles className="w-10 h-10" />
          ) : (
            <Award className="w-10 h-10" />
          )}
        </div>
        <p className="text-[17px] font-bold text-[#1D4ED8]">
          Day 10 Ascent Rocket Launched Before Sunset!
        </p>
        <h2 className="font-display text-[32px] font-bold text-[#0B1736] leading-tight mt-0.5">
          {isGold ? 'Gold Mission Victory!' : 'Silver Mission Victory!'}
        </h2>
        <p className="mt-1 text-[18px] text-slate-800 leading-snug">
          {isGold
            ? 'All 4 cat astronauts returned safely with top Science and all four base systems above 40!'
            : gameState.crewHurt
              ? 'Everyone made it home before the 14-day lunar night, though a crewmate needed care.'
              : 'You launched safely before lunar sunset! Get >100 Science and keep all 4 systems >40 for Gold.'}
        </p>
      </div>

      <div className="flex justify-center -space-x-2 py-0.5">
        {CREW_MEMBERS.map((member) => (
          <img
            key={member.id}
            src={member.avatar}
            alt={member.name}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover bg-[#79e3fe] border-[3px] border-[#0B1736] animate-crew-bounce"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="rounded-[16px] bg-amber-100 border-2 border-[#0B1736] p-3">
          <p className="text-[15px] text-amber-900 font-bold">Science Stars</p>
          <p className="tabular-nums text-[26px] font-bold text-[#0B1736]">
            {gameState.meters.science}
          </p>
        </div>
        <div className="rounded-[16px] bg-emerald-100 border-2 border-[#0B1736] p-3">
          <p className="text-[15px] text-emerald-900 font-bold">Crew Safe</p>
          <p className="font-display text-[22px] font-bold text-[#0B1736]">
            {gameState.crewHurt ? '3/4 Healthy' : '4/4 All Safe'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[15px] font-bold tabular-nums text-[#0B1736]">
        <div className="rounded-xl bg-yellow-100 border-2 border-[#0B1736] py-1.5 px-2">
          Power: {gameState.meters.power}
        </div>
        <div className="rounded-xl bg-sky-100 border-2 border-[#0B1736] py-1.5 px-2">
          Air/Water: {gameState.meters.airWater}
        </div>
        <div className="rounded-xl bg-purple-100 border-2 border-[#0B1736] py-1.5 px-2">
          Radiation: {gameState.meters.radiation}
        </div>
        <div className="rounded-xl bg-emerald-100 border-2 border-[#0B1736] py-1.5 px-2">
          Food: {gameState.meters.food}
        </div>
      </div>

      <MissionPatchCard earnedDays={earnedPatchDays} compact />

      <div className="space-y-2 pt-1">
        <button
          type="button"
          data-start="true"
          onClick={onPlayAgain}
          className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
        >
          Play New Mission
        </button>
        <button
          type="button"
          onClick={onBackToMenu}
          className="w-full glossy-btn bg-slate-200 text-[#0B1736] text-[20px] font-bold"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
};
