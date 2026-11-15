import React from 'react';

const STARS = [
  { left: '6%', top: '8%', size: 4, o: 0.9 },
  { left: '14%', top: '21%', size: 3, o: 0.7 },
  { left: '24%', top: '6%', size: 5, o: 0.85 },
  { left: '35%', top: '15%', size: 3, o: 0.65 },
  { left: '48%', top: '9%', size: 4, o: 0.9 },
  { left: '62%', top: '18%', size: 3, o: 0.75 },
  { left: '74%', top: '7%', size: 5, o: 0.95 },
  { left: '85%', top: '14%', size: 3, o: 0.7 },
  { left: '93%', top: '10%', size: 4, o: 0.85 },
  { left: '11%', top: '38%', size: 3, o: 0.6 },
  { left: '29%', top: '31%', size: 4, o: 0.8 },
  { left: '54%', top: '34%', size: 3, o: 0.6 },
  { left: '69%', top: '28%', size: 4, o: 0.85 },
  { left: '89%', top: '35%', size: 3, o: 0.7 },
  { left: '8%', top: '58%', size: 4, o: 0.65 },
  { left: '92%', top: '62%', size: 4, o: 0.65 },
];

/**
 * Lightweight picture-book starry deep-navy sky backdrop with a gray Moon ground strip,
 * simple friendly Moon base dome, and solar panels along the bottom edge.
 */
export const MoonFooterArt: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#070E27] via-[#102052] to-[#1A2F6E]"
  >
    {/* Crisp Circular Stars (never aspect-stretched) */}
    {STARS.map((s, idx) => (
      <span
        key={idx}
        className="absolute rounded-full bg-[#FFF8E7]"
        style={{
          left: s.left,
          top: s.top,
          width: `${s.size}px`,
          height: `${s.size}px`,
          opacity: s.o,
        }}
      />
    ))}

    {/* Distant Round Blue Earth (hidden behind compact mobile header, visible on sm+) */}
    <svg
      viewBox="0 0 80 80"
      className="hidden sm:block absolute top-14 right-6 lg:right-10 w-14 h-14 opacity-95"
    >
      <circle cx="40" cy="40" r="32" fill="#38BDF8" stroke="#FFF8E7" strokeWidth="3.5" />
      <path
        d="M25 28 C34 22, 46 25, 42 36 C38 44, 24 41, 25 28 Z"
        fill="#4ADE80"
      />
      <path
        d="M48 44 C56 40, 62 49, 55 57 C48 61, 43 52, 48 44 Z"
        fill="#4ADE80"
      />
    </svg>

    {/* Bottom Gray Moon Ground Strip with Friendly Base & Solar Panels */}
    <svg
      viewBox="0 0 1200 130"
      preserveAspectRatio="xMidYMax slice"
      className="absolute bottom-0 left-0 w-full h-[76px] sm:h-[96px]"
    >
      <path
        d="M0 78 Q240 46 520 68 T1200 64 L1200 130 L0 130 Z"
        fill="#94A3B8"
        stroke="#0B1736"
        strokeWidth="4"
      />
      <ellipse cx="145" cy="100" rx="46" ry="11" fill="#64748B" stroke="#0B1736" strokeWidth="2.5" />
      <ellipse cx="965" cy="98" rx="54" ry="12" fill="#64748B" stroke="#0B1736" strokeWidth="2.5" />
      <ellipse cx="410" cy="108" rx="28" ry="7" fill="#64748B" stroke="#0B1736" strokeWidth="2" />

      {/* Friendly Base Dome */}
      <g transform="translate(525, 10)">
        <rect x="-78" y="38" width="64" height="22" rx="5" fill="#1D4ED8" stroke="#0B1736" strokeWidth="3.5" />
        <line x1="-56" y1="38" x2="-56" y2="60" stroke="#93C5FD" strokeWidth="2" />
        <line x1="-34" y1="38" x2="-34" y2="60" stroke="#93C5FD" strokeWidth="2" />
        <rect x="-49" y="60" width="8" height="10" fill="#475569" stroke="#0B1736" strokeWidth="2" />

        <rect x="164" y="38" width="64" height="22" rx="5" fill="#1D4ED8" stroke="#0B1736" strokeWidth="3.5" />
        <line x1="186" y1="38" x2="186" y2="60" stroke="#93C5FD" strokeWidth="2" />
        <line x1="208" y1="38" x2="208" y2="60" stroke="#93C5FD" strokeWidth="2" />
        <rect x="192" y="60" width="8" height="10" fill="#475569" stroke="#0B1736" strokeWidth="2" />

        <path
          d="M15 70 A60 52 0 0 1 135 70 Z"
          fill="#FFF8E7"
          stroke="#0B1736"
          strokeWidth="4"
        />
        <rect x="5" y="64" width="140" height="13" rx="6.5" fill="#CBD5E1" stroke="#0B1736" strokeWidth="3.5" />
        <circle cx="75" cy="40" r="13" fill="#FDE047" stroke="#0B1736" strokeWidth="3.5" />
        <line x1="75" y1="18" x2="75" y2="2" stroke="#0B1736" strokeWidth="3.5" />
        <circle cx="75" cy="2" r="4.5" fill="#FB923C" stroke="#0B1736" strokeWidth="2.5" />
      </g>
    </svg>
  </div>
);
