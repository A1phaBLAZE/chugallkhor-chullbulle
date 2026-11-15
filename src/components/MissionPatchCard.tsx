import React from 'react';
import {
  Dumbbell,
  Lock,
  Paintbrush,
  Radio,
  Rocket,
  Shield,
  Snowflake,
  Sprout,
  Sun,
} from 'lucide-react';
import { MISSION_PATCH_BADGES } from '../game/gameData';
import { MissionPatchIconKey } from '../game/types';

const AirBubbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="10" cy="13" r="6" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.18" />
    <circle cx="17.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
    <circle cx="8.2" cy="11.2" r="1.2" fill="currentColor" />
  </svg>
);

const SpaceHelmetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5v3.5A4.5 4.5 0 0 0 9 19h6a4.5 4.5 0 0 0 4.5-4.5V11A7.5 7.5 0 0 0 12 3.5Z"
      stroke="currentColor"
      strokeWidth="2.2"
      fill="currentColor"
      fillOpacity="0.14"
    />
    <rect x="7.5" y="8" width="9" height="6" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M5 17.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function renderPatchIcon(icon: MissionPatchIconKey, earned: boolean) {
  const cls = `w-6 h-6 ${earned ? 'text-[#0B1736]' : 'text-slate-400'}`;
  switch (icon) {
    case 'brush':
      return <Paintbrush className={cls} />;
    case 'bubble':
      return <AirBubbleIcon className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    case 'plant':
      return <Sprout className={cls} />;
    case 'sun':
      return <Sun className={cls} />;
    case 'ice':
      return <Snowflake className={cls} />;
    case 'dumbbell':
      return <Dumbbell className={cls} />;
    case 'helmet':
      return <SpaceHelmetIcon className={cls} />;
    case 'antenna':
      return <Radio className={cls} />;
    case 'rocket':
      return <Rocket className={cls} />;
  }
}

export const MissionPatchCard: React.FC<{
  earnedDays: number[];
  compact?: boolean;
}> = ({ earnedDays, compact = false }) => {
  const earnedSet = new Set(earnedDays);

  return (
    <div className="rounded-[18px] bg-sky-50 border-[2.5px] border-[#0B1736] p-3.5 text-left">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div>
          <h3 className="font-display text-[20px] font-bold text-[#0B1736] leading-tight">
            Mission Patch
          </h3>
          <p className="text-[14px] text-slate-700">
            Answer each day’s Quick Question right to earn all 10 round badges!
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-amber-300 border-2 border-[#0B1736] px-2.5 py-1 text-[15px] font-bold text-[#0B1736] tabular-nums">
          {earnedSet.size}/10
        </span>
      </div>

      <div
        className={`grid grid-cols-5 ${compact ? 'gap-2' : 'gap-2.5'}`}
      >
        {MISSION_PATCH_BADGES.map((badge) => {
          const earned = earnedSet.has(badge.day);
          return (
            <div
              key={badge.day}
              title={`Day ${badge.day}: ${badge.title}${earned ? ' (Earned!)' : ' (Locked)'}`}
              className="flex flex-col items-center text-center"
            >
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[2.5px] flex items-center justify-center transition ${
                  earned
                    ? 'bg-amber-300 border-[#0B1736] shadow-[0_3px_0_#0B1736]'
                    : 'bg-white border-dashed border-slate-400 opacity-75'
                }`}
              >
                {renderPatchIcon(badge.icon, earned)}
                {!earned && (
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-400" />
                )}
              </div>
              <span className="mt-1 text-[12px] font-bold text-[#0B1736] leading-tight">
                Day {badge.day}
              </span>
              {!compact && (
                <span className="text-[11px] text-slate-700 leading-tight hidden sm:block">
                  {badge.title}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
