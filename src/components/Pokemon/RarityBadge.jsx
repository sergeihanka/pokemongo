import { RARITY_TIERS } from '../../constants/rarityData.js';

export default function RarityBadge({ rarity, size = 'sm' }) {
  if (!rarity) return null;
  const tier = RARITY_TIERS[rarity];
  if (!tier) return null;

  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${textSize} font-semibold leading-none ${tier.color} ${tier.bg}`}>
      {tier.label}
    </span>
  );
}
