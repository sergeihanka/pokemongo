import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePokedex } from '../hooks/usePokemon'
import { fetchPokemonDetail } from '../services/api'
import TypeBadge from '../components/Pokemon/TypeBadge'
import RatingBadge from '../components/Pokemon/RatingBadge'
import {
  calculateCP,
  effectiveAttack,
  effectiveDefense,
  effectiveStamina,
} from '../utils/ivCalculator'
import {
  getGymAttackerRating,
  getGymDefenderRating,
  getPVPRatings,
} from '../utils/ratings'

// ---- helpers ----------------------------------------------------------------

const SESSION_KEY = 'compareSlots'
const BLANK_IVS = { attack: 15, defense: 15, stamina: 15 }

function ivPct(a, d, s) {
  return Math.round(((Number(a) + Number(d) + Number(s)) / 45) * 100)
}

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]') } catch { return [] }
}
function writeSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

function deriveStat(slot, ivs) {
  if (!slot) return null
  const baseAtk = slot.baseAttack ?? slot.stats?.attack ?? 0
  const baseDef = slot.baseDefense ?? slot.stats?.defense ?? 0
  const baseSta = slot.baseStamina ?? slot.stats?.stamina ?? 0
  const { attack: ivA, defense: ivD, stamina: ivS } = ivs
  const name = slot.names?.English ?? ''
  return {
    baseAtk, baseDef, baseSta,
    cpL40: calculateCP(baseAtk, baseDef, baseSta, ivA, ivD, ivS, 40),
    cpL50: calculateCP(baseAtk, baseDef, baseSta, ivA, ivD, ivS, 50),
    effAtk: parseFloat(effectiveAttack(baseAtk, ivA, 40).toFixed(1)),
    effDef: parseFloat(effectiveDefense(baseDef, ivD, 40).toFixed(1)),
    effHp:  Math.floor(effectiveStamina(baseSta, ivS, 40)),
    gymAtk:  getGymAttackerRating(name, baseAtk, ivA),
    gymDef:  getGymDefenderRating(name, baseDef, baseSta, ivD, ivS),
    pvp:     getPVPRatings(name, baseAtk, baseDef, baseSta, ivA, ivD, ivS),
  }
}

function bestFastMove(detail) {
  if (!detail) return null
  const raw = detail.quickMoves ?? detail.moves?.filter?.(m => m.moveType === 'fast') ?? []
  const arr = Array.isArray(raw) ? raw : Object.values(raw)
  if (!arr.length) return null
  const getName = m => typeof m === 'string' ? m : (m.names?.English ?? m.name ?? '?')
  const objs = arr.filter(m => m?.power != null && m?.durationMs != null)
  if (!objs.length) return getName(arr[0])
  const sorted = [...objs].sort((a, b) => (b.power / b.durationMs) - (a.power / a.durationMs))
  const topDps = sorted[0].power / sorted[0].durationMs
  return sorted.filter(m => Math.abs(m.power / m.durationMs - topDps) < 0.05).map(getName).join(' / ')
}

function bestChargedMove(detail) {
  if (!detail) return null
  const raw = detail.cinematicMoves ?? detail.moves?.filter?.(m => m.moveType === 'charged') ?? []
  const arr = Array.isArray(raw) ? raw : Object.values(raw)
  if (!arr.length) return null
  const getName = m => typeof m === 'string' ? m : (m.names?.English ?? m.name ?? '?')
  const objs = arr.filter(m => m?.power != null)
  if (!objs.length) return getName(arr[0])
  const sorted = [...objs].sort((a, b) => b.power - a.power)
  const topPow = sorted[0].power
  return sorted.filter(m => Math.abs(m.power - topPow) < 1).map(getName).join(' / ')
}

// ---- compact slot card ------------------------------------------------------

