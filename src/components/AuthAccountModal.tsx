import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { CloudDownload, CloudUpload, LogIn, LogOut, Trophy, X } from 'lucide-react';
import {
  CloudCommanderLeader,
  fetchCloudLeaderboard,
  signInCommander,
  signOutCommander,
} from '../services/cloudSync';

interface AuthAccountModalProps {
  user: User | null;
  onClose: () => void;
  onCloudSave: () => Promise<void>;
  onCloudLoad: () => Promise<void>;
}

export const AuthAccountModal: React.FC<AuthAccountModalProps> = ({
  user,
  onClose,
  onCloudSave,
  onCloudLoad,
}) => {
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<CloudCommanderLeader[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchCloudLeaderboard()
      .then((rows) => setLeaders(rows))
      .catch(() => {});
  }, [user]);

  const handleSignIn = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await signInCommander();
      setStatusMsg('Signed in! Ready to save your Moon Base to the cloud.');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Sign-in cancelled or failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await onCloudSave();
      const rows = await fetchCloudLeaderboard().catch(() => leaders);
      setLeaders(rows);
      setStatusMsg('Moon Base saved to the cloud!');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Could not save to cloud.');
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await onCloudLoad();
      setStatusMsg('Loaded your saved Moon Base!');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Could not load cloud save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Commander Cloud Profile"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3"
    >
      <div className="w-full max-w-[420px] max-h-[88dvh] rounded-3xl bg-[#101C44] border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-300" />
            <h2 className="font-display text-lg font-bold text-white">
              Commander Cloud & Ranks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Commander Profile"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {!user ? (
            <div className="rounded-2xl bg-[#182758] border border-white/15 p-4 text-center space-y-3">
              <p className="text-sm text-slate-100 leading-relaxed">
                Sign in with Google to save your Moon Base buildings, keep your cat crew’s AI memories across devices, and join the Moon Science Rankings!
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleSignIn}
                className="w-full min-h-[48px] rounded-2xl bg-amber-500 text-slate-950 font-display text-base font-bold flex items-center justify-center gap-2 hover:bg-amber-400 disabled:opacity-50"
              >
                <LogIn className="w-5 h-5" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#182758] border border-white/15 p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-sky-300 font-bold">Signed In Commander</p>
                  <p className="text-sm font-bold text-white truncate">
                    {user.displayName || user.email || 'Lunar Commander'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signOutCommander()}
                  className="min-h-[38px] px-3 rounded-xl bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 hover:bg-white/20 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSave}
                  className="min-h-[44px] rounded-2xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Save Base</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleLoad}
                  className="min-h-[44px] rounded-2xl bg-sky-500/20 border border-sky-400/45 text-sky-100 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-sky-500/30 disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>Load Base</span>
                </button>
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="rounded-xl bg-amber-400/15 border border-amber-300/40 px-3 py-2 text-xs text-amber-100 text-center">
              {statusMsg}
            </div>
          )}

          {leaders.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Moon Science Leaderboard
              </h3>
              {leaders.map((l, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#172556] border border-white/10 px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-white truncate">
                    #{idx + 1} {l.commanderName} · HQ Lv.{l.baseLevel}
                  </span>
                  <span className="font-mono-num font-bold text-violet-200 shrink-0">
                    {l.scienceScore} Sci · {l.medal}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
