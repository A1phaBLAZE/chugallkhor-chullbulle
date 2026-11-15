import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, ImagePlus, Play, Sparkles, X } from 'lucide-react';
import { CREW_MEMBERS, VIDEO_CONFIG } from '../game/gameData';
import { CrewId } from '../game/types';

interface ClipAnimatorModalProps {
  day: number;
  onClose: () => void;
}

export const ClipAnimatorModal: React.FC<ClipAnimatorModalProps> = ({
  day,
  onClose,
}) => {
  const [tab, setTab] = useState<'intro' | 'animator'>('animator');
  const [caption, setCaption] = useState(`Day ${day} Moon Base Log`);
  const [heroId, setHeroId] = useState<CrewId>('capt');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [uploadedImg, setUploadedImg] = useState<HTMLImageElement | null>(null);
  const [uploadedLabel, setUploadedLabel] = useState<string>('Lunar Horizon');
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const m = CREW_MEMBERS.find((c) => c.id === heroId)!;
    const img = new Image();
    img.src = m.avatar;
    heroImgRef.current = img;
  }, [heroId]);

  useEffect(() => {
    if (tab !== 'animator') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;

        // Background
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#070F2B');
        g.addColorStop(1, '#1A2D64');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        if (uploadedImg) {
          // Animated slow Ken Burns zoom + pan over user's photo!
          const scale = 1.05 + Math.sin(t * 0.9) * 0.05;
          const dw = w * scale;
          const dh = h * scale;
          const dx = (w - dw) / 2 + Math.sin(t * 0.7) * 10;
          const dy = (h - dh) / 2 + Math.cos(t * 0.6) * 8;
          ctx.drawImage(uploadedImg, dx, dy, dw, dh);
          ctx.fillStyle = 'rgba(7, 15, 43, 0.28)';
          ctx.fillRect(0, 0, w, h);
        }

        // Drifting stars
        for (let i = 0; i < 24; i++) {
          const sx = ((i * 53 + t * 18) % 100) * 0.01 * w;
          const sy = ((i * 29 + 11) % 85) * 0.01 * h;
          ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#BAE6FD';
          ctx.beginPath();
          ctx.arc(sx, sy, i % 3 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Floating Astronaut Cat Badge
        const catX = w * 0.5 + Math.sin(t * 1.4) * (w * 0.14);
        const catY = h * 0.44 + Math.cos(t * 2.1) * 10;
        const r = Math.min(w, h) * 0.14;
        const heroImg = heroImgRef.current;

        ctx.save();
        ctx.beginPath();
        ctx.arc(catX, catY, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#79e3fe';
        ctx.fillRect(catX - r, catY - r, r * 2, r * 2);
        if (heroImg && heroImg.complete && heroImg.naturalWidth > 0) {
          ctx.drawImage(heroImg, catX - r, catY - r, r * 2, r * 2);
        }
        ctx.restore();
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(catX, catY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Mission Caption Bar
        ctx.fillStyle = 'rgba(11, 19, 43, 0.85)';
        ctx.fillRect(14, h - 52, w - 28, 38);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '700 15px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(caption.slice(0, 40) || 'Moon Base Mission!', w / 2, h - 33);
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [tab, caption, heroId, uploadedImg, aspectRatio]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setUploadedImg(img);
        setUploadedLabel(file.name);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRecordClip = () => {
    const canvas = canvasRef.current;
    if (!canvas || !('captureStream' in canvas) || typeof MediaRecorder === 'undefined') {
      return;
    }
    setRecording(true);
    setRecordedUrl(null);
    const stream = canvas.captureStream(24);
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedUrl(URL.createObjectURL(blob));
      setRecording(false);
    };
    rec.start();
    setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
    }, 3200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Video Studio"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-3"
    >
      <div className="w-full max-w-[460px] max-h-[92dvh] rounded-3xl bg-[#101C44] border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-300" />
            <h2 className="font-display text-lg font-bold text-white">
              Mission Clip Studio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Video Studio"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setTab('animator')}
            className={`min-h-[38px] rounded-xl text-xs font-bold transition ${
              tab === 'animator'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Animate Photo / Scene
          </button>
          <button
            type="button"
            onClick={() => setTab('intro')}
            className={`min-h-[38px] rounded-xl text-xs font-bold transition ${
              tab === 'intro'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Mission Intro Film
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
          {tab === 'intro' ? (
            <div className="space-y-3">
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/15">
                <video
                  src={VIDEO_CONFIG.intro}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-200 text-center">
                Our four cat astronauts blasting off on their 10-day Moon adventure!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={aspectRatio === '16:9' ? 400 : 240}
                  height={aspectRatio === '16:9' ? 225 : 360}
                  className="rounded-2xl border border-white/20 shadow-lg max-h-[220px] w-auto bg-[#070F2B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="min-h-[42px] rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-sky-500/30">
                  <ImagePlus className="w-4 h-4" />
                  <span className="truncate max-w-[120px]">
                    {uploadedImg ? uploadedLabel : 'Upload Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setAspectRatio((r) => (r === '16:9' ? '9:16' : '16:9'))
                  }
                  className="min-h-[42px] rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/15"
                >
                  Frame: {aspectRatio}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {CREW_MEMBERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setHeroId(c.id)}
                    className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold ${
                      heroId === c.id
                        ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                        : 'bg-white/5 border-white/10 text-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={40}
                placeholder="Write a mission caption..."
                className="w-full min-h-[42px] rounded-2xl bg-[#182758] border border-white/20 px-3 text-xs text-white focus:outline-none focus:border-amber-300"
              />

              <button
                type="button"
                disabled={recording}
                onClick={handleRecordClip}
                className="w-full min-h-[46px] rounded-2xl bg-amber-500 text-slate-950 font-display text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-400 disabled:opacity-50"
              >
                {recording ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Recording 3s Space Clip...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Create Animated Clip (WebM)</span>
                  </>
                )}
              </button>

              {recordedUrl && (
                <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/40 p-3 space-y-2">
                  <video
                    src={recordedUrl}
                    controls
                    loop
                    autoPlay
                    className="w-full rounded-xl max-h-[160px] bg-black"
                  />
                  <a
                    href={recordedUrl}
                    download={`moon-base-day${day}.webm`}
                    className="w-full min-h-[38px] rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Animated Clip</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