function SlotCard({ slot, index, ivs, onChangeIVs, onRemove, onOpen }) {
  const pct = ivPct(ivs.attack, ivs.defense, ivs.stamina)

  if (!slot) {
    return (
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2
                   bg-[#161B22] border-2 border-dashed border-[#30363D] rounded-xl
                   py-6 hover:border-[#58A6FF]/50 hover:bg-[#21262D] transition group"
      >
        <div className="w-9 h-9 rounded-full bg-[#21262D] flex items-center justify-center
                        text-lg text-[#484F58] group-hover:text-[#58A6FF] group-hover:bg-[#30363D] transition">
          +
        </div>
        <span className="text-xs text-[#8B949E] group-hover:text-[#C9D1D9] transition">Add</span>
      </button>
    )
  }

  return (
    <div className="flex-1 min-w-0 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      {/* Identity */}
      <div className="relative p-3 pb-2 text-center">
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center
                     text-[#484F58] hover:text-[#F85149] transition text-xs"
        >✕</button>

        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slot.dexNr}.png`}
          alt=""
          className="w-12 h-12 object-contain mx-auto"
          style={{ imageRendering: 'pixelated' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <p className="text-xs font-bold text-[#E6EDF3] truncate mt-0.5 leading-tight">
          {slot.names?.English}
        </p>
        <p className="text-[9px] text-[#484F58] font-mono">#{String(slot.dexNr).padStart(3, '0')}</p>
        <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
          {slot.primaryType && <TypeBadge type={slot.primaryType.names?.English} size="xs" />}
          {slot.secondaryType && <TypeBadge type={slot.secondaryType.names?.English} size="xs" />}
        </div>
      </div>

      {/* IV inputs */}
      <div className="px-2 pb-3 space-y-1.5 border-t border-[#30363D] pt-2">
        <div className="grid grid-cols-3 gap-1">
          {[['attack','ATK'],['defense','DEF'],['stamina','STA']].map(([key, lbl]) => (
            <div key={key}>
              <p className="text-[9px] text-[#484F58] text-center mb-0.5">{lbl}</p>
              <input
                type="number" min={0} max={15}
                value={ivs[key]}
                onChange={e => onChangeIVs({ ...ivs, [key]: Math.min(15, Math.max(0, Number(e.target.value))) })}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-0 py-1
                           text-xs text-center text-[#C9D1D9]
                           focus:outline-none focus:border-[#58A6FF] transition"
              />
            </div>
          ))}
        </div>
        <div className={`text-[10px] font-semibold text-center py-0.5 rounded ${
          pct === 100
            ? 'bg-yellow-900/30 text-yellow-300'
            : pct >= 82
              ? 'bg-green-900/30 text-green-300'
              : 'bg-[#21262D] text-[#8B949E]'
        }`}>
          {ivs.attack}/{ivs.defense}/{ivs.stamina} · {pct}%{pct === 100 ? ' 🌟' : ''}
        </div>
      </div>
    </div>
  )
}

// ---- comparison table -------------------------------------------------------

function SectionHeader({ label, cols }) {
  return (
    <tr>
      <td
        colSpan={cols + 1}
        className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[#8B949E] bg-[#0D1117]"
      >
        {label}
      </td>
    </tr>
  )
}

function NumRow({ label, values, format = v => v?.toLocaleString() ?? '—', unit = '' }) {
  const nums = values.map(v => (v != null ? Number(v) : null))
  const valid = nums.filter(n => n !== null)
  const max = valid.length >= 2 ? Math.max(...valid) : null

  return (
    <tr className="border-b border-[#30363D]/40">
      <td className="py-2 pl-3 pr-2 text-xs text-[#8B949E] whitespace-nowrap sticky left-0 bg-[#161B22] z-10">
        {label}
      </td>
      {values.map((v, i) => {
        const n = nums[i]
        const isBest = max !== null && n === max && valid.length > 1
        return (
          <td key={i} className="py-2 px-3 text-center">
            <span className={`text-xs font-semibold ${v == null ? 'text-[#484F58]' : isBest ? 'text-[#3FB950]' : 'text-[#C9D1D9]'}`}>
              {v == null ? '—' : format(v)}{v != null && unit ? <span className="text-[#484F58]">{unit}</span> : ''}
            </span>
          </td>
        )
      })}
    </tr>
  )
}

function RatingRow({ label, values }) {
  const scores = values.map(v => v?.score ?? null)
  const valid = scores.filter(s => s !== null)
  const max = valid.length >= 2 ? Math.max(...valid) : null
  return (
    <tr className="border-b border-[#30363D]/40">
      <td className="py-2 pl-3 pr-2 text-xs text-[#8B949E] whitespace-nowrap sticky left-0 bg-[#161B22] z-10">
        {label}
      </td>
      {values.map((v, i) => {
        const isBest = max !== null && v?.score === max && valid.length > 1
        return (
          <td key={i} className="py-2 px-3 text-center">
            {v
              ? <div className="flex flex-col items-center gap-0.5">
                  <RatingBadge tier={v.tier} size="sm" />
                  {v.score != null && (
                    <span className={`text-[9px] font-mono ${isBest ? 'text-[#3FB950]' : 'text-[#484F58]'}`}>
                      {v.score.toFixed(0)}
                    </span>
                  )}
                </div>
              : <span className="text-xs text-[#484F58]">—</span>
            }
          </td>
        )
      })}
    </tr>
  )
}

function TierRow({ label, tiers }) {
  return (
    <tr className="border-b border-[#30363D]/40">
      <td className="py-2 pl-3 pr-2 text-xs text-[#8B949E] whitespace-nowrap sticky left-0 bg-[#161B22] z-10">
        {label}
      </td>
      {tiers.map((t, i) => (
        <td key={i} className="py-2 px-3 text-center">
          {t ? <RatingBadge tier={t} size="sm" /> : <span className="text-xs text-[#484F58]">—</span>}
        </td>
      ))}
    </tr>
  )
}

function TextRow({ label, values }) {
  return (
    <tr className="border-b border-[#30363D]/40">
      <td className="py-2 pl-3 pr-2 text-xs text-[#8B949E] whitespace-nowrap sticky left-0 bg-[#161B22] z-10">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="py-2 px-3 text-center">
          <span className="text-xs text-[#C9D1D9]">{v ?? <span className="text-[#484F58]">—</span>}</span>
        </td>
      ))}
    </tr>
  )
}

// ---- search modal -----------------------------------------------------------

function SearchModal({ onSelect, onClose }) {
  const { data: pokedex = [] } = usePokedex()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query) return pokedex.slice(0, 24)
    const q = query.toLowerCase()
    return pokedex.filter(p => p.names?.English?.toLowerCase().includes(q)).slice(0, 24)
  }, [query, pokedex])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D]">
          <h3 className="font-bold text-[#E6EDF3] text-sm">Select Pokémon</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#8B949E]
                       hover:text-[#C9D1D9] hover:bg-[#21262D] transition text-xs"
          >✕</button>
        </div>
        <div className="p-3 border-b border-[#30363D]">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                       text-sm text-[#C9D1D9] placeholder-[#484F58]
                       focus:outline-none focus:border-[#58A6FF]"
          />
        </div>
        <ul className="overflow-y-auto flex-1 divide-y divide-[#30363D]/40">
          {results.map(p => (
            <li key={p.dexNr}>
              <button
                onClick={() => { onSelect(p); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#21262D] transition"
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNr}.png`}
                  alt=""
                  className="w-8 h-8 object-contain flex-shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <span className="text-sm text-[#C9D1D9] font-medium">{p.names?.English}</span>
                <span className="ml-auto text-xs text-[#484F58] font-mono">#{String(p.dexNr).padStart(3,'0')}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-8 text-center text-sm text-[#484F58]">No Pokémon found</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ---- main component ---------------------------------------------------------

export default function ComparePage() {
  const saved = readSession()
  const [slots, setSlots]     = useState([saved[0] ?? null, saved[1] ?? null, saved[2] ?? null])
  const [slotIVs, setSlotIVs] = useState([
    saved[0]?.selectedIvs ?? { ...BLANK_IVS },
    saved[1]?.selectedIvs ?? { ...BLANK_IVS },
    saved[2]?.selectedIvs ?? { ...BLANK_IVS },
  ])
  const [details, setDetails] = useState([null, null, null])
  const [searchSlot, setSearchSlot] = useState(null)

  // Persist
  useEffect(() => {
    writeSession(slots.map((s, i) => s ? { ...s, selectedIvs: slotIVs[i] } : null).filter(Boolean))
  }, [slots, slotIVs])

  // Fetch detail data for best-move info when a slot is filled
  useEffect(() => {
    slots.forEach((slot, i) => {
      if (slot?.formId && !details[i]) {
        fetchPokemonDetail(slot.formId).then(d => {
          setDetails(prev => { const n = [...prev]; n[i] = d; return n })
        }).catch(() => {})
      }
    })
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((pokemon) => {
    if (searchSlot === null) return
    setSlots(prev => { const n = [...prev]; n[searchSlot] = pokemon; return n })
    setDetails(prev => { const n = [...prev]; n[searchSlot] = null; return n }) // reset detail
  }, [searchSlot])

  const handleRemove = useCallback((i) => {
    setSlots(prev => { const n = [...prev]; n[i] = null; return n })
    setSlotIVs(prev => { const n = [...prev]; n[i] = { ...BLANK_IVS }; return n })
    setDetails(prev => { const n = [...prev]; n[i] = null; return n })
  }, [])

  const handleIVs = useCallback((i, ivs) => {
    setSlotIVs(prev => { const n = [...prev]; n[i] = ivs; return n })
  }, [])

  const handleClear = useCallback(() => {
    setSlots([null, null, null])
    setSlotIVs([{ ...BLANK_IVS }, { ...BLANK_IVS }, { ...BLANK_IVS }])
    setDetails([null, null, null])
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  const derived = useMemo(() => slots.map((s, i) => deriveStat(s, slotIVs[i])), [slots, slotIVs])
  const filledCount = slots.filter(Boolean).length
  const hasAny = filledCount > 0
  const canCompare = filledCount >= 2

  // Column indices for filled slots only — so we show N=2 or N=3 columns
  const filledIndices = slots.map((s, i) => s ? i : null).filter(n => n !== null)
  const cols = filledIndices.length

  const d = (key) => filledIndices.map(i => derived[i]?.[key] ?? null)
  const s = (fn) => filledIndices.map(i => fn(slots[i], derived[i]))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E6EDF3]">Compare</h1>
          <p className="text-xs text-[#8B949E] mt-0.5">Side-by-side stats for up to 3 Pokémon</p>
        </div>
        {hasAny && (
          <button onClick={handleClear} className="text-xs text-[#484F58] hover:text-[#F85149] transition px-2 py-1">
            Clear
          </button>
        )}
      </div>

      {/* Slot cards — always horizontal */}
      <div className="flex gap-2">
        {slots.map((slot, i) => (
          <SlotCard
            key={i}
            slot={slot}
            index={i}
            ivs={slotIVs[i]}
            onChangeIVs={ivs => handleIVs(i, ivs)}
            onRemove={() => handleRemove(i)}
            onOpen={() => setSearchSlot(i)}
          />
        ))}
      </div>

      {/* Comparison — only when 2+ filled */}
      {canCompare && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[280px]">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#21262D]">
                  <th className="py-2 pl-3 pr-2 text-left text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider sticky left-0 bg-[#21262D] z-10 w-24">
                    Stat
                  </th>
                  {filledIndices.map(i => (
                    <th key={i} className="py-2 px-3 text-center text-xs font-bold text-[#C9D1D9] max-w-[96px]">
                      <div className="truncate">{slots[i]?.names?.English}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SectionHeader label="Combat Power" cols={cols} />
                <NumRow label="CP @ L40"  values={d('cpL40')} format={v => v.toLocaleString()} />
                <NumRow label="CP @ L50"  values={d('cpL50')} format={v => v.toLocaleString()} />

                <SectionHeader label="Base Stats" cols={cols} />
                <NumRow label="Attack"    values={d('baseAtk')} />
                <NumRow label="Defense"   values={d('baseDef')} />
                <NumRow label="Stamina"   values={d('baseSta')} />

                <SectionHeader label={`Effective @ L40 (your IVs)`} cols={cols} />
                <NumRow label="Eff. ATK"  values={d('effAtk')} format={v => v.toFixed(1)} />
                <NumRow label="Eff. DEF"  values={d('effDef')} format={v => v.toFixed(1)} />
                <NumRow label="HP"        values={d('effHp')} />

                <SectionHeader label="PvP Tiers" cols={cols} />
                <TierRow label="Great Lg"   tiers={filledIndices.map(i => derived[i]?.pvp?.greatLeague?.tier ?? null)} />
                <TierRow label="Ultra Lg"   tiers={filledIndices.map(i => derived[i]?.pvp?.ultraLeague?.tier ?? null)} />
                <TierRow label="Master Lg"  tiers={filledIndices.map(i => derived[i]?.pvp?.masterLeague?.tier ?? null)} />

                <SectionHeader label="Gym" cols={cols} />
                <RatingRow label="Attacker" values={filledIndices.map(i => derived[i]?.gymAtk ?? null)} />
                <RatingRow label="Defender" values={filledIndices.map(i => derived[i]?.gymDef ?? null)} />

                {/* Best moves — shown once detail data loads */}
                {filledIndices.some(i => details[i]) && <>
                  <SectionHeader label="Best Moves" cols={cols} />
                  <TextRow
                    label="Fast"
                    values={filledIndices.map(i => bestFastMove(details[i]))}
                  />
                  <TextRow
                    label="Charged"
                    values={filledIndices.map(i => bestChargedMove(details[i]))}
                  />
                </>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty prompt */}
      {!hasAny && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="text-3xl">⚔️</div>
          <p className="text-sm font-medium text-[#C9D1D9]">Select Pokémon to compare</p>
          <p className="text-xs text-[#484F58] max-w-xs">
            Tap the "+" cards above to add up to 3 Pokémon. Best values are highlighted green.
          </p>
        </div>
      )}
      {hasAny && !canCompare && (
        <p className="text-center text-xs text-[#484F58] py-4">Add one more Pokémon to see the comparison.</p>
      )}

      {searchSlot !== null && (
        <SearchModal onSelect={handleSelect} onClose={() => setSearchSlot(null)} />
      )}
    </div>
  )
}
