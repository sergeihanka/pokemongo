import { getTypeColor, normalizeTypeName } from '../../constants/typeColors.js';

/**
 * TypeBadge — small colored pill showing a Pokemon type.
 * @param {string} type  - Type name (e.g. 'Fire') or raw API string.
 * @param {'sm'|'md'}  size
 */
export default function TypeBadge({ type, size = 'md' }) {
  const normalized = normalizeTypeName(type);
  const { bg, text } = getTypeColor(normalized);

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-0.5 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none ${bg} ${text} ${sizeClasses}`}
      title={normalized}
    >
      {normalized}
    </span>
  );
}
