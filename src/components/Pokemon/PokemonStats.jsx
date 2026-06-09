import StatBar from './StatBar.jsx';
import {
  calculateCP,
  calculateMaxCP,
  effectiveAttack,
  effectiveDefense,
  effectiveStamina,
  getIVImpact,
} from '../../utils/ivCalculator.js';

function SectionTitle({ children }) {
  return (
    <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-2 mt-4 first:mt-0">
      {children}
    </h4>
  );
}

function StatRow({ label, value, sub }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#30363D]/50 last:border-0">
      <span className="text-[#8B949E] text-xs">{label}</span>
      <div className="text-right">
        <span className="text-[#C9D1D9] text-sm font-mono font-semibold">{value}</span>
        {sub != null && (
          <span className="text-[#8B949E] text-xs ml-1">({sub})</span>
        )}
      </div>
    </div>
  );
}

/**
 * PokemonStats — detailed stats breakdown for a Pokemon at given IVs and level.
 *
 * @param {Object} pokemon  - Pokedex object
 * @param {number} ivAtk    - 0–15
 * @param {number} ivDef    - 0–15
 * @param {number} ivStam   - 0–15
 * @param {number} [level]  - Trainer level (default 40)
 */
export default function PokemonStats({ pokemon, ivAtk = 15, ivDef = 15, ivStam = 15, level = 40 }) {
  if (!pokemon) {
    return (
      <div className="text-[#8B949E] text-sm text-center py-8">
        No Pokemon selected.
      </div>
    );
  }

  const baseAtk = pokemon.baseAttack ?? pokemon.stats?.attack ?? 0;
  const baseDef = pokemon.baseDefense ?? pokemon.stats?.defense ?? 0;
  const baseSta = pokemon.baseStamina ?? pokemon.stats?.stamina ?? 0;

  // CPs
  const cpL20  = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 20);
  const cpL30  = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 30);
  const cpL40  = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 40);
  const cpL50  = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, 50);
  const cpCurrent = calculateCP(baseAtk, baseDef, baseSta, ivAtk, ivDef, ivStam, level);
  const maxCP = calculateMaxCP(baseAtk, baseDef, baseSta);

  // Effective stats at given level with given IVs
  const effAtk  = effectiveAttack(baseAtk, ivAtk, level);
  const effDef  = effectiveDefense(baseDef, ivDef, level);
  const effSta  = effectiveStamina(baseSta, ivStam, level);

  // IV impact
  const impact = getIVImpact(baseAtk, baseDef, baseSta, level);

  // Base stat maximum for the bar (use a generous cap)
  const maxBarVal = 400;

  return (
    <div className="space-y-1">
      {/* Base Stats */}
      <SectionTitle>Base Stats</SectionTitle>
      <div className="space-y-2">
        <StatBar label="Attack"  value={baseAtk}  max={maxBarVal} />
        <StatBar label="Defense" value={baseDef} max={maxBarVal} />
        <StatBar label="Stamina" value={baseSta} max={maxBarVal} />
      </div>

      {/* IV Adjusted */}
      <SectionTitle>IV-Adjusted Stats (Lv {level})</SectionTitle>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Attack',  base: baseAtk,  iv: ivAtk,  eff: effAtk,  color: 'text-red-400' },
          { label: 'Defense', base: baseDef, iv: ivDef,  eff: effDef,  color: 'text-blue-400' },
          { label: 'Stamina', base: baseSta, iv: ivStam, eff: effSta,  color: 'text-green-400' },
        ].map(({ label, base, iv, eff, color }) => (
          <div key={label} className="bg-[#21262D] rounded-lg p-2">
            <p className={`${color} text-xs font-semibold`}>{label}</p>
            <p className="text-[#C9D1D9] text-sm font-bold font-mono">{base + iv}</p>
            <p className="text-[#8B949E] text-[10px]">
              base {base} + <span className="text-yellow-400">{iv}</span>
            </p>
            <p className="text-[#8B949E] text-[10px] mt-0.5">
              Eff: <span className="text-[#C9D1D9] font-mono">{eff != null ? eff.toFixed(1) : '—'}</span>
            </p>
          </div>
        ))}
      </div>

      {/* CP at various levels */}
      <SectionTitle>CP Breakpoints</SectionTitle>
      <div className="space-y-0.5">
        {cpL20 != null && <StatRow label="CP @ L20"  value={cpL20.toLocaleString()} />}
        {cpL30 != null && <StatRow label="CP @ L30"  value={cpL30.toLocaleString()} />}
        {cpL40 != null && <StatRow label="CP @ L40 (current IVs)" value={cpL40.toLocaleString()} />}
        {cpL50 != null && <StatRow label="CP @ L50 (XL)" value={cpL50.toLocaleString()} />}
        {level !== 40 && level !== 50 && cpCurrent != null && (
          <StatRow label={`CP @ L${level} (selected)`} value={cpCurrent.toLocaleString()} />
        )}
      </div>

      {/* Max CP */}
      <SectionTitle>Max CP (IV 15/15/15)</SectionTitle>
      <div className="space-y-0.5">
        <StatRow label="Max CP @ L40" value={maxCP?.level40 != null ? maxCP.level40.toLocaleString() : '—'} />
        <StatRow label="Max CP @ L50" value={maxCP?.level50 != null ? maxCP.level50.toLocaleString() : '—'} />
      </div>

      {/* IV Impact */}
      {impact && (
        <>
          <SectionTitle>IV Impact on Stats</SectionTitle>
          <div className="space-y-0.5">
            {impact.attack != null && (
              <StatRow
                label="ATK IV contribution"
                value={`+${impact.attack.toFixed(1)}%`}
              />
            )}
            {impact.defense != null && (
              <StatRow
                label="DEF IV contribution"
                value={`+${impact.defense.toFixed(1)}%`}
              />
            )}
            {impact.stamina != null && (
              <StatRow
                label="STA IV contribution"
                value={`+${impact.stamina.toFixed(1)}%`}
              />
            )}
            {impact.total != null && (
              <StatRow
                label="Overall IV bonus"
                value={`+${impact.total.toFixed(1)}%`}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
