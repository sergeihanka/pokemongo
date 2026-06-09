import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePokedex } from '../hooks/usePokemon'
import ComparePanel from '../components/Compare/ComparePanel'
import RatingBadge from '../components/Pokemon/RatingBadge'
import TypeBadge from '../components/Pokemon/TypeBadge'

// ---- helpers ----------------------------------------------------------------

const SESSION_KEY = 'compareSlots'

function calcEffectiveAtk(base, iv, level = 40) {
  const CPM = level === 40 ? 0.7903 : 0.8403
  return ((base + iv) * CPM).toFixed(1)
}
function calcEffectiveDef(base, iv, level = 40) {
  const CPM = level === 40 ? 0.7903 : 0.8403
  return ((base + iv) * CPM).toFixed(1)
}
function calcEffectiveSta(base, iv, level = 40) {
  const CPM = level === 40 ? 0.7903 : 0.8403
  return Math.floor((base + iv) * CPM)
}
function calcMaxCP(baseAtk, baseDef, baseSta, ivA = 15, ivD = 15, ivS = 15, level = 40) {
  const CPM = level === 40 ? 0.7903 : 0.8403
  const atk = (baseAtk + ivA) * CPM
  const def = Math.sqrt((baseDef + ivD) * CPM * CPM)
  const sta = Math.sqrt((baseSta + ivS) * CPM * CPM)
  return Math.max(10, Math.floor((atk * def * sta) / 10))
}

function ivPercent(a, d, s) {
  return parseFloat((((Number(a) + Number(d) + Number(s)) / 45) * 100).toFixed(1))
}

const BLANK_IVS = { attack: 15, defense: 15, stamina: 15 }

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')
  } catch {
    return []
  }
}

function writeSession(slots) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(slots))
}

// ---- sub-components ---------------------------------------------------------

