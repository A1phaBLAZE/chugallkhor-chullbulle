import React from 'react';

const COLORS = [
  '#FACC15',
  '#38BDF8',
  '#34D399',
  '#F472B6',
  '#A78BFA',
  '#FB923C',
];

const PIECES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + ((i * 5.3) % 90)}%`,
  delay: `${(i % 6) * 80}ms`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (15 + (i % 4) * 12)}px`,
  color: COLORS[i % COLORS.length],
}));

export const ConfettiBurst: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[70] pointer-events-none overflow-hidden"
    >
      {PIECES.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece absolute top-0 w-3 h-3 rounded-sm border border-[#0B1736]/40"
          style={
            {
              left: piece.left,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              '--drift': piece.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
