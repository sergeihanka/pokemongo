import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import TypeBadge from '../Pokemon/TypeBadge.jsx';
import RatingBadge from '../Pokemon/RatingBadge.jsx';
import IVInput from '../IV/IVInput.jsx';
import { normalizeTypeName } from '../../constants/typeColors.js';
import {
  calculateMaxCP,
  effectiveAttack,
  effectiveDefense,
  effectiveStamina,
  calculateCP,
} from '../../utils/ivCalculator.js';
import {
  getGymAttackerRating,
  getGymDefenderRating,
  getPVPRatings,
} from '../../utils/ratings.js';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

function getSpriteUrl(dexNr) {
  return dexNr ? `${SPRITE_BASE}${dexNr}.png` : null;
}

/** Returns index of the max value in array. Handles ties (all get highlighted). */
function bestIndices(values) {
  const nums = values.map((v) => (v != null ? Number(v) : -Infinity));
  const max = Math.max(...nums);
  if (!isFinite(max)) return [];
  return nums.map((v, i) => (v === max ? i : -1)).filter((i) => i !== -1);
}

function CellValue({ value, isBest, unit = '' }) {
  if (value == null) return <span className="text-[#8B949E]">—</span>;
  return (
    <span className={`font-mono font-semibold text-sm ${isBest ? 'text-green-400' : 'text-[#C9D1D9]'}`}>
      {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
      {unit && <span className="text-[#8B949E] text-xs ml-0.5">{unit}</span>}
    </span>
  );
}

function CompareRow({ label, values }) {
  const best = bestIndices(values);
  return (
    <tr className="border-b border-[#30363D]/40 hover:bg-[#21262D]/30 transition-colors">
      <td className="py-2 px-3 text-[#8B949E] text-xs font-medium whitespace-nowrap w-36">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2 px-3 text-center">
          <CellValue value={v} isBest={best.includes(i)} />
        </td>
      ))}
    </tr>
  );
}

