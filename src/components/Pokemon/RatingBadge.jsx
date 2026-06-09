const TIER_STYLES = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  A: 'bg-green-500/20 text-green-400 border-green-500/40',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  C: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  D: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5 min-w-[1.25rem]',
  md: 'text-sm px-2 py-0.5 min-w-[1.5rem]',
  lg: 'text-base px-2.5 py-1 min-w-[2rem]',
};

/**
 * RatingBadge — shows a tier letter (S/A/B/C/D) with color coding.
 * @param {string} tier  - 'S' | 'A' | 'B' | 'C' | 'D'
 * @param {string} [label] - Optional text appended after the tier.
 * @param {'sm'|'md'|'lg'} [size]
 */
export default function RatingBadge({ tier, label, size = 'md' }) {
  const tierUpper = (tier ?? 'C').toUpperCase();
  const styles = TIER_STYLES[tierUpper] ?? TIER_STYLES.C;
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-bold leading-none ${styles} ${sizeClass}`}
      title={`Tier ${tierUpper}`}
    >
      <span>{tierUpper}</span>
      {label && (
        <span className="font-normal opacity-80 text-[0.7em] uppercase tracking-wide">
          {label}
        </span>
      )}
    </span>
  );
}
