import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-sky-500/20 border border-sky-400/50 px-4 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 active:scale-[0.98] transition"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">Install Moon Base App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-sky-500/20 border border-sky-400/50 px-4 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 active:scale-[0.98] transition"
        >
          <Share className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#182652] border border-sky-400/30 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-white">
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  aria-label="Close install instructions"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-200 leading-relaxed">
                <li>1. Tap the <strong>Share</strong> icon in Safari’s bar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Open Moon Base Mission right from your home screen!</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-2xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.98] transition"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
