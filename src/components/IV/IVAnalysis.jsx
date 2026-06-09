import RatingBadge from '../Pokemon/RatingBadge.jsx';
import {
  calculateCP,
  calculateIVPercentage,
  getIVStars,
  findOptimalLevelForCap,
} from '../../utils/ivCalculator.js';
import {
  getGymAttackerRating,
  getGymDefenderRating,
  getPVPRatings,
  getInvestRecommendation,
  TIER_COLORS,
  getTierLabel,
} from '../../utils/ratings.js';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DataRow({ label, value, valueClass = 'text-[#C9D1D9]' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#30363D]/40 last:border-0">
      <span className="text-[#8B949E] text-xs">{label}</span>
      <span className={`text-sm font-semibold font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function RatingRow({ label, rating }) {
  if (!rating) return null;
  const tierLabel = getTierLabel ? getTierLabel(rating.tier) : rating.tier;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#30363D]/40 last:border-0">
      <span className="text-[#8B949E] text-xs">{label}</span>
      <div className="flex items-center gap-2">
        {rating.score != null && (
          <span className="text-[#8B949E] text-xs font-mono">{rating.score.toFixed(0)}</span>
        )}
        <RatingBadge tier={rating.tier} size="sm" />
        {tierLabel && tierLabel !== rating.tier && (
          <span className="text-[#8B949E] text-xs">{tierLabel}</span>
        )}
      </div>
    </div>
  );
}

const INVEST_STYLES = {
  INVEST: 'bg-green-500/10 border-green-500/40 text-green-400',
  HOLD:   'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
  DUMP:   'bg-red-500/10 border-red-500/40 text-red-400',
};

/**
 * IVAnalysis — full analysis panel for a Pokemon at given IVs.
 *
 * @param {Object}   pokemon
 * @param {number}   ivAtk
 * @param {number}   ivDef
 * @param {number}   ivStam
 * @param {boolean}  [shinyPokemon]  Whether this species can be shiny
 */
export default function IVAnalysis({
  pokemon,
  ivAtk = 15,
  ivDef = 15,
  ivStam = 15,
  shinyPokemon = false,
}) {
  if (!pokemon) {
    return (
      <div className="text-[#8B949E] text-sm text-center py-8 italic">
        Select a Pokemon to see analysis.
      </div>
    );
  }

  // Extract flat stat aliases (added by api.js normalization)
  const baseAtk = pokemon.baseAttack ?? pokemon.stats?.attack ?? 0;
  const baseDef = pokemon.baseDefense ?? pokemon.stats?.defense ?? 0;
  const baseSta = pokemon.baseStamina ?? pokemon.stats?.stamina ?? 0;
  const pokeName = pokemon.names?.English ?? pokemon.name ?? '';

  const pct = calculateIVPercentage(ivAtk, ivDef, ivStam);
  const stars = getIVStars(ivAtk, ivDef, ivStam);

  const cpL50 = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 50);

  // PVP optimal levels
  const glOptimal = findOptimalLevelForCap(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 1500);
  const ulOptimal = findOptimalLevelForCap(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 2500);

  // Ratings — pass extracted stats, not the whole pokemon object
  const gymAtk = getGymAttackerRating(pokeName, baseAtk, ivAtk);
  const gymDef = getGymDefenderRating(pokeName, baseDef, baseSta, ivDef, ivStam);
  const pvp    = getPVPRatings(pokeName, baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam);
  const invest = getInvestRecommendation(pokeName, ivAtk, ivDef, ivStam, baseAtk, baseDef, baseSta);

  const investStyle = invest?.verdict ? INVEST_STYLES[invest.verdict] ?? '' : '';

  let pctColor = 'text-red-400';
  if (pct >= 98) pctColor = 'text-yellow-400';
  else if (pct >= 82) pctColor = 'text-green-400';
  else if (pct >= 66) pctColor = 'text-blue-400';

  return (
    <div className="space-y-5">
      {/* Overall IV Summary */}
      <Section title="IV Summary">
        <div className="flex items-center justify-between bg-[#21262D] rounded-xl px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-[#8B949E] text-xs">IV Score</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < stars ? 'text-yellow-400' : 'text-[#30363D]'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold font-mono ${pctColor}`}>
              {pct != null ? pct.toFixed(1) : '—'}
            </span>
            <span className="text-[#8B949E] text-lg">%</span>
            <p className="text-[#8B949E] text-xs">
              {ivAtk}/{ivDef}/{ivStam}
            </p>
          </div>
        </div>
        {shinyPokemon && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-yellow-400 text-sm">✨</span>
            <span className="text-yellow-400 text-xs font-medium">Shiny available</span>
          </div>
        )}
      </Section>

      {/* Gym Ratings */}
      <Section title="Gym Performance">
        <div className="bg-[#161B22] rounded-lg border border-[#30363D] px-3 py-1 divide-y divide-[#30363D]/40">
          <RatingRow label="Gym Attacker" rating={gymAtk} />
          <RatingRow label="Gym Defender" rating={gymDef} />
        </div>
      </Section>

      {/* PVP Ratings */}
      <Section title="PVP Performance">
        <div className="space-y-2">
          {/* Great League */}
          <div className="bg-[#161B22] rounded-lg border border-[#30363D] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#C9D1D9] text-xs font-semibold">Great League (1500 CP)</span>
              {pvp?.greatLeague && <RatingBadge tier={pvp.greatLeague.tier} size="sm" />}
            </div>
            {glOptimal && (
              <div className="flex gap-3 text-xs">
                <span className="text-[#8B949E]">
                  Optimal Level: <span className="text-[#C9D1D9] font-mono">{glOptimal.level}</span>
                </span>
                <span className="text-[#8B949E]">
                  CP: <span className="text-[#C9D1D9] font-mono">{glOptimal.cp?.toLocaleString()}</span>
                </span>
                {glOptimal.statProduct != null && (
                  <span className="text-[#8B949E]">
                    Stat Prod: <span className="text-[#C9D1D9] font-mono">{glOptimal.statProduct?.toFixed(0)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Ultra League */}
          <div className="bg-[#161B22] rounded-lg border border-[#30363D] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#C9D1D9] text-xs font-semibold">Ultra League (2500 CP)</span>
              {pvp?.ultraLeague && <RatingBadge tier={pvp.ultraLeague.tier} size="sm" />}
            </div>
            {ulOptimal && (
              <div className="flex gap-3 text-xs">
                <span className="text-[#8B949E]">
                  Optimal Level: <span className="text-[#C9D1D9] font-mono">{ulOptimal.level}</span>
                </span>
                <span className="text-[#8B949E]">
                  CP: <span className="text-[#C9D1D9] font-mono">{ulOptimal.cp?.toLocaleString()}</span>
                </span>
                {ulOptimal.statProduct != null && (
                  <span className="text-[#8B949E]">
                    Stat Prod: <span className="text-[#C9D1D9] font-mono">{ulOptimal.statProduct?.toFixed(0)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Master League */}
          <div className="bg-[#161B22] rounded-lg border border-[#30363D] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#C9D1D9] text-xs font-semibold">Master League (no cap)</span>
              {pvp?.masterLeague && <RatingBadge tier={pvp.masterLeague.tier} size="sm" />}
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-[#8B949E]">
                Best at L50 CP: <span className="text-[#C9D1D9] font-mono">{cpL50 != null ? cpL50.toLocaleString() : '—'}</span>
              </span>
              {pvp?.masterLeague?.statProduct != null && (
                <span className="text-[#8B949E]">
                  Stat Prod: <span className="text-[#C9D1D9] font-mono">{pvp.masterLeague.statProduct?.toFixed(0)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Invest Recommendation */}
      {invest && (
        <Section title="Recommendation">
          <div className={`rounded-xl border p-4 ${investStyle}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-black tracking-wide">
                {invest.verdict}
              </span>
            </div>
            {invest.reason && (
              <p className="text-xs opacity-80 leading-relaxed">{invest.reason}</p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
