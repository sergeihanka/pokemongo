import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePokemonDetail, usePokedex } from '../hooks/usePokemon'
import { useAddToCollection, useCollection } from '../hooks/useCollection'
import { calculateIVPercentage, calculateCP, effectiveAttack, effectiveDefense, effectiveStamina } from '../utils/ivCalculator'
import TypeBadge from '../components/Pokemon/TypeBadge'
import RatingBadge from '../components/Pokemon/RatingBadge'
import StatBar from '../components/Pokemon/StatBar'
import EvolutionChain from '../components/Pokemon/EvolutionChain'
import IVInput from '../components/IV/IVInput'
import IVAnalysis from '../components/IV/IVAnalysis'

// ---- helpers ----------------------------------------------------------------

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-2xl bg-[#21262D]" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-[#30363D] rounded w-1/3" />
            <div className="h-4 bg-[#30363D] rounded w-1/4" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-16 bg-[#30363D] rounded-full" />
              <div className="h-6 w-16 bg-[#30363D] rounded-full" />
            </div>
          </div>
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <div className="h-5 bg-[#30363D] rounded w-1/4" />
          <div className="h-3 bg-[#30363D] rounded" />
          <div className="h-3 bg-[#30363D] rounded w-5/6" />
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-[#161B22] border border-[#30363D] rounded-xl p-5 ${className}`}>
      <h2 className="text-base font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

// Modal for adding to collection
function AddToCollectionModal({ pokemon, form, onChange, onClose, onSave, isSaving, duplicateInfo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl
                      w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#E6EDF3]">
              Log Catch — {pokemon.names?.English}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] transition"
            >
              ✕
            </button>
          </div>

          {/* Duplicate recommendation banner */}
          {duplicateInfo && (
            <div className={`rounded-xl border px-4 py-3 ${duplicateInfo.style}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold tracking-wide">{duplicateInfo.verdict}</span>
                <span className="text-xs opacity-70">
                  {duplicateInfo.count} existing cop{duplicateInfo.count === 1 ? 'y' : 'ies'}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">{duplicateInfo.message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nickname (optional)</Label>
              <Input
                value={form.nickname}
                onChange={e => onChange('nickname', e.target.value)}
                placeholder={pokemon.names?.English}
              />
            </div>

            <div>
              <Label>CP</Label>
              <Input
                type="number" min={10} max={5000}
                value={form.cp}
                onChange={e => onChange('cp', e.target.value)}
                placeholder="e.g. 3500"
              />
            </div>

            <div>
              <Label>Level (1–50)</Label>
              <Input
                type="number" min={1} max={50}
                value={form.level}
                onChange={e => onChange('level', e.target.value)}
                placeholder="e.g. 40"
              />
            </div>

            <div>
              <Label>IV Attack (0–15)</Label>
              <Input
                type="number" min={0} max={15}
                value={form.ivAttack}
                onChange={e => onChange('ivAttack', e.target.value)}
              />
            </div>

            <div>
              <Label>IV Defense (0–15)</Label>
              <Input
                type="number" min={0} max={15}
                value={form.ivDefense}
                onChange={e => onChange('ivDefense', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label>IV Stamina (0–15)</Label>
              <Input
                type="number" min={0} max={15}
                value={form.ivStamina}
                onChange={e => onChange('ivStamina', e.target.value)}
              />
            </div>

            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isShiny}
                  onChange={e => onChange('isShiny', e.target.checked)}
                  className="w-4 h-4 rounded accent-yellow-400"
                />
                <span className="text-sm text-[#C9D1D9]">Shiny ✨</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isShadow}
                  onChange={e => onChange('isShadow', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-400"
                />
                <span className="text-sm text-[#C9D1D9]">Shadow 👻</span>
              </label>
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={e => onChange('notes', e.target.value)}
                rows={2}
                placeholder="e.g. Caught during Community Day..."
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                           text-sm text-[#C9D1D9] placeholder-[#484F58] resize-none
                           focus:outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]"
              />
            </div>
          </div>

          {/* IV percentage preview */}
          {(form.ivAttack !== '' && form.ivDefense !== '' && form.ivStamina !== '') && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium border ${
              ivPercent(form) === 100
                ? 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300 perfect-iv'
                : ivPercent(form) >= 82
                  ? 'bg-green-900/30 border-green-700/50 text-green-300'
                  : 'bg-[#21262D] border-[#30363D] text-[#8B949E]'
            }`}>
              IV: {form.ivAttack}/{form.ivDefense}/{form.ivStamina} — {ivPercent(form).toFixed(1)}%
              {ivPercent(form) === 100 && ' — PERFECT! 🌟'}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#30363D] text-[#8B949E]
                         hover:text-[#C9D1D9] hover:bg-[#21262D] transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2EA043] text-white
                         transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save to Collection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <label className="block text-xs font-medium text-[#8B949E] mb-1 uppercase tracking-wider">
      {children}
    </label>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                 text-sm text-[#C9D1D9] placeholder-[#484F58]
                 focus:outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]
                 transition ${className}`}
    />
  )
}

function percentileRank(sortedValues, value) {
  const n = sortedValues.length
  if (!n) return null
  let lo = 0, hi = n
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sortedValues[mid] < value) lo = mid + 1
    else hi = mid
  }
  let eq = 0, j = lo
  while (j < n && sortedValues[j] === value) { eq++; j++ }
  return Math.min(99, Math.max(1, Math.round(((lo + eq / 2) / n) * 100)))
}

function ivPercent(form) {
  const a = Number(form.ivAttack) || 0
  const d = Number(form.ivDefense) || 0
  const s = Number(form.ivStamina) || 0
  return ((a + d + s) / 45) * 100
}

const BLANK_FORM = {
  nickname: '', cp: '', level: '40',
  ivAttack: '15', ivDefense: '15', ivStamina: '15',
  isShiny: false, isShadow: false, notes: '',
}

// ---- main component ---------------------------------------------------------

export default function PokemonDetailPage() {
  const { name } = useParams()
  const navigate = useNavigate()

  const { data: pokemon, isLoading, isError } = usePokemonDetail(name)
  const addToCollection = useAddToCollection()
  const { data: collection = [] } = useCollection()
  const { data: pokedex = [] } = usePokedex()

  // Sorted stat arrays for percentile calculation (stable across form changes)
  const statSortedArrays = useMemo(() => {
    if (!pokedex.length) return null
    const atkArr = pokedex.map(p => p.baseAttack ?? 0).sort((a, b) => a - b)
    const defArr = pokedex.map(p => p.baseDefense ?? 0).sort((a, b) => a - b)
    const staArr = pokedex.map(p => p.baseStamina ?? 0).sort((a, b) => a - b)
    return { atkArr, defArr, staArr }
  }, [pokedex])

  const [activeForm, setActiveForm] = useState('normal') // 'normal' | 'shadow' | 'mega'
  const [ivs, setIvs] = useState({ attack: 15, defense: 15, stamina: 15 })
  const [myLevel, setMyLevel] = useState(40)
  const [myCPInput, setMyCPInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [catchForm, setCatchForm] = useState(BLANK_FORM)

  // IVInput calls onChange('ivAtk'|'ivDef'|'ivStam', value) — map to our state shape
  const handleIVChange = useCallback((field, value) => {
    setIvs(prev => ({
      ...prev,
      [field === 'ivAtk' ? 'attack' : field === 'ivDef' ? 'defense' : 'stamina']: value,
    }))
  }, [])

  // Pre-fill modal IVs from current state, then check for duplicates
  const handleOpenModal = useCallback(() => {
    setCatchForm({
      ...BLANK_FORM,
      ivAttack: String(ivs.attack),
      ivDefense: String(ivs.defense),
      ivStamina: String(ivs.stamina),
    })
    setShowModal(true)
  }, [ivs])

  // Duplicate recommendation — recalculated when modal is open
  const duplicateInfo = useMemo(() => {
    if (!showModal || !pokemon) return null
    const existing = collection.filter(c => c.pokemonId === pokemon.dexNr)
    if (existing.length === 0) return null
    const newPct = calculateIVPercentage(ivs.attack, ivs.defense, ivs.stamina)
    const best = existing.reduce((a, b) =>
      calculateIVPercentage(a.ivAttack, a.ivDefense, a.ivStamina) >
      calculateIVPercentage(b.ivAttack, b.ivDefense, b.ivStamina) ? a : b
    )
    const bestPct = calculateIVPercentage(best.ivAttack, best.ivDefense, best.ivStamina)
    if (newPct >= 90 && bestPct >= 90) {
      return { verdict: 'KEEP BOTH', newPct, bestPct, count: existing.length,
        message: `Both are over 90% — worth keeping. New: ${newPct.toFixed(1)}%, Best you have: ${bestPct.toFixed(1)}%.`,
        style: 'border-green-500/40 bg-green-500/10 text-green-300' }
    }
    if (newPct > bestPct) {
      return { verdict: 'REPLACE', newPct, bestPct, count: existing.length,
        message: `Upgrade! New ${newPct.toFixed(1)}% beats your best ${bestPct.toFixed(1)}%. Consider replacing.`,
        style: 'border-blue-500/40 bg-blue-500/10 text-blue-300' }
    }
    return { verdict: 'KEEP EXISTING', newPct, bestPct, count: existing.length,
      message: `You already have a ${bestPct.toFixed(1)}% — this one (${newPct.toFixed(1)}%) isn't an upgrade. Transfer for candy?`,
      style: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' }
  }, [showModal, pokemon, collection, ivs])

  const handleFormChange = useCallback((field, value) => {
    setCatchForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleAddToComparison = useCallback(() => {
    const key = 'compareSlots'
    const slots = JSON.parse(sessionStorage.getItem(key) || '[]')
    if (!slots.find(s => s.dexNr === pokemon?.dexNr)) {
      slots.push({ ...pokemon, selectedIvs: ivs })
    }
    sessionStorage.setItem(key, JSON.stringify(slots.slice(0, 3)))
    navigate('/compare')
  }, [pokemon, ivs, navigate])

  const handleSaveCatch = useCallback(async () => {
    if (!pokemon) return
    try {
      await addToCollection.mutateAsync({
        pokemonId: pokemon.dexNr,
        pokemonName: pokemon.names?.English,
        nickname: catchForm.nickname || pokemon.names?.English,
        cp: Number(catchForm.cp) || 0,
        ivAttack: Number(catchForm.ivAttack),
        ivDefense: Number(catchForm.ivDefense),
        ivStamina: Number(catchForm.ivStamina),
        level: Number(catchForm.level) || 40,
        isShiny: catchForm.isShiny,
        isShadow: catchForm.isShadow,
        notes: catchForm.notes,
        caughtDate: new Date().toISOString(),
      })
      setShowModal(false)
      setCatchForm(BLANK_FORM)
    } catch {
      // error handled by hook
    }
  }, [addToCollection, catchForm, pokemon])

  if (isLoading) return <SkeletonDetail />

  if (isError || !pokemon) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-[#F85149] text-lg font-medium">Pokemon not found</p>
        <p className="text-[#8B949E] text-sm">
          "{name}" could not be loaded from the Pokedex.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D]
                     text-[#C9D1D9] rounded-lg text-sm transition"
        >
          ← Back to Pokedex
        </button>
      </div>
    )
  }

  const hasShadow = !!pokemon.shadowForm
  const megaEvolutionsArr = pokemon.megaEvolutions
    ? Array.isArray(pokemon.megaEvolutions)
      ? pokemon.megaEvolutions
      : Object.values(pokemon.megaEvolutions)
    : []
  const hasMega = megaEvolutionsArr.length > 0
  const displayPokemon = activeForm === 'shadow' && hasShadow
    ? { ...pokemon, ...pokemon.shadowForm }
    : activeForm === 'mega' && hasMega
      ? { ...pokemon, ...megaEvolutionsArr[0] }
      : pokemon

  const baseAtk = displayPokemon.baseAttack ?? displayPokemon.stats?.attack ?? 0
  const baseDef = displayPokemon.baseDefense ?? displayPokemon.stats?.defense ?? 0
  const baseSta = displayPokemon.baseStamina ?? displayPokemon.stats?.stamina ?? 0
  const maxStatVal = Math.max(baseAtk, baseDef, baseSta, 1)

  const atkPct = statSortedArrays ? percentileRank(statSortedArrays.atkArr, baseAtk) : null
  const defPct = statSortedArrays ? percentileRank(statSortedArrays.defArr, baseDef) : null
  const staPct = statSortedArrays ? percentileRank(statSortedArrays.staArr, baseSta) : null

  // Dynamic CP breakpoints — reactive to IV slider changes
  const cpL20 = calculateCP(baseAtk, baseDef, baseSta, ivs.attack, ivs.defense, ivs.stamina, 20)
  const cpL30 = calculateCP(baseAtk, baseDef, baseSta, ivs.attack, ivs.defense, ivs.stamina, 30)
  const cpL40 = calculateCP(baseAtk, baseDef, baseSta, ivs.attack, ivs.defense, ivs.stamina, 40)
  const cpL50 = calculateCP(baseAtk, baseDef, baseSta, ivs.attack, ivs.defense, ivs.stamina, 50)
  // Max CP (15/15/15) for form comparison
  const maxCPL40 = calculateCP(baseAtk, baseDef, baseSta, 15, 15, 15, 40)
  const maxCPL50 = calculateCP(baseAtk, baseDef, baseSta, 15, 15, 15, 50)
  // Effective stats reactive to IVs
  const effAtk = effectiveAttack(baseAtk, ivs.attack, myLevel)
  const effDef = effectiveDefense(baseDef, ivs.defense, myLevel)
  const effSta = effectiveStamina(baseSta, ivs.stamina, myLevel)
  const maxEffAtk = effectiveAttack(baseAtk, 15, myLevel)
  const maxEffDef = effectiveDefense(baseDef, 15, myLevel)
  const maxEffSta = effectiveStamina(baseSta, 15, myLevel)
  const calcCPAtMyLevel = calculateCP(baseAtk, baseDef, baseSta, ivs.attack, ivs.defense, ivs.stamina, myLevel)

  const toArr = (v) => Array.isArray(v) ? v : Object.values(v ?? {})
  const quickMovesArr = toArr(pokemon.quickMoves)
  const cinematicMovesArr = toArr(pokemon.cinematicMoves)

  const spriteBase = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
  const spriteUrl = activeForm === 'shiny'
    ? `${spriteBase}/shiny/${pokemon.dexNr}.png`
    : `${spriteBase}/${pokemon.dexNr}.png`

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#C9D1D9] transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Pokedex
      </button>

      {/* Hero card */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#21262D] to-[#0D1117] p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Sprite */}
            <div className="relative w-36 h-36 flex-shrink-0 bg-[#0D1117]/50 rounded-2xl flex items-center justify-center">
              <img
                src={spriteUrl}
                alt={pokemon.names?.English}
                className="w-28 h-28 object-contain drop-shadow-2xl"
                style={{ imageRendering: 'pixelated' }}
                onError={e => { e.target.src = `${spriteBase}/${pokemon.dexNr}.png` }}
              />
              {activeForm === 'shadow' && (
                <span className="absolute bottom-1 left-1 text-xs bg-purple-900/80 text-purple-300 px-2 py-0.5 rounded-full">
                  Shadow
                </span>
              )}
              {activeForm === 'mega' && (
                <span className="absolute bottom-1 left-1 text-xs bg-blue-900/80 text-blue-300 px-2 py-0.5 rounded-full">
                  Mega
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#8B949E] font-mono">
                #{String(pokemon.dexNr).padStart(3, '0')}
              </p>
              <h1 className="text-3xl font-bold text-[#E6EDF3] mt-0.5">
                {displayPokemon.names?.English || pokemon.names?.English}
              </h1>

              {/* Type badges */}
              <div className="flex gap-2 mt-3">
                {displayPokemon.primaryType && (
                  <TypeBadge type={displayPokemon.primaryType.names?.English} />
                )}
                {displayPokemon.secondaryType && (
                  <TypeBadge type={displayPokemon.secondaryType.names?.English} />
                )}
              </div>

              {/* Form selector */}
              {(hasShadow || hasMega) && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => setActiveForm('normal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      activeForm === 'normal'
                        ? 'bg-[#238636] border-[#2EA043] text-white'
                        : 'bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-[#C9D1D9]'
                    }`}
                  >
                    Normal
                  </button>
                  {hasShadow && (
                    <button
                      onClick={() => setActiveForm('shadow')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        activeForm === 'shadow'
                          ? 'bg-purple-900 border-purple-700 text-purple-200'
                          : 'bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-[#C9D1D9]'
                      }`}
                    >
                      👻 Shadow
                    </button>
                  )}
                  {hasMega && (
                    <button
                      onClick={() => setActiveForm('mega')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        activeForm === 'mega'
                          ? 'bg-blue-900 border-blue-700 text-blue-200'
                          : 'bg-[#21262D] border-[#30363D] text-[#8B949E] hover:text-[#C9D1D9]'
                      }`}
                    >
                      ⚡ Mega
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:ml-auto self-start">
              <button
                onClick={handleOpenModal}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2EA043] text-white rounded-lg
                           text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Collection
              </button>
              <button
                onClick={handleAddToComparison}
                className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D]
                           hover:border-[#8B949E] text-[#C9D1D9] rounded-lg text-sm font-medium
                           transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Add to Comparison
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Base Stats + IV Calculator + IV-Adjusted Stats */}
        <SectionCard title="Base Stats">
          <div className="space-y-3">
            <StatBar label="Attack"  value={baseAtk} max={maxStatVal} color="bg-orange-500" percentile={atkPct} />
            <StatBar label="Defense" value={baseDef} max={maxStatVal} color="bg-blue-500"   percentile={defPct} />
            <StatBar label="Stamina" value={baseSta} max={maxStatVal} color="bg-green-500"  percentile={staPct} />
          </div>

          {/* IV Calculator */}
          <div className="mt-5 pt-5 border-t border-[#30363D]">
            <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-3">IV Calculator</h4>
            <IVInput
              ivAtk={ivs.attack}
              ivDef={ivs.defense}
              ivStam={ivs.stamina}
              onChange={handleIVChange}
            />
          </div>

          <div className="mt-5 pt-5 border-t border-[#30363D]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest whitespace-nowrap">
                  Level
                </label>
                <input
                  type="number"
                  min={1} max={50} step={0.5}
                  value={myLevel}
                  onChange={e => setMyLevel(Math.min(50, Math.max(1, Number(e.target.value) || 40)))}
                  className="w-20 bg-[#0D1117] border border-[#30363D] rounded-lg px-2 py-1 text-sm
                             text-[#C9D1D9] font-mono focus:outline-none focus:border-[#58A6FF]
                             focus:ring-1 focus:ring-[#58A6FF] text-center"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest whitespace-nowrap">
                  CP
                </label>
                <input
                  type="number"
                  min={10} max={9999}
                  value={myCPInput || calcCPAtMyLevel}
                  onChange={e => setMyCPInput(e.target.value)}
                  onFocus={e => { if (!myCPInput) setMyCPInput(String(calcCPAtMyLevel)) }}
                  placeholder={String(calcCPAtMyLevel)}
                  className="w-24 bg-[#0D1117] border border-[#30363D] rounded-lg px-2 py-1 text-sm
                             text-[#58A6FF] font-mono focus:outline-none focus:border-[#58A6FF]
                             focus:ring-1 focus:ring-[#58A6FF] text-center"
                />
                <span className="text-[#484F58] text-[10px] whitespace-nowrap">calc: {calcCPAtMyLevel.toLocaleString()}</span>
              </div>
            </div>

            <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-2">
              IV-Adjusted Stats @ Lv {myLevel}
            </h4>
            <div className="bg-[#0D1117] rounded-lg border border-[#30363D] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#30363D] bg-[#21262D]/50">
                    <th className="text-left py-1.5 px-3 text-[#8B949E] font-medium">Stat</th>
                    <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">Your IVs</th>
                    <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">Max (15/15/15)</th>
                    <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]/40">
                  {[
                    { label: 'Attack',  yours: effAtk,  max: maxEffAtk,  color: 'text-orange-400', isInt: false },
                    { label: 'Defense', yours: effDef,  max: maxEffDef,  color: 'text-blue-400',   isInt: false },
                    { label: 'Stamina', yours: effSta,  max: maxEffSta,  color: 'text-green-400',  isInt: true  },
                  ].map(({ label, yours, max, color, isInt }) => {
                    const delta = isInt ? Math.floor(max) - Math.floor(yours) : max - yours
                    return (
                      <tr key={label}>
                        <td className={`py-1.5 px-3 font-semibold ${color}`}>{label}</td>
                        <td className="py-1.5 px-3 text-center font-mono text-[#C9D1D9]">
                          {isInt ? Math.floor(yours) : yours.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono text-[#58A6FF]">
                          {isInt ? Math.floor(max) : max.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono text-[#484F58] text-[10px]">
                          {delta > 0 ? `+${isInt ? delta : delta.toFixed(1)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* Right: CP Breakpoints + Form Comparison + Ratings & Recommendation */}
        <SectionCard title="CP & Analysis">
          {/* CP Breakpoints — current IVs vs perfect 15/15/15 */}
          <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-2">CP Breakpoints</h4>
          <div className="bg-[#0D1117] rounded-lg border border-[#30363D] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#21262D]/50">
                  <th className="text-left py-1.5 px-3 text-[#8B949E] font-medium">Level</th>
                  <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">Your IVs</th>
                  <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">Max (15/15/15)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]/40">
                {[
                  { lv: 20, cp: cpL20, max: calculateCP(baseAtk, baseDef, baseSta, 15, 15, 15, 20) },
                  { lv: 30, cp: cpL30, max: calculateCP(baseAtk, baseDef, baseSta, 15, 15, 15, 30) },
                  { lv: 40, cp: cpL40, max: maxCPL40, highlight: true },
                  { lv: 50, cp: cpL50, max: maxCPL50, label: 'L50 (XL)' },
                ].map(({ lv, cp, max, highlight, label }) => (
                  <tr key={lv}>
                    <td className="py-1.5 px-3 text-[#8B949E]">{label ?? `L${lv}`}</td>
                    <td className={`py-1.5 px-3 text-center font-mono font-semibold ${highlight ? 'text-yellow-400' : 'text-[#C9D1D9]'}`}>
                      {cp?.toLocaleString() ?? '—'}
                    </td>
                    <td className="py-1.5 px-3 text-center font-mono text-[#58A6FF]">
                      {max?.toLocaleString() ?? '—'}
                      {cp != null && max != null && cp < max && (
                        <span className="text-[#484F58] ml-1 text-[10px]">(+{(max - cp).toLocaleString()})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Form Max CP comparison — always shown */}
          <div className="mt-5 pt-5 border-t border-[#30363D]">
            <h4 className="text-[#8B949E] text-xs font-semibold uppercase tracking-widest mb-2">Max CP by Form (15/15/15)</h4>
            <div className="bg-[#0D1117] rounded-lg border border-[#30363D] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#30363D] bg-[#21262D]/50">
                    <th className="text-left py-1.5 px-3 text-[#8B949E] font-medium">Form</th>
                    <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">L40</th>
                    <th className="text-center py-1.5 px-3 text-[#8B949E] font-medium">L50</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]/40">
                  <tr>
                    <td className="py-1.5 px-3 text-[#C9D1D9] font-medium">Normal</td>
                    <td className="py-1.5 px-3 text-center font-mono text-[#C9D1D9]">{maxCPL40.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-center font-mono text-[#58A6FF]">{maxCPL50.toLocaleString()}</td>
                  </tr>
                  {hasShadow && (
                    <tr>
                      <td className="py-1.5 px-3 text-purple-300 font-medium">
                        👻 Shadow
                        <span className="block text-[#484F58] font-normal text-[10px]">+20% ATK / −17% DEF in battle</span>
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-[#C9D1D9]">{maxCPL40.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-center font-mono text-[#58A6FF]">{maxCPL50.toLocaleString()}</td>
                    </tr>
                  )}
                  {megaEvolutionsArr.map((mega, i) => {
                    const mAtk = mega.stats?.attack ?? mega.baseAttack ?? baseAtk
                    const mDef = mega.stats?.defense ?? mega.baseDefense ?? baseDef
                    const mSta = mega.stats?.stamina ?? mega.baseStamina ?? baseSta
                    const mName = mega.names?.English ?? `Mega ${pokemon.names?.English}`
                    return (
                      <tr key={i}>
                        <td className="py-1.5 px-3 text-blue-300 font-medium">⚡ {mName}</td>
                        <td className="py-1.5 px-3 text-center font-mono text-[#C9D1D9]">{calculateCP(mAtk, mDef, mSta, 15, 15, 15, 40).toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-center font-mono text-[#58A6FF]">{calculateCP(mAtk, mDef, mSta, 15, 15, 15, 50).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* IVAnalysis — IV score, gym/PVP ratings, recommendation (no CP section) */}
          <div className="mt-5 pt-5 border-t border-[#30363D]">
            <IVAnalysis
              pokemon={displayPokemon}
              ivAtk={ivs.attack}
              ivDef={ivs.defense}
              ivStam={ivs.stamina}
            />
          </div>
        </SectionCard>
      </div>

      {/* Moves */}
      <SectionCard title="Move Pool">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
              Fast Moves
            </h3>
            {quickMovesArr.length > 0 ? (
              <ul className="space-y-1">
                {quickMovesArr.map((move, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-[#21262D] rounded-lg
                               text-sm text-[#C9D1D9]"
                  >
                    <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                    {typeof move === 'string' ? move : move.names?.English || move.name || move}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#484F58]">No data</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
              Charge Moves
            </h3>
            {cinematicMovesArr.length > 0 ? (
              <ul className="space-y-1">
                {cinematicMovesArr.map((move, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-[#21262D] rounded-lg
                               text-sm text-[#C9D1D9]"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    {typeof move === 'string' ? move : move.names?.English || move.name || move}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#484F58]">No data</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Evolution Chain */}
      <SectionCard title="Evolution Chain">
        <EvolutionChain pokemon={pokemon} />
      </SectionCard>

      {/* Add to collection modal */}
      {showModal && (
        <AddToCollectionModal
          pokemon={pokemon}
          form={catchForm}
          onChange={handleFormChange}
          onClose={() => setShowModal(false)}
          onSave={handleSaveCatch}
          isSaving={addToCollection.isPending}
          duplicateInfo={duplicateInfo}
        />
      )}
    </div>
  )
}
