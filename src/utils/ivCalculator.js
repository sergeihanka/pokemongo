import { CP_MULTIPLIERS, getCPM } from '../constants/cpMultipliers.js';

/**
 * Pokemon GO CP Formula:
 * CP = floor( (BaseAtk + IVAtk) * sqrt(BaseDef + IVDef) * sqrt(BaseStam + IVStam) * CPM^2 / 10 )
 * minimum CP is 10
 */
export function calculateCP(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, level = 40) {
  const cpm = getCPM(level);
  const cp = Math.floor(
    (baseAtk + ivAtk) * Math.sqrt(baseDef + ivDef) * Math.sqrt(baseStam + ivStam) * cpm * cpm / 10
  );
  return Math.max(10, cp);
}

/**
 * Max CP at level 40 (standard) and level 50 (XL)
 */
export function calculateMaxCP(baseAtk, baseDef, baseStam) {
  return {
    level40: calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, 40),
    level50: calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, 50),
  };
}

/**
 * IV percentage: (sum of IVs) / 45 * 100
 */
export function calculateIVPercentage(ivAtk, ivDef, ivStam) {
  return Math.round(((ivAtk + ivDef + ivStam) / 45) * 100 * 10) / 10;
}

/**
 * IV star rating (in-game appraisal system)
 * 4 stars = 100% (15/15/15 only)
 * 3 stars = 82.2%+ (at least 37/45)
 * 2 stars = 66.7%+ (at least 30/45)
 * 1 star = 51.1%+ (at least 23/45)
 * 0 stars = below 51.1%
 */
export function getIVStars(ivAtk, ivDef, ivStam) {
  const sum = ivAtk + ivDef + ivStam;
  if (sum === 45) return 4;
  if (sum >= 37) return 3;
  if (sum >= 30) return 2;
  if (sum >= 23) return 1;
  return 0;
}

/**
 * Calculate the effective attack stat (used for damage calculation)
 */
export function effectiveAttack(baseAtk, ivAtk, level = 40) {
  return (baseAtk + ivAtk) * getCPM(level);
}

/**
 * Calculate the effective defense stat
 */
export function effectiveDefense(baseDef, ivDef, level = 40) {
  return (baseDef + ivDef) * getCPM(level);
}

/**
 * Calculate the effective stamina (max HP)
 */
export function effectiveStamina(baseStam, ivStam, level = 40) {
  return Math.floor((baseStam + ivStam) * getCPM(level));
}

/**
 * Calculate TDO (Total Damage Output) approximation for gym attacker
 * Higher = better attacker
 */
export function calculateAttackerTDO(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, level = 40) {
  const atk = effectiveAttack(baseAtk, ivAtk, level);
  const def = effectiveDefense(baseDef, ivDef, level);
  const hp = effectiveStamina(baseStam, ivStam, level);
  return atk * Math.sqrt(hp) * 1.5; // simplified TDO
}

/**
 * Calculate bulk for gym defender
 * Higher = better defender
 */
export function calculateDefenderBulk(baseDef, baseStam, ivDef, ivStam, level = 40) {
  const def = effectiveDefense(baseDef, ivDef, level);
  const hp = effectiveStamina(baseStam, ivStam, level);
  return def * hp;
}

/**
 * Find the optimal level to reach a CP cap (for PVP leagues)
 * Returns the level that maximizes stat product without exceeding the CP cap
 */
export function findOptimalLevelForCap(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, cpCap) {
  const levels = Object.keys(CP_MULTIPLIERS).map(Number).sort((a, b) => a - b);
  let bestLevel = 1;
  let bestCP = 0;
  let bestStatProduct = 0;

  for (const level of levels) {
    const cp = calculateCP(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, level);
    if (cp > cpCap) break;

    const sp = calculateStatProduct(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, level);
    if (cp <= cpCap && sp > bestStatProduct) {
      bestStatProduct = sp;
      bestLevel = level;
      bestCP = cp;
    }
  }

  return { level: bestLevel, cp: bestCP, statProduct: bestStatProduct };
}

/**
 * Calculate stat product (used for PVP rating)
 * = effective_atk * effective_def * effective_hp
 */
export function calculateStatProduct(baseAtk, baseDef, baseStam, ivAtk, ivDef, ivStam, level = 40) {
  const atk = effectiveAttack(baseAtk, ivAtk, level);
  const def = effectiveDefense(baseDef, ivDef, level);
  const hp = effectiveStamina(baseStam, ivStam, level);
  return Math.round(atk * def * hp);
}

/**
 * Get the max stat product possible for a CP cap (checks IVs 0-15 all combinations)
 * This is expensive - use sparingly or cache results
 */
export function getMaxStatProductForCap(baseAtk, baseDef, baseStam, cpCap) {
  let maxSP = 0;
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let s = 0; s <= 15; s++) {
        const result = findOptimalLevelForCap(baseAtk, baseDef, baseStam, a, d, s, cpCap);
        if (result.statProduct > maxSP) maxSP = result.statProduct;
      }
    }
  }
  return maxSP;
}

/**
 * Format IV display string
 */
export function formatIVs(ivAtk, ivDef, ivStam) {
  return `${ivAtk}/${ivDef}/${ivStam}`;
}

/**
 * Get impact of each IV on the final CP
 * Returns percentage difference between 0 and 15 in each IV
 */
export function getIVImpact(baseAtk, baseDef, baseStam, level = 40) {
  const baseCP = calculateCP(baseAtk, baseDef, baseStam, 0, 0, 0, level);
  const maxCP = calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, level);

  const atkZero = calculateCP(baseAtk, baseDef, baseStam, 0, 15, 15, level);
  const atkMax = calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, level);
  const defZero = calculateCP(baseAtk, baseDef, baseStam, 15, 0, 15, level);
  const defMax = calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, level);
  const stamZero = calculateCP(baseAtk, baseDef, baseStam, 15, 15, 0, level);
  const stamMax = calculateCP(baseAtk, baseDef, baseStam, 15, 15, 15, level);

  return {
    attack: Math.round(((atkMax - atkZero) / atkMax) * 100 * 10) / 10,
    defense: Math.round(((defMax - defZero) / defMax) * 100 * 10) / 10,
    stamina: Math.round(((stamMax - stamZero) / stamMax) * 100 * 10) / 10,
    total: Math.round(((maxCP - baseCP) / maxCP) * 100 * 10) / 10,
  };
}