function RatingRow({ label, ratings }) {
  const scores = ratings.map((r) => r?.score ?? null);
  const best = bestIndices(scores);
  return (
    <tr className="border-b border-[#30363D]/40 hover:bg-[#21262D]/30 transition-colors">
      <td className="py-2 px-3 text-[#8B949E] text-xs font-medium whitespace-nowrap w-36">{label}</td>
      {ratings.map((r, i) => (
        <td key={i} className="py-2 px-3 text-center">
          {r ? (
            <div className="flex flex-col items-center gap-0.5">
              <RatingBadge tier={r.tier} size="sm" />
              {r.score != null && (
                <span className={`text-[10px] font-mono ${best.includes(i) ? 'text-green-400' : 'text-[#8B949E]'}`}>
                  {r.score.toFixed(0)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#8B949E]">—</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function TierRow({ label, tiers }) {
  return (
    <tr className="border-b border-[#30363D]/40 hover:bg-[#21262D]/30 transition-colors">
      <td className="py-2 px-3 text-[#8B949E] text-xs font-medium whitespace-nowrap w-36">{label}</td>
      {tiers.map((t, i) => (
        <td key={i} className="py-2 px-3 text-center">
          {t ? <RatingBadge tier={t} size="sm" /> : <span className="text-[#8B949E]">—</span>}
        </td>
      ))}
    </tr>
  );
}

const MAX_SLOTS = 3;

function EmptySlot({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-[#30363D] rounded-xl min-h-[160px] hover:border-blue-500/50 transition-colors">
      <button
        onClick={onAdd}
        className="w-12 h-12 rounded-full bg-[#21262D] hover:bg-blue-600 flex items-center justify-center transition-colors group"
        title="Add Pokemon"
      >
        <Plus className="w-6 h-6 text-[#8B949E] group-hover:text-white" />
      </button>
      <span className="text-[#8B949E] text-xs text-center">Add Pokemon</span>
    </div>
  );
}

function SlotHeader({ slot, slotIndex, onRemove }) {
  const [imgErr, setImgErr] = useState(false);
  const { pokemon, ivAtk, ivDef, ivStam } = slot;
  const name = pokemon.names?.English ?? pokemon.name ?? 'Unknown';
  const spriteUrl = getSpriteUrl(pokemon.dexNr);
  const primaryType = pokemon.primaryType?.names?.English
    ? normalizeTypeName(pokemon.primaryType.names.English) : null;
  const secondaryType = pokemon.secondaryType?.names?.English
    ? normalizeTypeName(pokemon.secondaryType.names.English) : null;

  return (
    <div className="relative bg-[#161B22] rounded-xl border border-[#30363D] p-3 text-center">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-0.5 rounded hover:bg-red-500/20 text-[#8B949E] hover:text-red-400 transition-colors"
        title="Remove"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {spriteUrl && !imgErr ? (
        <img
          src={spriteUrl}
          alt={name}
          className="w-16 h-16 object-contain pixelated mx-auto"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#21262D] flex items-center justify-center text-2xl mx-auto">?</div>
      )}
      <p className="text-[#C9D1D9] text-sm font-semibold mt-1 truncate">{name}</p>
      <div className="flex justify-center gap-1 mt-1 flex-wrap">
        {primaryType && <TypeBadge type={primaryType} size="sm" />}
        {secondaryType && <TypeBadge type={secondaryType} size="sm" />}
      </div>
      <p className="text-[#8B949E] text-xs mt-1 font-mono">
        {ivAtk}/{ivDef}/{ivStam}
      </p>
    </div>
  );
}

/**
 * ComparePanel — side-by-side comparison of up to 3 Pokemon.
 *
 * @param {Array}    slots          - Array of { pokemon, ivAtk, ivDef, ivStam } or null
 * @param {Function} onAddSlot(i)
 * @param {Function} onRemoveSlot(i)
 * @param {Function} onChangeIV(i, field, value)
 */
export default function ComparePanel({ slots = [], onAddSlot, onRemoveSlot, onChangeIV }) {
  // Pad to MAX_SLOTS
  const paddedSlots = [
    ...slots,
    ...Array(Math.max(0, MAX_SLOTS - slots.length)).fill(null),
  ].slice(0, MAX_SLOTS);

  const filledSlots = paddedSlots.filter(Boolean);

  // Pre-compute all derived values
  const derived = paddedSlots.map((slot) => {
    if (!slot?.pokemon) return null;
    const { pokemon, ivAtk = 15, ivDef = 15, ivStam = 15 } = slot;
    return {
      baseAtk:  pokemon.stats?.baseAttack  ?? 0,
      baseDef:  pokemon.stats?.baseDefense ?? 0,
      baseSta:  pokemon.stats?.baseStamina ?? 0,
      maxCPL40: calculateMaxCP(pokemon, 40),
      maxCPL50: calculateMaxCP(pokemon, 50),
      effAtk:   effectiveAttack(pokemon, ivAtk, 40),
      effDef:   effectiveDefense(pokemon, ivDef, 40),
      effHp:    effectiveStamina(pokemon, ivStam, 40),
      cpL40:    calculateCP(pokemon, ivAtk, ivDef, ivStam, 40),
      gymAtk:   getGymAttackerRating ? getGymAttackerRating(pokemon, ivAtk, ivDef, ivStam) : null,
      gymDef:   getGymDefenderRating ? getGymDefenderRating(pokemon, ivAtk, ivDef, ivStam) : null,
      pvp:      getPVPRatings        ? getPVPRatings(pokemon, ivAtk, ivDef, ivStam)         : null,
    };
  });

  const get = (arr, key) => arr.map((d) => (d ? d[key] : null));

  const [showIVPanels, setShowIVPanels] = useState(true);

  return (
    <div className="space-y-6">
      {/* Column headers */}
      <div className="grid grid-cols-[9rem_1fr_1fr_1fr] gap-3 items-start">
        <div /> {/* row label spacer */}
        {paddedSlots.map((slot, i) =>
          slot ? (
            <SlotHeader
              key={i}
              slot={slot}
              slotIndex={i}
              onRemove={() => onRemoveSlot?.(i)}
            />
          ) : (
            <EmptySlot key={i} onAdd={() => onAddSlot?.(i)} />
          ),
        )}
      </div>

      {/* IV Inputs */}
      {filledSlots.length > 0 && (
        <div>
          <button
            onClick={() => setShowIVPanels((v) => !v)}
            className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-[#C9D1D9] transition-colors"
          >
            IV Inputs {showIVPanels ? '▲' : '▼'}
          </button>

          {showIVPanels && (
            <div className="grid grid-cols-[9rem_1fr_1fr_1fr] gap-3 items-start">
              <div />
              {paddedSlots.map((slot, i) =>
                slot ? (
                  <div key={i} className="bg-[#161B22] rounded-xl border border-[#30363D] p-3">
                    <IVInput
                      ivAtk={slot.ivAtk ?? 15}
                      ivDef={slot.ivDef ?? 15}
                      ivStam={slot.ivStam ?? 15}
                      onChange={(field, value) => onChangeIV?.(i, field, value)}
                    />
                  </div>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats comparison table */}
      {filledSlots.length > 0 && (
        <div className="bg-[#161B22] rounded-xl border border-[#30363D] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#30363D] bg-[#21262D]">
                <th className="py-2 px-3 text-left text-[#8B949E] text-xs font-semibold uppercase tracking-wide w-36">
                  Stat
                </th>
                {paddedSlots.map((slot, i) => (
                  <th key={i} className="py-2 px-3 text-center text-[#8B949E] text-xs font-semibold uppercase tracking-wide">
                    {slot?.pokemon?.names?.English ?? `Slot ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Base Stats */}
              <tr className="bg-[#21262D]/40">
                <td colSpan={4} className="py-1 px-3 text-[#8B949E] text-[10px] font-semibold uppercase tracking-widest">
                  Base Stats
                </td>
              </tr>
              <CompareRow label="Base Attack"  values={get(derived, 'baseAtk')} />
              <CompareRow label="Base Defense" values={get(derived, 'baseDef')} />
              <CompareRow label="Base Stamina" values={get(derived, 'baseSta')} />

              {/* Max CP */}
              <tr className="bg-[#21262D]/40">
                <td colSpan={4} className="py-1 px-3 text-[#8B949E] text-[10px] font-semibold uppercase tracking-widest">
                  Max CP
                </td>
              </tr>
              <CompareRow label="Max CP (L40)" values={get(derived, 'maxCPL40')} />
              <CompareRow label="Max CP (L50)" values={get(derived, 'maxCPL50')} />

              {/* With IVs @ L40 */}
              <tr className="bg-[#21262D]/40">
                <td colSpan={4} className="py-1 px-3 text-[#8B949E] text-[10px] font-semibold uppercase tracking-widest">
                  With IVs @ Level 40
                </td>
              </tr>
              <CompareRow label="CP (w/ IVs)"   values={get(derived, 'cpL40')} />
              <CompareRow label="Eff. Attack"   values={get(derived, 'effAtk').map(v => v != null ? parseFloat(v.toFixed(1)) : null)} />
              <CompareRow label="Eff. Defense"  values={get(derived, 'effDef').map(v => v != null ? parseFloat(v.toFixed(1)) : null)} />
              <CompareRow label="Eff. HP"       values={get(derived, 'effHp').map(v => v != null ? Math.floor(v) : null)} />

              {/* Gym ratings */}
              <tr className="bg-[#21262D]/40">
                <td colSpan={4} className="py-1 px-3 text-[#8B949E] text-[10px] font-semibold uppercase tracking-widest">
                  Gym Performance
                </td>
              </tr>
              <RatingRow label="Gym Attacker" ratings={get(derived, 'gymAtk')} />
              <RatingRow label="Gym Defender" ratings={get(derived, 'gymDef')} />

              {/* PVP ratings */}
              <tr className="bg-[#21262D]/40">
                <td colSpan={4} className="py-1 px-3 text-[#8B949E] text-[10px] font-semibold uppercase tracking-widest">
                  PVP Tiers
                </td>
              </tr>
              <TierRow
                label="Great League"
                tiers={derived.map((d) => d?.pvp?.greatLeague?.tier ?? null)}
              />
              <TierRow
                label="Ultra League"
                tiers={derived.map((d) => d?.pvp?.ultraLeague?.tier ?? null)}
              />
              <TierRow
                label="Master League"
                tiers={derived.map((d) => d?.pvp?.masterLeague?.tier ?? null)}
              />
            </tbody>
          </table>
        </div>
      )}

      {filledSlots.length === 0 && (
        <div className="text-center py-16 text-[#8B949E] text-sm italic">
          Add Pokemon to the slots above to start comparing.
        </div>
      )}
    </div>
  );
}
