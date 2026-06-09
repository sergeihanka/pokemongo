import { useState, useMemo } from 'react'
import { usePokedex } from '../hooks/usePokemon'
import { getTierForRole, getPVPTierForLeague } from '../constants/metaTiers.js'
import TypeBadge from '../components/Pokemon/TypeBadge.jsx'
import { normalizeTypeName } from '../constants/typeColors.js'

// ---- CPM helpers ------------------------------------------------------------

const CPM_TABLE = { 1: 0.094, 5: 0.295, 10: 0.4225, 15: 0.5173, 20: 0.5974, 25: 0.6679, 30: 0.7317, 35: 0.7739, 40: 0.7903, 45: 0.8403, 50: 0.8403 }

function getCPM(level) {
  if (CPM_TABLE[level]) return CPM_TABLE[level]
  const levels = Object.keys(CPM_TABLE).map(Number).sort((a, b) => a - b)
  let lo = levels[0], hi = levels[levels.length - 1]
  for (const l of levels) {
    if (l <= level) lo = l
    if (l >= level && hi === levels[levels.length - 1]) { hi = l; break }
  }
  const t = (level - lo) / (hi - lo)
  return CPM_TABLE[lo] + t * (CPM_TABLE[hi] - CPM_TABLE[lo])
}

function calcMaxCPAtLevel(baseAtk, baseDef, baseSta, level = 40) {
  const cpm = getCPM(level)
  return Math.max(10, Math.floor((baseAtk + 15) * Math.sqrt(baseDef + 15) * Math.sqrt(baseSta + 15) * cpm * cpm / 10))
}

// ---- Constants --------------------------------------------------------------

const CATEGORIES = [
  { id: 'gymAttacker', label: 'Gym Attacker', fn: (name) => getTierForRole(name, 'attacker') },
  { id: 'gymDefender', label: 'Gym Defender', fn: (name) => getTierForRole(name, 'defender') },
  { id: 'raidAttacker', label: 'Raid Attacker', fn: (name) => getTierForRole(name, 'attacker') },
  { id: 'pvpGreat', label: 'PVP: Great', fn: (name) => getPVPTierForLeague(name, 'great_league') },
  { id: 'pvpUltra', label: 'PVP: Ultra', fn: (name) => getPVPTierForLeague(name, 'ultra_league') },
  { id: 'pvpMaster', label: 'PVP: Master', fn: (name) => getPVPTierForLeague(name, 'master_league') },
]

const TIER_ORDER = { S: 5, A: 4, B: 3, C: 2, D: 1 }

const MAX_ROWS = 200

// ---- Sub-components ---------------------------------------------------------

