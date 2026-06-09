import { useMemo } from 'react';

const LABEL_COLOR_MAP = {
  attack:  'bg-red-500',
  atk:     'bg-red-500',
  defense: 'bg-blue-500',
  def:     'bg-blue-500',
  stamina: 'bg-green-500',
  sta:     'bg-green-500',
  hp:      'bg-green-500',
};

function resolveColor(label, explicitColor) {
  if (explicitColor) return explicitColor;
  const key = label.toLowerCase().split(' ')[0];
  return LABEL_COLOR_MAP[key] ?? 'bg-[#1F6FEB]';
}

/**
 * StatBar — horizontal bar showing a stat value relative to a max.
 * @param {string} label
 * @param {number} value
 * @param {number} [max=400]
 * @param {string} [color]     - Tailwind bg class. Auto-detected from label if omitted.
 * @param {boolean} [animate]  - Whether to animate the bar on mount (default true).
 */
export default function StatBar({ label, value, max = 400, color, animate = true }) {
  const barColor = useMemo(() => resolveColor(label, color), [label, color]);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Label */}
      <span className="text-[#8B949E] text-xs w-20 flex-shrink-0 truncate">{label}</span>

      {/* Bar track */}
      <div className="flex-1 bg-[#21262D] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${animate ? 'duration-500 ease-out' : ''} ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>

      {/* Value */}
      <span className="text-[#C9D1D9] text-xs font-mono w-10 text-right flex-shrink-0">
        {value}
      </span>
    </div>
  );
}
