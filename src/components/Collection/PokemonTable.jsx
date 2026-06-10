import { useState, useMemo } from 'react';
import { Trash2, Edit2, ArrowRight } from 'lucide-react';
import { calculateIVPercentage, getIVStars } from '../../utils/ivCalculator.js';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

function getSpriteUrl(pokemonName, dexNr) {
  if (dexNr) return `${SPRITE_BASE}${dexNr}.png`;
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StarIcons({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < count ? 'text-yellow-400' : 'text-[#30363D]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ivColor(pct) {
  if (pct >= 98) return 'text-yellow-400';
  if (pct >= 82) return 'text-green-400';
  if (pct >= 66) return 'text-blue-400';
  return 'text-[#8B949E]';
}

const SORT_FIELDS = ['name', 'cp', 'ivPct', 'date'];

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-[#30363D] ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

/**
 * PokemonTable — sortable, filterable table of caught Pokemon.
 *
 * Each row object expected shape:
 * { pokemonName, dexNr?, cp, ivAttack, ivDefense, ivStamina,
 *   isShiny, isShadow, nickname, caughtDate, _id }
 *
 * @param {Array}    pokemon   - Array of caught pokemon objects
 * @param {Function} onEdit    - (pokemon) => void
 * @param {Function} onDelete  - (id) => void
 * @param {Function} onSelect  - (pokemon) => void  (for compare)
 */
export default function PokemonTable({ collection = [], onEdit, onDelete, onSelect }) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('cp');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const rows = useMemo(() => {
    let data = collection.map((p) => ({
      ...p,
      ivPct: calculateIVPercentage(p.ivAttack, p.ivDefense, p.ivStamina),
      stars: getIVStars(p.ivAttack, p.ivDefense, p.ivStamina),
    }));

    if (filter.trim()) {
      const q = filter.toLowerCase()
      data = data.filter(
        (p) =>
          (p.pokemonName ?? '').toLowerCase().includes(q) ||
          (p.nickname ?? '').toLowerCase().includes(q),
      )
    }

    data.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'cp':     av = a.cp ?? 0;     bv = b.cp ?? 0; break;
        case 'ivPct':  av = a.ivPct ?? 0;  bv = b.ivPct ?? 0; break;
        case 'date':   av = new Date(a.caughtDate ?? 0); bv = new Date(b.caughtDate ?? 0); break;
        case 'name':
        default:
          av = (a.nickname ?? a.pokemonName ?? '').toLowerCase();
          bv = (b.nickname ?? b.pokemonName ?? '').toLowerCase();
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [pokemon, filter, sortField, sortDir]);

  const thClass = 'text-left text-xs font-semibold text-[#8B949E] uppercase tracking-wide px-3 py-2 whitespace-nowrap select-none';
  const thClickable = `${thClass} cursor-pointer hover:text-[#C9D1D9] transition-colors`;

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by name or nickname…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:border-blue-500 transition-colors"
        />
        <span className="text-[#8B949E] text-xs whitespace-nowrap">
          {rows.length} / {pokemon.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#30363D]">
        <table className="w-full min-w-[700px] border-collapse">
          <thead className="bg-[#161B22] sticky top-0 z-10">
            <tr className="border-b border-[#30363D]">
              <th className={thClass}>Sprite</th>
              <th
                className={thClickable}
                onClick={() => handleSort('name')}
              >
                Name <SortIcon active={sortField === 'name'} dir={sortDir} />
              </th>
              <th
                className={thClickable}
                onClick={() => handleSort('cp')}
              >
                CP <SortIcon active={sortField === 'cp'} dir={sortDir} />
              </th>
              <th className={thClass}>IVs (A/D/S)</th>
              <th
                className={thClickable}
                onClick={() => handleSort('ivPct')}
              >
                IV% <SortIcon active={sortField === 'ivPct'} dir={sortDir} />
              </th>
              <th className={thClass}>Stars</th>
              <th className={thClass}>Tags</th>
              <th
                className={thClickable}
                onClick={() => handleSort('date')}
              >
                Date <SortIcon active={sortField === 'date'} dir={sortDir} />
              </th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-[#8B949E] py-10 text-sm italic">
                  {filter ? 'No Pokemon match your filter.' : 'No Pokemon in collection yet.'}
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const displayName = p.nickname || p.pokemonName || 'Unknown';
              const pct = p.ivPct;
              const pctColorClass = ivColor(pct);
              const spriteUrl = getSpriteUrl(p.pokemonName, p.dexNr);

              return (
                <tr
                  key={p._id}
                  className="border-b border-[#30363D]/50 hover:bg-[#21262D] transition-colors group"
                >
                  {/* Sprite */}
                  <td className="px-3 py-2 w-12">
                    {spriteUrl ? (
                      <img
                        src={spriteUrl}
                        alt={displayName}
                        className="w-10 h-10 object-contain pixelated"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#21262D] flex items-center justify-center text-lg">?</div>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2">
                    <p className="text-[#C9D1D9] text-sm font-medium">{displayName}</p>
                    {p.nickname && p.pokemonName && (
                      <p className="text-[#8B949E] text-xs">{p.pokemonName}</p>
                    )}
                  </td>

                  {/* CP */}
                  <td className="px-3 py-2 font-mono text-[#C9D1D9] text-sm font-semibold">
                    {p.cp?.toLocaleString() ?? '—'}
                  </td>

                  {/* IVs */}
                  <td className="px-3 py-2 font-mono text-xs">
                    <span className="text-red-400">{p.ivAttack ?? '?'}</span>
                    <span className="text-[#8B949E]">/</span>
                    <span className="text-blue-400">{p.ivDefense ?? '?'}</span>
                    <span className="text-[#8B949E]">/</span>
                    <span className="text-green-400">{p.ivStamina ?? '?'}</span>
                  </td>

                  {/* IV% */}
                  <td className={`px-3 py-2 font-mono text-sm font-bold ${pctColorClass}`}>
                    {pct != null ? `${pct.toFixed(1)}%` : '—'}
                  </td>

                  {/* Stars */}
                  <td className="px-3 py-2">
                    <StarIcons count={p.stars} />
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {p.isShiny && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                          ✨ Shiny
                        </span>
                      )}
                      {p.isShadow && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/40">
                          Shadow
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2 text-[#8B949E] text-xs whitespace-nowrap">
                    {formatDate(p.caughtDate)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {onSelect && (
                        <button
                          onClick={() => onSelect(p)}
                          title="Add to Compare"
                          className="p-1.5 rounded hover:bg-blue-500/20 text-[#8B949E] hover:text-blue-400 transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(p)}
                          title="Edit"
                          className="p-1.5 rounded hover:bg-[#30363D] text-[#484F58] hover:text-[#C9D1D9] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(p)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-red-500/20 text-[#484F58] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
