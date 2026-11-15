import React, { useState } from 'react';
import { Check, Lock, Sparkles, X } from 'lucide-react';
import { CREW_MEMBERS, getCrewSpeechBubble } from '../game/gameData';
import {
  CrewId,
  CrewMember,
  GameState,
  MeterKey,
  StormLevel,
} from '../game/types';

interface CrewBarProps {
  gameState: GameState;
  stormLevel: StormLevel;
  crewReaction?: 'bounce' | 'wobble' | 'idle';
  onActivateAbility: (crewId: CrewId, overclockMeter?: MeterKey) => void;
}

const OVERCLOCK_TARGETS: { key: MeterKey; label: string }[] = [
  { key: 'power', label: 'Power' },
  { key: 'airWater', label: 'Air & Water' },
  { key: 'radiation', label: 'Radiation' },
  { key: 'food', label: 'Food' },
  { key: 'mood', label: 'Mood' },
];

export const CrewBar: React.FC<CrewBarProps> = ({
  gameState,
  stormLevel,
  crewReaction = 'idle',
  onActivateAbility,
}) => {
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [overclockMeter, setOverclockMeter] = useState<MeterKey>('power');
  const [bubbleCrewId, setBubbleCrewId] = useState<CrewId>('amy');

  const activeSpeaker =
    CREW_MEMBERS.find((c) => c.id === bubbleCrewId) ?? CREW_MEMBERS[0];
  const speechLine = getCrewSpeechBubble(activeSpeaker.id, gameState, stormLevel);

  const anyLow =
    gameState.meters.power < 30 ||
    gameState.meters.airWater < 30 ||
    gameState.meters.radiation < 30 ||
    gameState.meters.food < 30 ||
    gameState.meters.mood < 30;

  const effectiveAnimClass =
    crewReaction === 'wobble' || anyLow
      ? 'animate-crew-wobble'
      : crewReaction === 'bounce'
        ? 'animate-crew-bounce'
        : '';

  const getCrewStatus = (member: CrewMember) => {
    if (gameState.refusedAbilityToday === member.id) {
      return { usable: false, label: 'Grumpy' };
    }
    if (member.id === 'nikita') {
      if (gameState.triageUsed) return { usable: false, label: 'Used' };
      if (!gameState.crewHurt) return { usable: true, label: 'Standby' };
      return { usable: true, label: 'Heal!' };
    }
    if (gameState.cooldowns[member.id] > 0) {
      return {
        usable: false,
        label: `Wait ${gameState.cooldowns[member.id]}d`,
      };
    }
    if (gameState.abilityUsedToday) {
      return { usable: false, label: 'Done' };
    }
    if (member.id === 'berry' && gameState.day >= 10) {
      return { usable: false, label: 'Launch' };
    }
    return { usable: true, label: member.abilityName };
  };

  return (
    <>
      <div className="space-y-2">
        {/* 1-line Crew Speech Bubble (max 8 words) */}
        <div className="rounded-[16px] bg-[#FFF8E7] border-[2.5px] border-[#0B1736] px-3.5 py-2 shadow-[0_3px_0_#0B1736] flex items-center gap-2.5">
          <img
            src={activeSpeaker.avatar}
            alt={activeSpeaker.name}
            referrerPolicy="no-referrer"
            className={`w-8 h-8 rounded-full object-cover border-2 border-[#0B1736] bg-[#79e3fe] shrink-0 ${effectiveAnimClass}`}
          />
          <p className="text-[16px] sm:text-[18px] font-semibold text-[#0B1736] leading-snug truncate">
            <span className="font-bold">{activeSpeaker.name}:</span> “{speechLine}”
          </p>
        </div>

        {/* 4 Circular Crew Portraits with CSS bounce/wobble reaction */}
        <div className="grid grid-cols-4 gap-2">
          {CREW_MEMBERS.map((member) => {
            const status = getCrewStatus(member);
            const isRefused = gameState.refusedAbilityToday === member.id;
            const isHurt = member.id === 'nikita' && gameState.crewHurt;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setBubbleCrewId(member.id);
                  setSelectedCrew(member);
                }}
                aria-label={`${member.name}: ${member.abilityName} (${status.label})`}
                className={`min-h-[60px] flex flex-col items-center justify-center rounded-[18px] px-1.5 py-1.5 border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] transition active:translate-y-0.5 ${
                  status.usable && !gameState.abilityUsedToday
                    ? 'bg-[#FFF8E7] hover:bg-amber-50'
                    : 'bg-slate-200/90 opacity-85'
                }`}
              >
                <div className="relative">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover bg-[#79e3fe] border-[2.5px] ${
                      isRefused ? 'animate-crew-wobble' : effectiveAnimClass
                    }`}
                    style={{ borderColor: member.accentColor }}
                  />
                  {isRefused && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-rose-500 text-white border border-[#0B1736] flex items-center justify-center">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {isHurt && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-400 text-[#0B1736] border border-[#0B1736] text-[12px] font-bold flex items-center justify-center">
                      !
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[13px] sm:text-[14px] font-bold text-[#0B1736] leading-tight text-center whitespace-nowrap">
                  {member.name}
                </span>
                <span
                  className={`text-[12px] font-bold leading-tight truncate max-w-full ${
                    status.usable ? 'text-[#1D4ED8]' : 'text-slate-600'
                  }`}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCrew && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCrew.name} ability`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#070E27]/80 p-3"
        >
          <div className="storybook-card w-full max-w-md p-5 animate-screen-enter">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCrew.avatar}
                  alt={selectedCrew.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover bg-[#79e3fe] border-[3px] shrink-0"
                  style={{ borderColor: selectedCrew.accentColor }}
                />
                <div>
                  <h3 className="font-display text-[24px] font-bold text-[#0B1736]">
                    {selectedCrew.name}
                  </h3>
                  <p className="text-[16px] font-bold text-[#1D4ED8]">
                    {selectedCrew.role} · {selectedCrew.abilityName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close ability details"
                onClick={() => setSelectedCrew(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-200 border-2 border-[#0B1736] text-[#0B1736] hover:bg-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-[19px] text-[#0B1736] leading-snug">
              {selectedCrew.abilityDescription}
            </p>

            {selectedCrew.id === 'amy' && (
              <div className="mt-3">
                <p className="text-[16px] font-bold text-[#1E3A8A] mb-2">
                  Pick a system to Overclock (+15 today, -25 tomorrow):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {OVERCLOCK_TARGETS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setOverclockMeter(item.key)}
                      className={`min-h-[48px] rounded-xl px-3 text-[16px] font-bold border-2 border-[#0B1736] flex items-center justify-between transition ${
                        overclockMeter === item.key
                          ? 'bg-amber-400 text-[#0B1736] shadow-[0_3px_0_#0B1736]'
                          : 'bg-white text-[#0B1736] hover:bg-amber-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="tabular-nums">
                        {gameState.meters[item.key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCrew(null)}
                className="flex-1 glossy-btn bg-slate-200 text-[20px] font-bold text-[#0B1736]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={
                  gameState.abilityUsedToday ||
                  gameState.refusedAbilityToday === selectedCrew.id ||
                  (selectedCrew.id !== 'nikita' &&
                    gameState.cooldowns[selectedCrew.id] > 0) ||
                  (selectedCrew.id === 'nikita' &&
                    (gameState.triageUsed || !gameState.crewHurt)) ||
                  (selectedCrew.id === 'berry' && gameState.day >= 10)
                }
                onClick={() => {
                  const chosenId = selectedCrew.id;
                  const target =
                    chosenId === 'amy' ? overclockMeter : undefined;
                  setSelectedCrew(null);
                  onActivateAbility(chosenId, target);
                }}
                className="flex-[1.5] glossy-btn bg-amber-400 text-[20px] font-bold text-[#0B1736] flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none"
              >
                {selectedCrew.id === 'nikita' && !gameState.crewHurt ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>All Healthy</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Use {selectedCrew.abilityName}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
