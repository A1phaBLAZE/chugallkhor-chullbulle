import React, { useEffect, useRef, useState } from 'react';
import {
  Droplets,
  Heart,
  Shield,
  Sprout,
  Star,
  X,
  Zap,
} from 'lucide-react';
import {
  BASE_SYSTEM_ORDER,
  MISSION_CONTROL_CARDS,
} from '../game/gameData';
import { BaseSystemKey, MeterKey, Meters } from '../game/types';

export const SYSTEM_VISUALS: Record<
  MeterKey,
  {
    label: string;
    shortLabel: string;
    barBg: string;
    pillBg: string;
    iconColor: string;
    badgeText: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  power: {
    label: 'Power',
    shortLabel: 'Power',
    barBg: 'bg-yellow-400',
    pillBg: 'bg-yellow-100 border-yellow-500',
    iconColor: 'text-amber-600',
    badgeText: 'text-amber-900',
    Icon: Zap,
  },
  airWater: {
    label: 'Air & Water',
    shortLabel: 'Air & Water',
    barBg: 'bg-sky-400',
    pillBg: 'bg-sky-100 border-sky-500',
    iconColor: 'text-sky-600',
    badgeText: 'text-sky-900',
    Icon: Droplets,
  },
  radiation: {
    label: 'Radiation Protection',
    shortLabel: 'Radiation',
    barBg: 'bg-purple-500',
    pillBg: 'bg-purple-100 border-purple-500',
    iconColor: 'text-purple-700',
    badgeText: 'text-purple-950',
    Icon: Shield,
  },
  food: {
    label: 'Food',
    shortLabel: 'Food',
    barBg: 'bg-emerald-500',
    pillBg: 'bg-emerald-100 border-emerald-600',
    iconColor: 'text-emerald-700',
    badgeText: 'text-emerald-950',
    Icon: Sprout,
  },
  mood: {
    label: 'Crew Mood',
    shortLabel: 'Mood',
    barBg: 'bg-pink-500',
    pillBg: 'bg-pink-100 border-pink-500',
    iconColor: 'text-pink-600',
    badgeText: 'text-pink-950',
    Icon: Heart,
  },
};

interface MeterBarButtonProps {
  meter: MeterKey;
  value: number;
  onInspect: (meter: MeterKey) => void;
}

export const MeterBarButton: React.FC<MeterBarButtonProps> = ({
  meter,
  value,
  onInspect,
}) => {
  const { label, shortLabel, barBg, iconColor, Icon } = SYSTEM_VISUALS[meter];
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const isLow = clamped < 30;
  const prevValueRef = useRef(clamped);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (prevValueRef.current !== clamped) {
      setAnimClass(isLow ? 'animate-soft-shake' : 'animate-meter-bounce');
      prevValueRef.current = clamped;
      const t = window.setTimeout(() => setAnimClass(''), 480);
      return () => window.clearTimeout(t);
    }
  }, [clamped, isLow]);

  return (
    <button
      type="button"
      data-testid={`meter-${meter}`}
      onClick={() => onInspect(meter)}
      aria-label={`${label} ${clamped} out of 100. Tap for Mission Control Card.`}
      className={`w-full text-left rounded-[16px] px-3 py-1.5 border-[2.5px] border-[#0B1736] shadow-[0_3px_0_#0B1736] transition active:translate-y-0.5 ${animClass} ${
        isLow ? 'bg-rose-100' : 'bg-[#FFF8E7] hover:bg-[#FFFDF5]'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isLow ? 'text-rose-600' : iconColor}`} />
          <span className="sm:hidden text-[14px] font-bold text-[#0B1736] truncate">
            {shortLabel}
          </span>
          <span className="hidden sm:inline text-[15px] font-bold text-[#0B1736] truncate">
            {label}
          </span>
          {isLow && (
            <span className="text-[11px] font-bold text-rose-700 shrink-0">
              LOW!
            </span>
          )}
        </div>
        <span
          className={`tabular-nums text-[16px] font-bold shrink-0 ${
            isLow ? 'text-rose-700' : 'text-[#0B1736]'
          }`}
        >
          {clamped}
        </span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-slate-200 border border-[#0B1736]/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isLow ? 'bg-rose-500' : barBg
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </button>
  );
};

