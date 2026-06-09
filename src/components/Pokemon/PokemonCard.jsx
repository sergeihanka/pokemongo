import { useState } from 'react';
import TypeBadge from './TypeBadge.jsx';
import { normalizeTypeName } from '../../constants/typeColors.js';
import { calculateMaxCP } from '../../utils/ivCalculator.js';

function formatDexNr(nr) {
  return `#${String(nr).padStart(3, '0')}`;
}

function getSpriteUrl(dexNr) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNr}.png`;
}

/**
 * PokemonCard — displays a Pokemon in the browse grid or as a compact table row card.
 *
 * @param {Object}   pokemon     - Pokedex object
 * @param {Function} onClick
 * @param {boolean}  isSelected  - Highlight with blue border when true
 * @param {boolean}  compact     - Smaller layout for table rows
 */
export default function PokemonCard({ pokemon, onClick, isSelected = false, compact = false }) {
  const [imgError, setImgError] = useState(false);

  if (!pokemon) return null;

  const name = pokemon.names?.English ?? pokemon.name ?? 'Unknown';
  const primaryType = pokemon.primaryType?.names?.English
    ? normalizeTypeName(pokemon.primaryType.names.English)
    : null;
  const secondaryType = pokemon.secondaryType?.names?.English
    ? normalizeTypeName(pokemon.secondaryType.names.English)
    : null;

  const { baseAttack = 0, baseDefense = 0, baseStamina = 0 } = pokemon.stats ?? {};
  const maxCP = calculateMaxCP(pokemon, 40);

  const borderClass = isSelected
    ? 'border-blue-500 ring-1 ring-blue-500/50'
    : 'border-[#30363D] hover:border-[#8B949E]';

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 bg-[#161B22] border rounded-lg px-3 py-2 text-left transition-all ${borderClass}`}
      >
        {/* Sprite */}
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          {!imgError ? (
            <img
              src={getSpriteUrl(pokemon.dexNr)}
              alt={name}
              className="w-10 h-10 object-contain pixelated"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#21262D] flex items-center justify-center text-lg">
              ?
            </div>
          )}
        </div>

        {/* Name + Dex */}
        <div className="flex-1 min-w-0">
          <p className="text-[#C9D1D9] font-medium text-sm truncate">{name}</p>
          <p className="text-[#8B949E] text-xs">{formatDexNr(pokemon.dexNr)}</p>
        </div>

        {/* Types */}
        <div className="flex gap-1">
          {primaryType && <TypeBadge type={primaryType} size="sm" />}
          {secondaryType && <TypeBadge type={secondaryType} size="sm" />}
        </div>

        {/* Max CP */}
        <div className="text-right flex-shrink-0">
          <p className="text-[#C9D1D9] text-xs font-mono">{maxCP ? maxCP.toLocaleString() : '—'}</p>
          <p className="text-[#8B949E] text-[10px]">Max CP</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full bg-[#161B22] border rounded-xl p-4 text-left transition-all hover:bg-[#1C2128] cursor-pointer ${borderClass}`}
    >
      {/* Header: Dex number */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-[#8B949E] text-xs font-mono">{formatDexNr(pokemon.dexNr)}</span>
        {isSelected && (
          <span className="text-blue-400 text-xs font-semibold">Selected</span>
        )}
      </div>

      {/* Sprite */}
      <div className="flex justify-center mb-3">
        {!imgError ? (
          <img
            src={getSpriteUrl(pokemon.dexNr)}
            alt={name}
            className="w-20 h-20 object-contain pixelated drop-shadow-md"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#21262D] flex items-center justify-center text-3xl">
            ?
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-[#C9D1D9] font-semibold text-sm text-center mb-2 truncate">{name}</p>

      {/* Type badges */}
      <div className="flex justify-center gap-1 mb-3 flex-wrap">
        {primaryType && <TypeBadge type={primaryType} />}
        {secondaryType && <TypeBadge type={secondaryType} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 text-center border-t border-[#30363D] pt-3">
        <div>
          <p className="text-red-400 text-xs font-bold">{baseAttack}</p>
          <p className="text-[#8B949E] text-[10px]">ATK</p>
        </div>
        <div>
          <p className="text-blue-400 text-xs font-bold">{baseDefense}</p>
          <p className="text-[#8B949E] text-[10px]">DEF</p>
        </div>
        <div>
          <p className="text-green-400 text-xs font-bold">{baseStamina}</p>
          <p className="text-[#8B949E] text-[10px]">STA</p>
        </div>
      </div>

      {/* Max CP */}
      <div className="mt-2 text-center">
        <span className="text-[#8B949E] text-[10px]">Max CP (L40) </span>
        <span className="text-yellow-400 text-xs font-bold">
          {maxCP ? maxCP.toLocaleString() : '—'}
        </span>
      </div>
    </button>
  );
}