function SlotCard({ slot, index, ivs, onChangeIVs, onRemove, onOpen }) {
  if (!slot) {
    return (
      <div
        className="flex-1 min-w-0 flex flex-col items-center justify-center
                   bg-[#161B22] border-2 border-dashed border-[#30363D]
                   rounded-2xl p-8 gap-3 cursor-pointer group
                   hover:border-[#58A6FF]/50 hover:bg-[#161B22]/80 transition"
        onClick={onOpen}
      >
        <div className="w-12 h-12 rounded-full bg-[#21262D] flex items-center justify-center
                        text-2xl group-hover:bg-[#30363D] transition">
          +
        </div>
        <p className="text-sm text-[#8B949E] group-hover:text-[#C9D1D9] transition font-medium">
          Add Pokemon {index + 1}
        </p>
      </div>
    )
  }

  const stats = slot.stats || {}
  const pct = ivPercent(ivs.attack, ivs.defense, ivs.stamina)
  const cp = calcMaxCP(
    stats.baseAttack, stats.baseDefense, stats.baseStamina,
    ivs.attack, ivs.defense, ivs.stamina, 40
  )

  return (
    <div className="flex-1 min-w-0 bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#21262D] to-[#161B22] p-4">
        <div className="flex items-start gap-3">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slot.dexNr}.png`}
            alt={slot.names?.English}
            className="w-16 h-16 object-contain flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#8B949E] font-mono">#{String(slot.dexNr).padStart(3, '0')}</p>
            <h3 className="text-base font-bold text-[#E6EDF3] truncate">{slot.names?.English}</h3>
            <div className="flex gap-1 mt-1 flex-wrap">
              {slot.primaryType && <TypeBadge type={slot.primaryType.names?.English} size="xs" />}
              {slot.secondaryType && <TypeBadge type={slot.secondaryType.names?.English} size="xs" />}
            </div>
          </div>
          <button
            onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center rounded text-[#484F58]
                       hover:text-[#F85149] hover:bg-[#30363D] transition text-xs flex-shrink-0"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>

      {/* IV inputs */}
      <div className="p-4 border-t border-[#30363D] space-y-3">
        <p className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">IVs</p>
        <div className="grid grid-cols-3 gap-2">
          {['attack', 'defense', 'stamina'].map(stat => (
            <div key={stat}>
              <label className="block text-[10px] text-[#484F58] mb-1 capitalize">{stat.slice(0,3).toUpperCase()}</label>
              <input
                type="number" min={0} max={15}
                value={ivs[stat]}
                onChange={e => onChangeIVs({ ...ivs, [stat]: Math.min(15, Math.max(0, Number(e.target.value))) })}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-2 py-1.5
                           text-xs text-center text-[#C9D1D9]
                           focus:outline-none focus:border-[#58A6FF] transition"
              />
            </div>
          ))}
        </div>

        <div className={`text-xs font-medium text-center px-2 py-1.5 rounded border ${
          pct === 100
            ? 'bg-yellow-900/30 border-yellow-600/40 text-yellow-300'
            : pct >= 82
              ? 'bg-green-900/30 border-green-700/40 text-green-300'
              : 'bg-[#21262D] border-[#30363D] text-[#8B949E]'
        }`}>
          {ivs.attack}/{ivs.defense}/{ivs.stamina} — {pct}%
          {pct === 100 && ' 🌟'}
        </div>

        {/* Key stats */}
        <div className="space-y-1.5 pt-1">
          <StatRow label="CP (L40)" value={cp.toLocaleString()} highlight />
          <StatRow
            label="CP (L50)"
            value={calcMaxCP(stats.baseAttack, stats.baseDefense, stats.baseStamina,
              ivs.attack, ivs.defense, ivs.stamina, 50).toLocaleString()}
          />
          <StatRow
            label="Eff. ATK"
            value={calcEffectiveAtk(stats.baseAttack, ivs.attack)}
          />
          <StatRow
            label="Eff. DEF"
            value={calcEffectiveDef(stats.baseDefense, ivs.defense)}
          />
          <StatRow
            label="Eff. STA"
            value={calcEffectiveSta(stats.baseStamina, ivs.stamina)}
          />
        </div>
      </div>

      {/* Ratings */}
      <div className="px-4 pb-4 pt-1 border-t border-[#30363D] space-y-2">
        <p className="text-xs font-medium text-[#8B949E] uppercase tracking-wider pt-2">Ratings</p>
        {[
          { label: 'Gym ATK', key: 'gymAttacker' },
          { label: 'Gym DEF', key: 'gymDefender' },
          { label: 'GL', key: 'pvpGreat' },
          { label: 'UL', key: 'pvpUltra' },
          { label: 'ML', key: 'pvpMaster' },
        ].map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-[#8B949E]">{label}</span>
            <RatingBadge rating={slot[key]} size="xs" />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#8B949E]">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? 'text-[#58A6FF]' : 'text-[#C9D1D9]'}`}>
        {value}
      </span>
    </div>
  )
}

// Comparison row for the summary table
function CompareRow({ label, values, highlight = false, format = v => v ?? '—' }) {
  const nums = values.map(v => (v != null ? Number(v) : null))
  const max = Math.max(...nums.filter(n => n !== null))

  return (
    <tr className={`border-b border-[#30363D] ${highlight ? 'bg-[#21262D]/30' : ''}`}>
      <td className="py-2.5 px-4 text-xs text-[#8B949E] font-medium whitespace-nowrap">{label}</td>
      {values.map((v, i) => {
        const n = nums[i]
        const isBest = n !== null && n === max && values.filter(x => x != null).length > 1
        return (
          <td
            key={i}
            className={`py-2.5 px-4 text-xs text-center font-semibold ${
              v == null ? 'text-[#484F58]' : isBest ? 'text-[#3FB950]' : 'text-[#C9D1D9]'
            }`}
          >
            {format(v)}
          </td>
        )
      })}
    </tr>
  )
}

function SearchModal({ onSelect, onClose }) {
  const { data: pokedex = [] } = usePokedex()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query || query.length < 1) return pokedex.slice(0, 20)
    const q = query.toLowerCase()
    return pokedex.filter(p => p.names?.English?.toLowerCase().includes(q)).slice(0, 20)
  }, [query, pokedex])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-4 border-b border-[#30363D] flex items-center justify-between">
          <h3 className="font-bold text-[#E6EDF3]">Select Pokemon</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E]
                       hover:text-[#C9D1D9] hover:bg-[#21262D] transition"
          >
            ✕
          </button>
        </div>
        <div className="p-3 border-b border-[#30363D]">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                       text-sm text-[#C9D1D9] placeholder-[#484F58]
                       focus:outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto divide-y divide-[#30363D]/50">
          {results.map(p => (
            <li key={p.dexNr}>
              <button
                onClick={() => { onSelect(p); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#21262D] transition"
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNr}.png`}
                  alt=""
                  className="w-9 h-9 object-contain flex-shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <span className="text-sm text-[#C9D1D9] font-medium">{p.names?.English}</span>
                <span className="ml-auto text-xs text-[#484F58]">
                  #{String(p.dexNr).padStart(3, '0')}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-6 text-center text-sm text-[#484F58]">No Pokemon found</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ---- main component ---------------------------------------------------------

export default function ComparePage() {
  const [slots, setSlots] = useState(() => {
    const saved = readSession()
    return [
      saved[0] ?? null,
      saved[1] ?? null,
      saved[2] ?? null,
    ]
  })

  const [slotIVs, setSlotIVs] = useState(() => {
    const saved = readSession()
    return [
      saved[0]?.selectedIvs ?? { ...BLANK_IVS },
      saved[1]?.selectedIvs ?? { ...BLANK_IVS },
      saved[2]?.selectedIvs ?? { ...BLANK_IVS },
    ]
  })

  const [searchSlot, setSearchSlot] = useState(null) // index of slot being searched

  // Persist to sessionStorage whenever slots/IVs change
  useEffect(() => {
    const data = slots.map((s, i) => s ? { ...s, selectedIvs: slotIVs[i] } : null).filter(Boolean)
    writeSession(data)
  }, [slots, slotIVs])

  const handleSelectPokemon = useCallback((pokemon) => {
    if (searchSlot === null) return
    setSlots(prev => {
      const next = [...prev]
      next[searchSlot] = pokemon
      return next
    })
  }, [searchSlot])

  const handleRemoveSlot = useCallback((index) => {
    setSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
    setSlotIVs(prev => {
      const next = [...prev]
      next[index] = { ...BLANK_IVS }
      return next
    })
  }, [])

  const handleChangeIVs = useCallback((index, ivs) => {
    setSlotIVs(prev => {
      const next = [...prev]
      next[index] = ivs
      return next
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setSlots([null, null, null])
    setSlotIVs([{ ...BLANK_IVS }, { ...BLANK_IVS }, { ...BLANK_IVS }])
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  const filledSlots = slots.filter(Boolean).length

  // Comparison table data
  const compRows = useMemo(() => {
    return slots.map((slot, i) => {
      if (!slot) return null
      const s = slot.stats || {}
      const iv = slotIVs[i]
      return {
        cpL40: calcMaxCP(s.baseAttack, s.baseDefense, s.baseStamina, iv.attack, iv.defense, iv.stamina, 40),
        cpL50: calcMaxCP(s.baseAttack, s.baseDefense, s.baseStamina, iv.attack, iv.defense, iv.stamina, 50),
        baseAtk: s.baseAttack,
        baseDef: s.baseDefense,
        baseSta: s.baseStamina,
        effAtk: Number(calcEffectiveAtk(s.baseAttack, iv.attack)),
        effDef: Number(calcEffectiveDef(s.baseDefense, iv.defense)),
        effSta: calcEffectiveSta(s.baseStamina, iv.stamina),
        ivPct: ivPercent(iv.attack, iv.defense, iv.stamina),
        gymAttacker: slot.gymAttacker,
        gymDefender: slot.gymDefender,
        pvpGreat: slot.pvpGreat,
        pvpUltra: slot.pvpUltra,
        pvpMaster: slot.pvpMaster,
      }
    })
  }, [slots, slotIVs])

  const hasAny = slots.some(Boolean)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#E6EDF3]">Compare Pokemon</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">
            Side-by-side comparison of up to 3 Pokemon with custom IVs.
          </p>
        </div>
        {hasAny && (
          <button
            onClick={handleClearAll}
            className="text-sm text-[#F85149] hover:text-[#FF7B72] transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Slot cards */}
      <div className="flex flex-col lg:flex-row gap-4">
        {slots.map((slot, i) => (
          <SlotCard
            key={i}
            slot={slot}
            index={i}
            ivs={slotIVs[i]}
            onChangeIVs={ivs => handleChangeIVs(i, ivs)}
            onRemove={() => handleRemoveSlot(i)}
            onOpen={() => setSearchSlot(i)}
          />
        ))}
      </div>

      {/* ComparePanel from components */}
      {filledSlots >= 2 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
          <h2 className="text-base font-semibold text-[#E6EDF3] mb-4">Comparison Panel</h2>
          <ComparePanel
            slots={slots.filter(Boolean).map((s, rawIdx) => {
              const actualIdx = slots.findIndex((x, j) => x === s && j >= rawIdx)
              return { pokemon: s, ivs: slotIVs[actualIdx] }
            })}
          />
        </div>
      )}

      {/* Stat comparison table */}
      {filledSlots >= 2 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363D]">
            <h2 className="text-base font-semibold text-[#E6EDF3]">Stats Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#21262D]/50">
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-[#8B949E] uppercase tracking-wider">
                    Stat
                  </th>
                  {slots.map((slot, i) => (
                    <th
                      key={i}
                      className="py-2.5 px-4 text-center text-xs font-medium text-[#8B949E] uppercase tracking-wider"
                    >
                      {slot ? (
                        <span className="text-[#C9D1D9]">{slot.names?.English}</span>
                      ) : (
                        <span className="text-[#484F58]">—</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="CP (L40)"
                  values={compRows.map(r => r?.cpL40 ?? null)}
                  format={v => v != null ? v.toLocaleString() : '—'}
                  highlight
                />
                <CompareRow
                  label="CP (L50)"
                  values={compRows.map(r => r?.cpL50 ?? null)}
                  format={v => v != null ? v.toLocaleString() : '—'}
                />
                <CompareRow
                  label="Base ATK"
                  values={compRows.map(r => r?.baseAtk ?? null)}
                  format={v => v ?? '—'}
                  highlight
                />
                <CompareRow
                  label="Base DEF"
                  values={compRows.map(r => r?.baseDef ?? null)}
                  format={v => v ?? '—'}
                />
                <CompareRow
                  label="Base STA"
                  values={compRows.map(r => r?.baseSta ?? null)}
                  format={v => v ?? '—'}
                  highlight
                />
                <CompareRow
                  label="Eff. ATK (L40)"
                  values={compRows.map(r => r?.effAtk ?? null)}
                  format={v => v ?? '—'}
                />
                <CompareRow
                  label="Eff. DEF (L40)"
                  values={compRows.map(r => r?.effDef ?? null)}
                  format={v => v ?? '—'}
                  highlight
                />
                <CompareRow
                  label="Eff. STA (L40)"
                  values={compRows.map(r => r?.effSta ?? null)}
                  format={v => v ?? '—'}
                />
                <CompareRow
                  label="IV %"
                  values={compRows.map(r => r?.ivPct ?? null)}
                  format={v => v != null ? `${v}%` : '—'}
                  highlight
                />

                {/* Ratings — these are text not numeric, show with RatingBadge inline */}
                {[
                  { label: 'Gym Attacker', key: 'gymAttacker' },
                  { label: 'Gym Defender', key: 'gymDefender' },
                  { label: 'Great League', key: 'pvpGreat' },
                  { label: 'Ultra League', key: 'pvpUltra' },
                  { label: 'Master League', key: 'pvpMaster' },
                ].map(({ label, key }) => (
                  <tr key={key} className="border-b border-[#30363D]">
                    <td className="py-2.5 px-4 text-xs text-[#8B949E] font-medium">{label}</td>
                    {slots.map((slot, i) => (
                      <td key={i} className="py-2 px-4 text-center">
                        {slot
                          ? <RatingBadge rating={slot[key]} size="xs" />
                          : <span className="text-xs text-[#484F58]">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty prompt */}
      {!hasAny && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="text-4xl">⚔️</div>
          <p className="text-[#E6EDF3] font-medium">No Pokemon selected</p>
          <p className="text-sm text-[#8B949E] text-center max-w-xs">
            Click the "+" slots above to add up to 3 Pokemon and compare their stats side by side.
          </p>
        </div>
      )}

      {/* Search modal */}
      {searchSlot !== null && (
        <SearchModal
          onSelect={handleSelectPokemon}
          onClose={() => setSearchSlot(null)}
        />
      )}
    </div>
  )
}
