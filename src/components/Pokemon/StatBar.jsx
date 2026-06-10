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

export function statPctColor(pct) {
  if (pct >= 75) return 'text-green-400';
  if (pct >= 50) return 'text-[#58A6FF]';
  if (pct >= 25) return 'text-yellow-500';
  return 'text-red-400';
}

/**
 * StatBar — horizontal bar showing a stat value relative to a max.
 * @param {string}    label
 * @param {number}    value
 * @param {number}    [max=400]
 * @param {string}    [color]       - Tailwind bg class. Auto-detected from label if omitted.
 * @param {boolean}   [animate]     - Animate bar on mount (default true).
 * @param {number}    [percentile]  - Cross-Pokémon percentile rank shown after the value.
 * @param {number}    [barPercent]  - If set, directly controls bar fill % (overrides value/max).
 * @param {Function}  [onClick]     - If set, renders as a button with hover state.
 */
export default function StatBar({ label, value, max = 400, color, animate = true, percentile, barPercent, onClick }) {
  const barColor = useMemo(() => resolveColor(label, color), [label, color]);
  const pct = barPercent != null
    ? Math.min(100, Math.max(0, barPercent))
    : Math.min(100, Math.max(0, (value / max) * 100));

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left ${
        onClick ? 'group cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity' : ''
      }`}
    >
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

      {/* Percentile badge */}
      {percentile != null && (
        <span className={`text-[10px] font-medium flex-shrink-0 w-7 text-right ${statPctColor(percentile)}`}>
          {percentile}th
        </span>
      )}

      {/* Clickable hint */}
      {onClick && (
        <svg
          className="w-3 h-3 text-[#484F58] group-hover:text-[#8B949E] flex-shrink-0 transition-colors"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </Tag>
  );
}
