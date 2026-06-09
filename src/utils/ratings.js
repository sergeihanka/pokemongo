import {
  getTierForRole,
  getPVPTierForLeague,
  isLegendaryOrMythical,
  GYM_ATTACKER_TIERS,
  GYM_DEFENDER_TIERS,
} from '../constants/metaTiers.js';
import {
  calculateIVPercentage,
  getIVStars,
  calculateMaxCP,
  calculateStatProduct,
  findOptimalLevelForCap,
} from './ivCalculator.js';

export const TIER_ORDER = { S: 4, A: 3, B: 2, C: 1, D: 0 };
export const TIER_COLORS = {
  S: 'text-yellow-400',
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-gray-400',
  D: 'text-red-400',
  null: 'text-gray-500',
};

export function getGymAttackerRating(pokemonName, baseAtk, ivAtk = 15) {
  const tier = getTierForRole(pokemonName, 'attacker');
  // High base attack amplifies IV value
  const attackStat = baseAtk + ivAtk;
  let score = 0;
  if (attackStat >= 300) score = 5;
  else if (attackStat >= 270) score = 4;
  else if (attackStat >= 240) score = 3;
  else if (attackStat >= 200) score = 2;
  else score = 1;

  return {
    tier,
    score,
    label: tier === 'S' ? 'Elite Attacker' :
           tier === 'A' ? 'Great Attacker' :
           tier === 'B' ? 'Good Attacker' :
           tier === 'C' ? 'Average Attacker' : 'Weak Attacker',
  };
}

export function getGymDefenderRating(pokemonName, baseDef, baseStam, ivDef = 15, ivStam = 15) {
  const tier = getTierForRole(pokemonName, 'defender');
  // Defense × Stamina approximates bulk
  const bulk = (baseDef + ivDef) * (baseStam + ivStam);
  let score = 0;
  if (bulk >= 50000) score = 5;
  else if (bulk >= 35000) score = 4;
  else if (bulk >= 25000) score = 3;
  else if (bulk >= 15000) score = 2;
  else score = 1;

  return {
    tier,
    score,
    label: tier === 'S' ? 'Elite Defender' :
           tier === 'A' ? 'Great Defender' :
           tier === 'B' ? 'Good Defender' :
           tier === 'C' ? 'Average Defender' : 'Weak Defender',
  };
}

export function getPVPRatings(pokemonName, baseAtk, baseDef, baseStam, ivAtk = 0, ivDef = 15, ivStam = 15) {
  const gl = getPVPTierForLeague(pokemonName, 'great_league');
  const ul = getPVPTierForLeague(pokemonName, 'ultra_league');
  const ml = getPVPTierForLeague(pokemonName, 'master_league');

  // Calculate stat products for each league
  const glResult = findOptimalLevelForCap(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, 1500);
  const ulResult = findOptimalLevelForCap(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, 2500);
  const mlSP = calculateStatProduct(baseAtk, baseDef, baseStam, 15, 15, 15, 40);

  return {
    greatLeague: { tier: gl, cp: glResult.cp, level: glResult.level, statProduct: glResult.statProduct },
    ultraLeague: { tier: ul, cp: ulResult.cp, level: ulResult.level, statProduct: ulResult.statProduct },
    masterLeague: { tier: ml, cp: calculateMaxCP(baseAtk, baseDef, baseStam).level40, statProduct: mlSP },
  };
}

export function getInvestRecommendation(pokemonName, ivAtk, ivDef, ivStam, baseAtk, baseDef, baseStam) {
  const ivPct = calculateIVPercentage(ivAtk, ivDef, ivStam);
  const stars = getIVStars(ivAtk, ivDef, ivStam);
  const attackerTier = getTierForRole(pokemonName, 'attacker');
  const defenderTier = getTierForRole(pokemonName, 'defender');
  const pvpGL = getPVPTierForLeague(pokemonName, 'great_league');
  const pvpUL = getPVPTierForLeague(pokemonName, 'ultra_league');
  const pvpML = getPVPTierForLeague(pokemonName, 'master_league');
  const isLeg = isLegendaryOrMythical(pokemonName);

  const topAttacker = attackerTier === 'S' || attackerTier === 'A';
  const topDefender = defenderTier === 'S' || defenderTier === 'A';
  const topPVP = pvpGL === 'S' || pvpGL === 'A' || pvpUL === 'S' || pvpUL === 'A' || pvpML === 'S' || pvpML === 'A';

  let verdict, reason, color;

  if (ivPct === 100) {
    verdict = 'INVEST';
    reason = 'Perfect IVs! Always power up.';
    color = 'text-yellow-400';
  } else if (isLeg && ivPct >= 80) {
    verdict = 'INVEST';
    reason = 'Legendary/Mythical with solid IVs — worth powering up.';
    color = 'text-green-400';
  } else if (isLeg && ivPct >= 60) {
    verdict = 'HOLD';
    reason = 'Legendary with okay IVs. Hold until you find better or need it now.';
    color = 'text-yellow-400';
  } else if (isLeg) {
    verdict = 'HOLD';
    reason = 'Legendary — never dump, even with low IVs.';
    color = 'text-yellow-400';
  } else if (topAttacker && ivPct >= 93) {
    verdict = 'INVEST';
    reason = 'Top-tier attacker with excellent IVs. Power up immediately.';
    color = 'text-green-400';
  } else if (topAttacker && ivPct >= 82) {
    verdict = 'INVEST';
    reason = 'Top-tier attacker with great IVs. Worth the dust.';
    color = 'text-green-400';
  } else if (topAttacker && ivPct >= 66) {
    verdict = 'HOLD';
    reason = 'Good attacker but IVs could be better. Hold for now.';
    color = 'text-yellow-400';
  } else if (topDefender && ivPct >= 82) {
    verdict = 'INVEST';
    reason = 'Great gym defender with solid IVs. Good choice.';
    color = 'text-green-400';
  } else if (topPVP && ivPct <= 20) {
    verdict = 'HOLD';
    reason = 'Low-IV PVP Pokemon may perform better in certain leagues. Check the IV calculator.';
    color = 'text-yellow-400';
  } else if (topPVP && ivPct >= 50) {
    verdict = 'HOLD';
    reason = 'PVP Pokemon — IVs matter differently here. Evaluate per-league stat products.';
    color = 'text-yellow-400';
  } else if (ivPct >= 93 && (topAttacker || topDefender)) {
    verdict = 'INVEST';
    reason = 'Excellent IVs on a useful Pokemon. Invest.';
    color = 'text-green-400';
  } else if (ivPct < 66 && !topAttacker && !topDefender && !topPVP && !isLeg) {
    verdict = 'DUMP';
    reason = 'Below-average IVs on a non-meta Pokemon. Transfer for candy.';
    color = 'text-red-400';
  } else {
    verdict = 'HOLD';
    reason = 'Average Pokemon with okay IVs. Hold unless storage is tight.';
    color = 'text-yellow-400';
  }

  return {
    verdict,
    reason,
    color,
    ivPercentage: ivPct,
    stars,
    attackerTier,
    defenderTier,
    pvpGL,
    pvpUL,
    pvpML,
  };
}

export function getTierLabel(tier) {
  const labels = { S: 'S-Tier', A: 'A-Tier', B: 'B-Tier', C: 'C-Tier', D: 'D-Tier' };
  return labels[tier] || 'Unranked';
}
