import React, { useState } from 'react';
import { ExternalLink, Globe, MapPin, Navigation, Search, X } from 'lucide-react';

interface GroundedPlace {
  title: string;
  uri: string;
  snippets?: string[];
}

interface SpaceAtlasModalProps {
  onClose: () => void;
}

const PRESET_QUERIES = [
  'NASA space centers and astronaut training bases in the USA',
  'Famous volcanic craters and Moon-analog training sites on Earth',
  'Public planetariums and space observatories near me',
];

export const SpaceAtlasModal: React.FC<SpaceAtlasModalProps> = ({ onClose }) => {
  const [queryText, setQueryText] = useState(PRESET_QUERIES[0]);
  const [useGps, setUseGps] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [places, setPlaces] = useState<GroundedPlace[]>([]);

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Location lookup is unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setUseGps(true);
        setErrorMsg(null);
      },
      () => {
        setErrorMsg('Location permission declined—searching global space sites instead.');
        setUseGps(false);
      },
      { timeout: 6000 }
    );
  };

  const runSearch = async (customQuery?: string) => {
    const q = (customQuery ?? queryText).trim();
    if (!q) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/maps/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          latitude: useGps && coords ? coords.latitude : undefined,
          longitude: useGps && coords ? coords.longitude : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not load Earth Space Atlas.');
      }
      setAnswerText(data.text || '');
      setPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Earth Space Atlas lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Earth Space Atlas"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3"
    >
      <div className="w-full max-w-[460px] max-h-[90dvh] rounded-3xl bg-[#101C44] border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="font-display text-lg font-bold text-white leading-none">
                Earth Space Atlas
              </h2>
              <p className="text-[11px] text-sky-200 mt-0.5">
                Real NASA sites & Moon-analog craters via Google Maps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Space Atlas"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-white/10 space-y-2 shrink-0 bg-[#152455]">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setQueryText(preset);
                  runSearch(preset);
                }}
                className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-white/20"
              >
                {preset.slice(0, 34)}…
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search space centers, observatories, craters..."
              className="flex-1 min-h-[44px] rounded-2xl bg-[#0F193B] border border-white/20 px-3 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-300"
            />
            <button
              type="button"
              onClick={handleEnableLocation}
              aria-label="Use my location for nearby space places"
              title="Use my location"
              className={`min-w-[44px] min-h-[44px] rounded-2xl border flex items-center justify-center ${
                useGps
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={loading || !queryText.trim()}
              aria-label="Explore Google Maps space places"
              className="min-w-[44px] min-h-[44px] rounded-2xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center hover:bg-emerald-400 disabled:opacity-45"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
          {!answerText && !loading && !errorMsg && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center text-xs text-slate-200 space-y-2">
              <p>
                Ask Berry to map real astronaut training centers, observatories, or Moon-like craters on Earth!
              </p>
              <button
                type="button"
                onClick={() => runSearch()}
                className="min-h-[42px] px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
              >
                Explore NASA Sites Now
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 text-xs text-emerald-200 font-semibold">
              Scanning Earth with Berry’s Google Maps radar...
            </div>
          )}

          {errorMsg && (
            <div className="rounded-2xl bg-rose-500/20 border border-rose-400/40 p-3 text-xs text-rose-100">
              {errorMsg}
            </div>
          )}

          {answerText && (
            <div className="rounded-2xl bg-[#182758] border border-white/15 p-3.5 text-xs text-slate-100 leading-relaxed whitespace-pre-line">
              {answerText}
            </div>
          )}

          {places.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                Grounded Google Maps Locations
              </h3>
              {places.map((p, idx) => (
                <a
                  key={idx}
                  href={p.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl bg-[#1B2D66] border border-emerald-400/35 p-3 hover:bg-[#233980] transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">
                        {p.title}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-sky-300 shrink-0" />
                  </div>
                  {p.snippets && p.snippets.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-slate-200 line-clamp-2">
                      “{p.snippets[0]}”
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
