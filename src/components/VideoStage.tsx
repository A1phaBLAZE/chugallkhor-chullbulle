import React, { useEffect, useState } from 'react';
import { FastForward, Film, Rocket } from 'lucide-react';
import { CREW_MEMBERS } from '../game/gameData';

interface VideoStageProps {
  src: string;
  title: string;
  caption: string;
  variant: 'intro' | 'crisis' | 'fail' | 'gold';
  skipLabel?: string;
  onComplete: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

/**
 * Plays a mission video clip with a Skip button in a clean picture-book frame.
 * If the clip URL is still a "[PASTE_...]" placeholder or fails to load,
 * it renders an illustrated crew story card so gameplay never stalls.
 */
export const VideoStage: React.FC<VideoStageProps> = ({
  src,
  title,
  caption,
  variant,
  skipLabel = 'Skip',
  onComplete,
  onPlayingChange,
}) => {
  const isPlaceholder = !src || src.startsWith('[PASTE_');
  const [videoFailed, setVideoFailed] = useState(false);

  const showFallback = isPlaceholder || videoFailed;

  useEffect(() => {
    return () => {
      onPlayingChange?.(false);
    };
  }, [onPlayingChange]);

  const badgeLabel =
    variant === 'intro'
      ? 'Mission Briefing'
      : variant === 'crisis'
        ? 'Lunar Update'
        : variant === 'fail'
          ? 'Rescue Pod'
          : 'Victory Broadcast';

  return (
    <div className="storybook-card flex flex-col justify-between p-5 gap-4 animate-screen-enter">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-[#1D4ED8]">{badgeLabel}</p>
          <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0B1736] leading-tight truncate">
            {title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            onPlayingChange?.(false);
            onComplete();
          }}
          className="glossy-btn px-4 bg-white text-[18px] font-bold text-[#0B1736] flex items-center gap-1.5 shrink-0 whitespace-nowrap"
        >
          <span>{skipLabel}</span>
          <FastForward className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full aspect-video rounded-[18px] overflow-hidden bg-[#102052] border-[3px] border-[#0B1736] flex items-center justify-center">
        {!showFallback ? (
          <video
            src={src}
            autoPlay
            playsInline
            controls
            onPlay={() => onPlayingChange?.(true)}
            onPause={() => onPlayingChange?.(false)}
            onEnded={() => {
              onPlayingChange?.(false);
              onComplete();
            }}
            onError={() => {
              onPlayingChange?.(false);
              setVideoFailed(true);
            }}
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center bg-gradient-to-b from-[#172554] via-[#1E3A8A] to-[#0F1736]">
            <div className="flex items-center justify-center -space-x-3 mb-3 animate-float-slow">
              {CREW_MEMBERS.map((member) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border-[3px] border-[#FFF8E7] shadow-lg bg-[#79e3fe]"
                />
              ))}
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#FFF8E7] border-2 border-[#0B1736] flex items-center justify-center text-[#0B1736]">
              {variant === 'gold' ? (
                <Rocket className="w-6 h-6" />
              ) : (
                <Film className="w-6 h-6" />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[16px] bg-sky-100 border-2 border-[#0B1736] p-4 text-center">
        <p className="text-[20px] font-semibold text-[#0B1736] leading-snug">
          {caption}
        </p>
        {showFallback && (
          <p className="mt-1.5 text-[16px] text-slate-700">
            {isPlaceholder
              ? 'Story card ready — tap Next to continue!'
              : 'Story mode active — tap Next to keep playing!'}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full glossy-btn bg-amber-400 text-[#0B1736] font-display text-[22px] font-bold"
      >
        Next
      </button>
    </div>
  );
};
