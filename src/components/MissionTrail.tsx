import React from 'react';
import { Star } from 'lucide-react';

interface MissionTrailProps {
  currentDay: number;
}

export const MissionTrail: React.FC<MissionTrailProps> = ({ currentDay }) => (
  <nav
    aria-label={`Mission Trail: Day ${currentDay} of 10`}
    className="w-full rounded-[16px] bg-[#FFF8E7]/95 border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] px-2.5 py-1.5 flex items-center justify-between gap-1"
  >
    <span className="hidden sm:inline text-[13px] font-bold text-[#1E3A8A] pr-1 whitespace-nowrap">
      Trail
    </span>
    <div className="flex-1 flex items-center justify-between gap-1">
      {Array.from({ length: 10 }, (_, idx) => {
        const dayNum = idx + 1;
        const isDone = dayNum < currentDay;
        const isCurrent = dayNum === currentDay;

        return (
          <div
            key={dayNum}
            title={`Day ${dayNum}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={`relative flex items-center justify-center rounded-full border-2 font-bold transition-all ${
              isCurrent
                ? 'w-7 h-7 sm:w-8 sm:h-8 bg-amber-400 border-[#0B1736] text-[#0B1736] text-[13px] sm:text-[14px] scale-110 shadow-[0_2px_0_#0B1736]'
                : isDone
                  ? 'w-6 h-6 sm:w-7 sm:h-7 bg-emerald-300 border-[#0B1736] text-[#0B1736]'
                  : 'w-6 h-6 sm:w-7 sm:h-7 bg-slate-200 border-[#0B1736]/50 text-slate-600 text-[12px]'
            }`}
          >
            {isDone ? (
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-[#0B1736]" />
            ) : (
              <span>{dayNum}</span>
            )}
          </div>
        );
      })}
    </div>
  </nav>
);
