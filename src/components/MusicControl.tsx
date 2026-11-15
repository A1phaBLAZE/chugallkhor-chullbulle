import React, { useEffect, useRef, useState } from 'react';

interface MusicControlProps {
  soundEnabled: boolean;
  musicVolume: number;
  distractionFree: boolean;
  onToggleSound: () => void;
  onChangeVolume: (volume: number) => void;
}

const SpeakerIcon: React.FC<{ muted?: boolean; className?: string }> = ({
  muted = false,
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M10.5 5.2L6.6 8.5H3.8C3.08 8.5 2.5 9.08 2.5 9.8V14.2C2.5 14.92 3.08 15.5 3.8 15.5H6.6L10.5 18.8C11.15 19.35 12.15 18.89 12.15 18.04V5.96C12.15 5.11 11.15 4.65 10.5 5.2Z"
      fill={muted ? '#94A3B8' : '#1D4ED8'}
      stroke="#0B1736"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {muted ? (
      <path
        d="M4 4L20 20"
        stroke="#0B1736"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    ) : (
      <>
        <path
          d="M15.4 9.1C16.25 10.05 16.65 11.02 16.65 12C16.65 12.98 16.25 13.95 15.4 14.9"
          stroke="#0B1736"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M18.3 6.7C19.8 8.25 20.5 10.02 20.5 12C20.5 13.98 19.8 15.75 18.3 17.3"
          stroke="#0B1736"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

const SmallLowSpeakerIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-4 h-4 shrink-0">
    <path
      d="M9.5 4.8L6.2 7.5H3.8C3.25 7.5 2.8 7.95 2.8 8.5V11.5C2.8 12.05 3.25 12.5 3.8 12.5H6.2L9.5 15.2C10.05 15.65 10.85 15.26 10.85 14.56V5.44C10.85 4.74 10.05 4.35 9.5 4.8Z"
      fill="#64748B"
      stroke="#0B1736"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const SmallLoudSpeakerIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-4 h-4 shrink-0">
    <path
      d="M8.5 4.8L5.2 7.5H2.8C2.25 7.5 1.8 7.95 1.8 8.5V11.5C1.8 12.05 2.25 12.5 2.8 12.5H5.2L8.5 15.2C9.05 15.65 9.85 15.26 9.85 14.56V5.44C9.85 4.74 9.05 4.35 8.5 4.8Z"
      fill="#1D4ED8"
      stroke="#0B1736"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M12.6 7.8C13.3 8.55 13.6 9.3 13.6 10C13.6 10.7 13.3 11.45 12.6 12.2"
      stroke="#0B1736"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M15.1 5.9C16.35 7.15 16.9 8.55 16.9 10C16.9 11.45 16.35 12.85 15.1 14.1"
      stroke="#0B1736"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const MusicControl: React.FC<MusicControlProps> = ({
  soundEnabled,
  musicVolume,
  distractionFree,
  onToggleSound,
  onChangeVolume,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const volumePct = Math.round(musicVolume * 100);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 4000);
  };

  // Close popover by default when entering mini-games, videos, or Day title card
  useEffect(() => {
    if (distractionFree) {
      setIsOpen(false);
    }
  }, [distractionFree]);

  // Auto-close after 4 seconds without touching, on outside click, or on Escape
  useEffect(() => {
    if (!isOpen) {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    resetInactivityTimer();

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isOpen]);

  const isDimmed = distractionFree && !isOpen;
  const mutedLook = !soundEnabled;

  return (
    <div
      ref={containerRef}
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
      }}
      className="fixed z-[70] flex flex-col items-end"
    >
      <button
        type="button"
        aria-label="Music settings"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className={`w-[44px] h-[44px] min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 sm:min-w-[48px] sm:min-h-[48px] rounded-full border-[3px] border-[#0B1736] shadow-[0_3px_0_#0B1736] flex items-center justify-center transition-opacity focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:translate-y-0.5 ${
          mutedLook ? 'bg-[#F3EBD8]' : 'bg-[#FFF8E7] hover:bg-amber-50'
        } ${isDimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
      >
        <SpeakerIcon
          muted={mutedLook}
          className={`w-6 h-6 ${mutedLook ? 'opacity-70' : 'opacity-100'}`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Music settings"
          onPointerDown={resetInactivityTimer}
          onInput={resetInactivityTimer}
          onKeyDown={resetInactivityTimer}
          className="mt-2 w-[212px] max-w-[min(220px,calc(100vw-24px))] rounded-[16px] bg-[#FFF8E7] border-[3px] border-[#0B1736] shadow-[0_8px_20px_rgba(11,23,54,0.35)] p-3 space-y-3 animate-popover-fade"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[17px] font-bold text-[#0B1736]">
              Music
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Music"
              onClick={() => {
                resetInactivityTimer();
                onToggleSound();
              }}
              className={`min-h-[38px] min-w-[68px] px-3 rounded-full border-[2.5px] border-[#0B1736] font-display text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
                soundEnabled
                  ? 'bg-emerald-300 text-[#0B1736]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="music-control-volume"
              className="block font-display text-[15px] font-bold text-[#0B1736]"
            >
              Music volume
            </label>
            <div className="flex items-center gap-2">
              <SmallLowSpeakerIcon />
              <input
                id="music-control-volume"
                type="range"
                min={0}
                max={100}
                step={5}
                value={volumePct}
                aria-label="Music volume"
                onChange={(e) => {
                  resetInactivityTimer();
                  onChangeVolume(Number(e.target.value) / 100);
                }}
                className="w-full h-2.5 accent-amber-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
              />
              <SmallLoudSpeakerIcon />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
