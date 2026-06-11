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

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-[#30363D] ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function PokemonTable({ collection = [], pokedex = [], onEdit, onDelete, onSelect }) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('cp');
  const [sortDir, setSortDir] = useState('desc');
  const [dupesOnly, setDupesOnly] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Base stat lookup keyed by pokemonId (dexNr)
  const baseOf = useMemo(() => {
    const map = {};
    for (const p of pokedex) {
      if (p.dexNr) map[p.dexNr] = {
        atk: p.baseAttack ?? 0,
        def: p.baseDefense ?? 0,
        sta: p.baseStamina ?? 0,
      };
    }
    return map;
  }, [pokedex]);

  const rows = useMemo(() => {
    // Count occurrences of each species for duplicate detection
    const speciesCount = {};
    for (const p of collection) {
      speciesCount[p.pokemonId] = (speciesCount[p.pokemonId] || 0) + 1;
    }

    let data = collection.map((p) => {
      const base = baseOf[p.pokemonId] ?? { atk: 0, def: 0, sta: 0 };
      return {
        ...p,
        ivPct: calculateIVPercentage(p.ivAttack, p.ivDefense, p.ivStamina),
        stars: getIVStars(p.ivAttack, p.ivDefense, p.ivStamina),
        baseAtk: base.atk,
        baseDef: base.def,
        baseSta: base.sta,
        dupeCount: speciesCount[p.pokemonId] || 1,
      };
    });

    if (filter.trim()) {
      const q = filter.toLowerCase();
      data = data.filter(
        (p) =>
          (p.pokemonName ?? '').toLowerCase().includes(q) ||
          (p.nickname ?? '').toLowerCase().includes(q),
      );
    }

    if (dupesOnly) {
      data = data.filter((p) => p.dupeCount > 1);
    }

    data.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'cp':      av = a.cp ?? 0;      bv = b.cp ?? 0;      break;
        case 'ivPct':   av = a.ivPct ?? 0;   bv = b.ivPct ?? 0;   break;
        case 'date':    av = new Date(a.caughtDate ?? 0); bv = new Date(b.caughtDate ?? 0); break;
        case 'baseAtk': av = a.baseAtk;      bv = b.baseAtk;      break;
        case 'baseDef': av = a.baseDef;      bv = b.baseDef;      break;
        case 'baseSta': av = a.baseSta;      bv = b.baseSta;      break;
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
  }, [collection, filter, sortField, sortDir, dupesOnly, baseOf]);

  const dupeTotal = useMemo(
    () => collection.filter((p, i, arr) => arr.findIndex(x => x.pokemonId === p.pokemonId) !== i).length,
    [collection],
  );

  const thClass = 'text-left text-xs font-semibold text-[#8B949E] uppercase tracking-wide px-3 py-2 whitespace-nowrap select-none';
  const thClickable = `${thClass} cursor-pointer hover:text-[#C9D1D9] transition-colors`;

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Filter by name or nickname…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-0 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={() => setDupesOnly((v) => !v)}
          title="Show duplicates only"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap
            ${dupesOnly
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
              : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#C9D1D9] hover:border-[#8B949E]'}`}
        >
          Dupes
          {dupeTotal > 0 && (
            <span className={`px-1 rounded text-[10px] font-bold ${dupesOnly ? 'bg-orange-500/30 text-orange-300' : 'bg-[#30363D] text-[#8B949E]'}`}>
              {dupeTotal}
            </span>
          )}
        </button>
        <span className="text-[#8B949E] text-xs whitespace-nowrap">
          {rows.length} / {collection.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#30363D]">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="bg-[#161B22] sticky top-0 z-10">
            <tr className="border-b border-[#30363D]">
              <th className={thClass}>Sprite</th>
              <th className={thClickable} onClick={() => handleSort('name')}>
                Name <SortIcon active={sortField === 'name'} dir={sortDir} />
              </th>
              <th className={thClickable} onClick={() => handleSort('cp')}>
                CP <SortIcon active={sortField === 'cp'} dir={sortDir} />
              </th>
              <th className={thClass}>IVs (A/D/S)</th>
              {/* Base stats column — three mini sort buttons */}
              <th className={thClass}>
                <span className="block text-[11px] leading-none mb-1">Base</span>
                <div className="flex gap-1">
                  {[['baseAtk', 'A'], ['baseDef', 'D'], ['baseSta', 'S']].map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => handleSort(f)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors
                        ${sortField === f
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'text-[#484F58] hover:text-[#8B949E]'}`}
                    >
                      {label}{sortField === f ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  ))}
                </div>
              </th>
              <th className={thClickable} onClick={() => handleSort('ivPct')}>
                IV% <SortIcon active={sortField === 'ivPct'} dir={sortDir} />
              </th>
              <th className={thClass}>Stars</th>
              <th className={thClass}>Tags</th>
              <th className={thClickable} onClick={() => handleSort('date')}>
                Date <SortIcon active={sortField === 'date'} dir={sortDir} />
              </th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-[#8B949E] py-10 text-sm italic">
                  {dupesOnly ? 'No duplicates in your collection.' : filter ? 'No Pokemon match your filter.' : 'No Pokemon in collection yet.'}
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const displayName = p.nickname || p.pokemonName || 'Unknown';
              const pct = p.ivPct;
              const pctColorClass = ivColor(pct);
              const spriteUrl = getSpriteUrl(p.pokemonName, p.pokemonId);
              const isDupe = p.dupeCount > 1;

              return (
                <tr
                  key={p._id}
                  onClick={() => onSelect?.(p, rows)}
                  className={`border-b border-[#30363D]/50 hover:bg-[#21262D] transition-colors
                    ${isDupe ? 'border-l-2 border-l-orange-500/40' : ''}
                    ${onSelect ? 'cursor-pointer' : ''}`}
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

                  {/* Base Stats */}
                  <td className="px-3 py-2 font-mono text-xs">
                    {p.baseAtk ? (
                      <>
                        <span className={`${sortField === 'baseAtk' ? 'text-red-300 font-bold' : 'text-red-400/70'}`}>{p.baseAtk}</span>
                        <span className="text-[#30363D]">/</span>
                        <span className={`${sortField === 'baseDef' ? 'text-blue-300 font-bold' : 'text-blue-400/70'}`}>{p.baseDef}</span>
                        <span className="text-[#30363D]">/</span>
                        <span className={`${sortField === 'baseSta' ? 'text-green-300 font-bold' : 'text-green-400/70'}`}>{p.baseSta}</span>
                      </>
                    ) : (
                      <span className="text-[#484F58]">—</span>
                    )}
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
                      {isDupe && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                          ×{p.dupeCount}
                        </span>
                      )}
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
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {onSelect && (
                        <button
                          onClick={() => onSelect(p, rows)}
                          title="View Stats"
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