function TierBadge({ tier }) {
  const styles = {
    S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    A: 'bg-green-500/20 text-green-400 border-green-500/40',
    B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    C: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    D: 'bg-red-500/20 text-red-400 border-red-500/40',
  }
  const s = styles[tier] ?? 'bg-gray-500/20 text-gray-500 border-gray-600/40'
  return (
    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${s}`}>
      {tier ?? '—'}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#30363D] animate-pulse">
      <td className="py-3 px-4"><div className="h-3 w-6 bg-[#21262D] rounded" /></td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#21262D] rounded" />
          <div className="h-3 w-24 bg-[#21262D] rounded" />
        </div>
      </td>
      <td className="py-3 px-4"><div className="h-5 w-16 bg-[#21262D] rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-5 w-8 bg-[#21262D] rounded mx-auto" /></td>
      <td className="py-3 px-4"><div className="h-3 w-8 bg-[#21262D] rounded mx-auto" /></td>
      <td className="py-3 px-4"><div className="h-3 w-8 bg-[#21262D] rounded mx-auto" /></td>
      <td className="py-3 px-4"><div className="h-3 w-8 bg-[#21262D] rounded mx-auto" /></td>
      <td className="py-3 px-4"><div className="h-3 w-12 bg-[#21262D] rounded mx-auto" /></td>
    </tr>
  )
}

// ---- Main component ---------------------------------------------------------

export default function TierRankingsPage() {
  const { data: pokedex = [], isLoading } = usePokedex()

  const [activeCategory, setActiveCategory] = useState('gymAttacker')
  const [level, setLevel] = useState(40)
  const [trainerLevel, setTrainerLevel] = useState(40)
  const [nameSearch, setNameSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all') // 'all' | 'SA'

  const maxPowerUpLevel = Math.min(trainerLevel + 10, 50)

  const results = useMemo(() => {
    const catFn = CATEGORIES.find(c => c.id === activeCategory)?.fn
    if (!catFn || !pokedex.length) return []

    return pokedex
      .map(p => {
        const name = p.names?.English ?? ''
        const tier = catFn(name)
        const baseAtk = p.baseAttack ?? p.stats?.attack ?? 0
        const baseDef = p.baseDefense ?? p.stats?.defense ?? 0
        const baseSta = p.baseStamina ?? p.stats?.stamina ?? 0
        return { ...p, tier, baseAtk, baseDef, baseSta, maxCP: calcMaxCPAtLevel(baseAtk, baseDef, baseSta, level) }
      })
      .filter(p => {
        if (tierFilter === 'SA' && !['S', 'A'].includes(p.tier)) return false
        if (nameSearch && !p.names?.English?.toLowerCase().includes(nameSearch.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const ta = TIER_ORDER[a.tier] ?? 0, tb = TIER_ORDER[b.tier] ?? 0
        if (ta !== tb) return tb - ta
        return b.maxCP - a.maxCP
      })
  }, [pokedex, activeCategory, level, nameSearch, tierFilter])

  const displayedRows = results.slice(0, MAX_ROWS)
  const hasMore = results.length > MAX_ROWS

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E6EDF3]">Tier Rankings</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">
          Browse Pokemon by competitive tier for gym, raid, and PVP roles.
        </p>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-1 p-1 bg-[#161B22] border border-[#30363D] rounded-xl w-fit">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Level */}
        <div>
          <label className="block text-xs text-[#8B949E] mb-1 font-medium">Level</label>
          <input
            type="number"
            min={1}
            max={50}
            value={level}
            onChange={e => setLevel(Math.min(50, Math.max(1, Number(e.target.value))))}
            className="w-20 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5
                       text-sm text-[#C9D1D9] focus:outline-none focus:border-[#58A6FF] transition"
          />
        </div>

        {/* Trainer Level */}
        <div>
          <label className="block text-xs text-[#8B949E] mb-1 font-medium">Trainer Lv</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={trainerLevel}
              onChange={e => setTrainerLevel(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="w-20 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5
                         text-sm text-[#C9D1D9] focus:outline-none focus:border-[#58A6FF] transition"
            />
            <span className="text-xs text-[#8B949E] bg-[#21262D] border border-[#30363D] rounded px-2 py-1.5 whitespace-nowrap">
              Max power-up: Lv {maxPowerUpLevel}
            </span>
          </div>
        </div>

        {/* Name search */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-[#8B949E] mb-1 font-medium">Search</label>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Filter by name..."
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5
                       text-sm text-[#C9D1D9] placeholder-[#484F58]
                       focus:outline-none focus:border-[#58A6FF] transition"
          />
        </div>

        {/* Tier filter */}
        <div>
          <label className="block text-xs text-[#8B949E] mb-1 font-medium">Tier Filter</label>
          <div className="flex rounded-lg border border-[#30363D] overflow-hidden">
            {[
              { value: 'all', label: 'All Tiers' },
              { value: 'SA', label: 'S & A only' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTierFilter(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  tierFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0D1117] text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-[#8B949E]">
          Showing <span className="text-[#C9D1D9] font-medium">{Math.min(results.length, MAX_ROWS)}</span> of{' '}
          <span className="text-[#C9D1D9] font-medium">{results.length}</span> Pokemon
          {hasMore && <span className="text-yellow-500/80"> (first {MAX_ROWS} shown)</span>}
        </p>
      )}

      {/* Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363D] bg-[#21262D]/50">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-[#8B949E] uppercase tracking-wider w-10">#</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-[#8B949E] uppercase tracking-wider">Pokemon</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-[#8B949E] uppercase tracking-wider">Type</th>
                <th className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider">Tier</th>
                <th className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider">Base ATK</th>
                <th className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider">Base DEF</th>
                <th className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider">Base STA</th>
                <th className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider">
                  Max CP (Lv {level})
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-[#484F58]">
                    No Pokemon found matching your filters.
                  </td>
                </tr>
              ) : (
                displayedRows.map((p, idx) => {
                  const primaryType = normalizeTypeName(p.primaryType?.names?.English)
                  const secondaryType = p.secondaryType?.names?.English
                    ? normalizeTypeName(p.secondaryType.names.English)
                    : null

                  return (
                    <tr
                      key={p.dexNr ?? idx}
                      className={`border-b border-[#30363D] hover:bg-[#21262D]/50 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-[#21262D]/20'
                      }`}
                    >
                      {/* Rank # */}
                      <td className="py-2.5 px-4 text-xs text-[#484F58] font-mono">{idx + 1}</td>

                      {/* Pokemon name + sprite */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNr}.png`}
                            alt={p.names?.English ?? ''}
                            className="w-8 h-8 object-contain flex-shrink-0"
                            style={{ imageRendering: 'pixelated' }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                          <div>
                            <p className="text-xs font-medium text-[#C9D1D9]">{p.names?.English ?? '—'}</p>
                            {p.dexNr != null && (
                              <p className="text-[10px] text-[#484F58] font-mono">#{String(p.dexNr).padStart(3, '0')}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          <TypeBadge type={primaryType} size="xs" />
                          {secondaryType && <TypeBadge type={secondaryType} size="xs" />}
                        </div>
                      </td>

                      {/* Tier badge */}
                      <td className="py-2.5 px-4 text-center">
                        <TierBadge tier={p.tier} />
                      </td>

                      {/* Base stats */}
                      <td className="py-2.5 px-4 text-xs text-[#C9D1D9] text-center font-semibold">{p.baseAtk}</td>
                      <td className="py-2.5 px-4 text-xs text-[#C9D1D9] text-center font-semibold">{p.baseDef}</td>
                      <td className="py-2.5 px-4 text-xs text-[#C9D1D9] text-center font-semibold">{p.baseSta}</td>

                      {/* Max CP */}
                      <td className="py-2.5 px-4 text-xs text-[#58A6FF] text-center font-semibold">
                        {p.maxCP.toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Note if truncated */}
        {hasMore && !isLoading && (
          <div className="px-4 py-3 border-t border-[#30363D] bg-[#21262D]/30">
            <p className="text-xs text-[#8B949E] text-center">
              Showing first {MAX_ROWS} of {results.length} results. Refine your search or enable "S & A only" to narrow down.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
