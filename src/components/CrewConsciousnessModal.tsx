import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Brain, Send, Sparkles, X, Zap } from 'lucide-react';
import { BaseState, CrewConsciousnessState } from '../game/baseEngine';
import { CREW_MEMBERS } from '../game/gameData';
import { CrewId, GameState, MeterKey } from '../game/types';
import { CrewMemoryItem, recordThoughtToFirestore } from '../services/cloudSync';

interface CrewConsciousnessModalProps {
  initialCrewId: CrewId;
  gameState: GameState;
  baseState: BaseState;
  stormLevel: number;
  user: User | null;
  memories: CrewMemoryItem[];
  onClose: () => void;
  onAddMemory: (item: CrewMemoryItem) => void;
  onUpdateThought: (crewId: CrewId, thought: CrewConsciousnessState) => void;
  onActivateAbility: (crewId: CrewId, overclockMeter?: MeterKey) => void;
}

const QUICK_PROMPTS = [
  'What should we upgrade next?',
  'How are you feeling right now?',
  'Tell me a cool Moon fact!',
];

export const CrewConsciousnessModal: React.FC<CrewConsciousnessModalProps> = ({
  initialCrewId,
  gameState,
  baseState,
  stormLevel,
  user,
  memories,
  onClose,
  onAddMemory,
  onUpdateThought,
  onActivateAbility,
}) => {
  const [activeCrewId, setActiveCrewId] = useState<CrewId>(initialCrewId);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOverclockPicker, setShowOverclockPicker] = useState(false);

  const member = CREW_MEMBERS.find((c) => c.id === activeCrewId)!;
  const currentThought = baseState.thoughts[activeCrewId];
  const crewHistory = memories.filter((m) => m.crewId === activeCrewId).slice(-12);

  const cooldown = gameState.cooldowns[activeCrewId];
  const isRefused = gameState.refusedAbilityToday === activeCrewId;
  const isNikitaBlocked =
    activeCrewId === 'nikita' && (gameState.triageUsed || !gameState.crewHurt);
  const isBerryBlocked = activeCrewId === 'berry' && gameState.day >= 10;
  const abilityDisabled =
    gameState.abilityUsedToday ||
    cooldown > 0 ||
    isRefused ||
    isNikitaBlocked ||
    isBerryBlocked;

  const callCrewMind = async (
    mode: 'chat' | 'autonomous_thought',
    messageText?: string
  ) => {
    const trimmed = (messageText ?? inputText).trim();
    if (mode === 'chat' && !trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    if (mode === 'chat') {
      onAddMemory({
        crewId: activeCrewId,
        sender: 'user',
        message: trimmed,
        moodState: 'commander',
        dayContext: gameState.day,
      });
      setInputText('');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const buildingSummary = baseState.buildings
        .map((b) => `${b.type} Lv.${b.level}`)
        .join(', ');

      const res = await fetch('/api/crew/think', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          crewId: activeCrewId,
          mode,
          userMessage: trimmed,
          recentMemories: crewHistory.slice(-6),
          gameContext: {
            day: gameState.day,
            power: gameState.meters.power,
            oxygen: gameState.meters.airWater,
            shields: gameState.meters.radiation,
            mood: gameState.meters.mood,
            science: gameState.meters.science,
            moonRocks: baseState.moonRocks,
            wavesSurvived: baseState.wavesCleared,
            activeStormLevel: stormLevel,
            buildingSummary,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach crew comms.');
      }

      const nextThought: CrewConsciousnessState = {
        crewId: activeCrewId,
        innerThought: data.innerThought || currentThought.innerThought,
        moodState: data.moodState || 'focused',
        lastUpdatedAt: Date.now(),
      };
      onUpdateThought(activeCrewId, nextThought);

      const replyItem: CrewMemoryItem = {
        crewId: activeCrewId,
        sender: mode === 'autonomous_thought' ? 'thought' : 'cat',
        message: data.reply || data.innerThought,
        moodState: nextThought.moodState,
        dayContext: gameState.day,
      };
      onAddMemory(replyItem);

      if (user) {
        recordThoughtToFirestore(user, {
          crewId: activeCrewId,
          sender: replyItem.sender,
          message: replyItem.message,
          day: gameState.day,
        }).catch(() => {});
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Crew radio hit space static.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crew AI Consciousness Comms"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3"
    >
      <div className="w-full max-w-[440px] max-h-[90dvh] rounded-3xl bg-[#101C44] border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        {/* Header & Cat Switcher */}
        <div className="p-3.5 border-b border-white/10 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-300" />
              <h2 className="font-display text-lg font-bold text-white">
                Crew AI Consciousness
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Crew Comms"
              className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {CREW_MEMBERS.map((c) => {
              const selected = c.id === activeCrewId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCrewId(c.id);
                    setShowOverclockPicker(false);
                    setErrorMsg(null);
                  }}
                  className={`rounded-2xl p-1.5 flex flex-col items-center border transition ${
                    selected
                      ? 'bg-[#1D3170] border-amber-300'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-9 h-9 rounded-full object-cover bg-[#79e3fe] border"
                    style={{ borderColor: c.accentColor }}
                  />
                  <span className="mt-1 text-[10px] font-bold text-white truncate max-w-full">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Cat Mind Banner + Special Ability */}
        <div className="p-3 bg-[#162558] border-b border-white/10 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-sky-300">
                {member.name} · {member.role} ·{' '}
                <span className="text-amber-300 uppercase">
                  {currentThought.moodState}
                </span>
              </p>
              <p className="text-xs text-slate-100 italic truncate">
                Thinking: “{currentThought.innerThought}”
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => callCrewMind('autonomous_thought')}
              className="min-h-[36px] px-2.5 rounded-xl bg-violet-500/25 border border-violet-300/40 text-violet-100 text-[11px] font-bold flex items-center gap-1 hover:bg-violet-500/40 disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pulse Mind</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-300 leading-tight">
              {member.abilityDescription}
            </span>
            <button
              type="button"
              disabled={abilityDisabled}
              onClick={() => {
                if (activeCrewId === 'amy') {
                  setShowOverclockPicker((v) => !v);
                } else {
                  onActivateAbility(activeCrewId);
                  onClose();
                }
              }}
              className="min-h-[38px] px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1 hover:bg-amber-400 disabled:opacity-45 shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{member.abilityName}</span>
            </button>
          </div>

          {showOverclockPicker && activeCrewId === 'amy' && (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {(['power', 'airWater', 'radiation', 'food', 'mood'] as MeterKey[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onActivateAbility('amy', m);
                    setShowOverclockPicker(false);
                    onClose();
                  }}
                  className="min-h-[36px] rounded-xl bg-amber-400/20 border border-amber-300/50 text-amber-100 text-[11px] font-bold capitalize hover:bg-amber-400/35"
                >
                  {m === 'airWater' ? 'Air' : m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Memory Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {crewHistory.length === 0 ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-center text-xs text-slate-200">
              Say hello to <strong>{member.name}</strong>! Every cat has their own personality, memories, and ideas for surviving the Moon.
            </div>
          ) : (
            crewHistory.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  item.sender === 'user'
                    ? 'bg-amber-500/20 border border-amber-300/40 text-amber-50 ml-8'
                    : 'bg-[#1B2C68] border border-white/15 text-slate-100 mr-6'
                }`}
              >
                <span className="block text-[10px] font-bold opacity-75 mb-0.5">
                  {item.sender === 'user'
                    ? 'Commander (You)'
                    : item.sender === 'thought'
                      ? `${member.name} (Autonomous Thought)`
                      : member.name}
                </span>
                {item.message}
              </div>
            ))
          )}

          {loading && (
            <div className="text-xs text-sky-300 font-semibold px-2">
              {member.name} is thinking...
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-400/40 px-3 py-2 text-xs text-rose-100">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Quick Prompts + Chat Input */}
        <div className="p-3 border-t border-white/10 space-y-2 shrink-0 bg-[#0D173A]">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                disabled={loading}
                onClick={() => callCrewMind('chat', qp)}
                className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-sky-100 hover:bg-white/20"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              callCrewMind('chat');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Talk with ${member.name}...`}
              maxLength={250}
              className="flex-1 min-h-[44px] rounded-2xl bg-[#182758] border border-white/20 px-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              aria-label={`Send message to ${member.name}`}
              className="min-w-[44px] min-h-[44px] rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 disabled:opacity-45"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