interface TopHudMetersProps {
  meters: Meters;
  onInspectMeter: (meter: MeterKey) => void;
}

export const TopHudMeters: React.FC<TopHudMetersProps> = ({
  meters,
  onInspectMeter,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch">
    {/* 4 Equal Base Systems in a crisp 2x2 Grid */}
    <div className="lg:col-span-8 grid grid-cols-2 gap-2">
      {BASE_SYSTEM_ORDER.map((key) => (
        <MeterBarButton
          key={key}
          meter={key}
          value={meters[key]}
          onInspect={onInspectMeter}
        />
      ))}
    </div>

    {/* Mood & Science right beside the 4 base systems */}
    <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-2">
      <MeterBarButton
        meter="mood"
        value={meters.mood}
        onInspect={onInspectMeter}
      />

      <div
        data-testid="meter-science"
        className="rounded-[16px] px-3 py-2 border-[2.5px] border-[#0B1736] bg-[#FFF8E7] shadow-[0_3px_0_#0B1736] flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
          <span className="text-[14px] sm:text-[15px] font-bold text-[#0B1736] truncate">
            Science Stars
          </span>
        </div>
        <span className="tabular-nums text-[18px] font-bold text-[#0B1736] shrink-0">
          {meters.science}
        </span>
      </div>
    </div>
  </div>
);

export const MissionControlCardContent: React.FC<{
  meterKey: MeterKey;
  currentValue?: number;
}> = ({ meterKey, currentValue }) => {
  const card = MISSION_CONTROL_CARDS[meterKey];
  const { Icon, iconColor, pillBg } = SYSTEM_VISUALS[meterKey];

  return (
    <div className={`rounded-[18px] border-[3px] border-[#0B1736] p-4 ${pillBg} text-[#0B1736]`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] border-2 border-[#0B1736] flex items-center justify-center shrink-0">
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <h3 className="font-display text-[22px] font-bold leading-tight">
            {card.title}
          </h3>
        </div>
        {typeof currentValue === 'number' && (
          <span className="tabular-nums text-[22px] font-bold px-2.5 py-0.5 rounded-xl bg-[#FFF8E7] border-2 border-[#0B1736]">
            {currentValue}
          </span>
        )}
      </div>

      <div className="space-y-2 text-[17px] leading-snug">
        <div>
          <p className="font-bold text-[15px] text-[#1E3A8A]">What is it?</p>
          <p>{card.whatIsIt}</p>
        </div>
        <div>
          <p className="font-bold text-[15px] text-[#1E3A8A]">
            Why does the crew need it?
          </p>
          <p>{card.whyCrewNeedsIt}</p>
        </div>
        <div className="rounded-xl bg-[#FFF8E7] border-2 border-[#0B1736]/30 p-2.5">
          <p className="font-bold text-[15px] text-emerald-800">
            Real NASA Fact · {card.sourceName}
          </p>
          <p className="mt-0.5">{card.realFact}</p>
        </div>
      </div>
    </div>
  );
};

export const MissionControlCardModal: React.FC<{
  meterKey: MeterKey;
  value: number;
  onClose: () => void;
}> = ({ meterKey, value, onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={`${MISSION_CONTROL_CARDS[meterKey].title} Mission Control Card`}
    className="fixed inset-0 z-50 bg-[#070E27]/80 flex items-center justify-center p-4"
  >
    <div className="storybook-card w-full max-w-md p-4 sm:p-5 animate-screen-enter">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[16px] font-bold text-[#1E3A8A]">
          Mission Control Card
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Mission Control Card"
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-200 border-2 border-[#0B1736] flex items-center justify-center text-[#0B1736] hover:bg-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <MissionControlCardContent meterKey={meterKey} currentValue={value} />

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
      >
        Got It!
      </button>
    </div>
  </div>
);

export const BaseSystemsGridCards: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    {BASE_SYSTEM_ORDER.map((key: BaseSystemKey) => (
      <MissionControlCardContent key={key} meterKey={key} />
    ))}
  </div>
);
