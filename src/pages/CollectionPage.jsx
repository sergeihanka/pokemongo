import { useState, useMemo, useCallback, useRef } from 'react'
import {
  useCollection,
  useAddToCollection,
  useUpdateCatch,
  useDeleteCatch,
} from '../hooks/useCollection'
import { usePokedex } from '../hooks/usePokemon'
import PokemonTable from '../components/Collection/PokemonTable'
import {
  effectiveAttack,
  effectiveDefense,
  effectiveStamina,
  calculateCP,
} from '../utils/ivCalculator'

// ---- screenshot scanner helpers -----------------------------------------------

function resizeToBase64(file, maxPx = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]
      resolve(b64)
    }
    img.onerror = reject
    img.src = url
  })
}

async function scanScreenshot(file) {
  const image = await resizeToBase64(file)
  const res = await fetch('/api/scan-pokemon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
  })
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
  return res.json()
}

function ScanArea({ onResult, disabled }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    try {
      const result = await scanScreenshot(file)
      onResult(result)
    } catch (err) {
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !disabled && !scanning && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer
          ${scanning ? 'border-[#58A6FF]/60 bg-[#58A6FF]/5 cursor-wait' : 'border-[#30363D] hover:border-[#58A6FF]/60 hover:bg-[#21262D]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <div className="flex items-center gap-3">
            <img src={preview} alt="screenshot" className="w-16 h-16 object-contain rounded-lg border border-[#30363D]" />
            <div className="flex-1 text-left">
              {scanning ? (
                <div className="flex items-center gap-2 text-sm text-[#58A6FF]">
                  <div className="w-4 h-4 border-2 border-[#58A6FF] border-t-transparent rounded-full animate-spin" />
                  Scanning screenshot...
                </div>
              ) : (
                <p className="text-xs text-[#3FB950]">Scan complete — tap to re-scan</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-1">📸</div>
            <p className="text-sm text-[#C9D1D9] font-medium">
              {scanning ? 'Scanning…' : 'Upload screenshot to auto-fill'}
            </p>
            <p className="text-xs text-[#484F58] mt-0.5">Tap or drag a Pokémon GO screenshot</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-[#F85149] px-1">{error}</p>}
    </div>
  )
}

// ---- helpers ----------------------------------------------------------------

function ivPercent(a, d, s) {
  const total = (Number(a) || 0) + (Number(d) || 0) + (Number(s) || 0)
  return parseFloat(((total / 45) * 100).toFixed(1))
}

const BLANK_FORM = {
  pokemonId: '',
  pokemonName: '',
  nickname: '',
  cp: '',
  level: '40',
  ivAttack: '15',
  ivDefense: '15',
  ivStamina: '15',
  isShiny: false,
  isShadow: false,
  notes: '',
}

// ---- sub-components ---------------------------------------------------------

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

function StatBadge({ label, value, color = 'text-[#E6EDF3]' }) {
  return (
    <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
      <p className="text-xs text-[#8B949E] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function DeleteConfirmModal({ name, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#161B22] border border-[#F85149]/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-[#E6EDF3]">Confirm Delete</h3>
        <p className="text-sm text-[#8B949E]">
          Are you sure you want to remove <span className="text-[#C9D1D9] font-medium">{name}</span> from your collection? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-[#30363D] text-[#8B949E]
                       hover:text-[#C9D1D9] hover:bg-[#21262D] transition text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-lg bg-[#DA3633] hover:bg-[#F85149] text-white
                       transition text-sm font-medium disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CatchForm({ form, onChange, pokedex, isEditMode }) {
  const [query, setQuery] = useState(form.pokemonName || '')
  const [showDrop, setShowDrop] = useState(false)

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    return (pokedex || [])
      .filter(p => p.names?.English?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, pokedex])

  function handlePokemonSelect(p) {
    onChange('pokemonId', p.dexNr)
    onChange('pokemonName', p.names?.English)
    setQuery(p.names?.English)
    setShowDrop(false)
  }

  const pct = ivPercent(form.ivAttack, form.ivDefense, form.ivStamina)

  return (
    <div className="space-y-4">
      {/* Pokemon selector — only in add mode */}
      {!isEditMode && (
        <div className="relative">
          <Label>Pokemon</Label>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDrop(true) }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            placeholder="Search Pokemon..."
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                       text-sm text-[#C9D1D9] placeholder-[#484F58]
                       focus:outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF] transition"
          />
          {showDrop && suggestions.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-[#161B22] border border-[#30363D]
                           rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map(p => (
                <li key={p.dexNr}>
                  <button
                    onMouseDown={() => handlePokemonSelect(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                               hover:bg-[#21262D] transition"
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNr}.png`}
                      alt=""
                      className="w-8 h-8 object-contain"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    <span className="text-sm text-[#C9D1D9] font-medium">{p.names?.English}</span>
                    <span className="ml-auto text-xs text-[#484F58]">
                      #{String(p.dexNr).padStart(3, '0')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isEditMode && (
        <div className="flex items-center gap-3 p-3 bg-[#21262D] border border-[#30363D] rounded-lg">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${form.pokemonId}.png`}
            alt=""
            className="w-10 h-10 object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div>
            <p className="text-sm font-medium text-[#E6EDF3]">{form.pokemonName}</p>
            <p className="text-xs text-[#8B949E]">#{String(form.pokemonId).padStart(3, '0')}</p>
          </div>
        </div>
      )}

      <div>
        <Label>Nickname</Label>
        <Input
          value={form.nickname}
          onChange={e => onChange('nickname', e.target.value)}
          placeholder={form.pokemonName || 'Optional'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>CP</Label>
          <Input
            type="number" min={10} max={9999}
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
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>IV ATK</Label>
          <Input
            type="number" min={0} max={15}
            value={form.ivAttack}
            onChange={e => onChange('ivAttack', e.target.value)}
          />
        </div>
        <div>
          <Label>IV DEF</Label>
          <Input
            type="number" min={0} max={15}
            value={form.ivDefense}
            onChange={e => onChange('ivDefense', e.target.value)}
          />
        </div>
        <div>
          <Label>IV STA</Label>
          <Input
            type="number" min={0} max={15}
            value={form.ivStamina}
            onChange={e => onChange('ivStamina', e.target.value)}
          />
        </div>
      </div>

      {/* IV preview pill */}
      {form.ivAttack !== '' && form.ivDefense !== '' && form.ivStamina !== '' && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-lg border text-center transition ${
          pct === 100
            ? 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300'
            : pct >= 82
              ? 'bg-green-900/30 border-green-700/50 text-green-300'
              : 'bg-[#21262D] border-[#30363D] text-[#8B949E]'
        }`}>
          {form.ivAttack}/{form.ivDefense}/{form.ivStamina} — {pct.toFixed(1)}%
          {pct === 100 && ' 🌟'}
        </div>
      )}

      <div className="flex gap-5">
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

      <div>
        <Label>Notes</Label>
        <textarea
          value={form.notes}
          onChange={e => onChange('notes', e.target.value)}
          rows={2}
          placeholder="Optional notes..."
          className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2
                     text-sm text-[#C9D1D9] placeholder-[#484F58] resize-none
                     focus:outline-none focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]"
        />
      </div>
    </div>
  )
}

function CatchModal({ title, form, onChange, onClose, onSave, isSaving, pokedex, isEditMode }) {
  function handleScanResult(result) {
    if (!result) return
    if (result.pokemonName) {
      const match = (pokedex || []).find(
        p => p.names?.English?.toLowerCase() === result.pokemonName.toLowerCase()
      )
      if (match) {
        onChange('pokemonId', match.dexNr)
        onChange('pokemonName', match.names.English)
      }
    }
    if (result.cp != null)         onChange('cp', String(result.cp))
    if (result.level != null)      onChange('level', String(result.level))
    if (result.ivAttack != null)   onChange('ivAttack', String(Math.min(15, Math.max(0, result.ivAttack))))
    if (result.ivDefense != null)  onChange('ivDefense', String(Math.min(15, Math.max(0, result.ivDefense))))
    if (result.ivStamina != null)  onChange('ivStamina', String(Math.min(15, Math.max(0, result.ivStamina))))
    if (result.isShiny)            onChange('isShiny', true)
    if (result.isShadow)           onChange('isShadow', true)
    if (result.notes)              onChange('notes', result.notes)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl
                        w-full max-w-md">
          <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#E6EDF3]">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] transition"
            >
              ✕
            </button>
          </div>

          {!isEditMode && (
            <ScanArea onResult={handleScanResult} disabled={isSaving} />
          )}

          <CatchForm
            form={form}
            onChange={onChange}
            pokedex={pokedex}
            isEditMode={isEditMode}
          />

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
              disabled={isSaving || !form.pokemonName}
              className="flex-1 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2EA043] text-white
                         transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add to Collection')}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// ---- team roster components -------------------------------------------------

const RANK_RING = [
  'bg-yellow-500 text-black',       // 1
  'bg-[#9CA3AF] text-black',        // 2
  'bg-orange-600 text-white',       // 3
  'bg-[#30363D] text-[#8B949E]',    // 4
  'bg-[#30363D] text-[#8B949E]',    // 5
  'bg-[#30363D] text-[#8B949E]',    // 6
]

function TeamSlot({ mon, rank, statFn, color }) {
  const isAlt = rank > 6
  const ringStyle = isAlt
    ? 'bg-[#21262D] border border-[#30363D] text-[#484F58]'
    : RANK_RING[rank - 1]

  return (
    <div className={`flex flex-col items-center gap-0.5 flex-shrink-0 w-[54px] ${isAlt ? 'opacity-65' : ''}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${ringStyle}`}>
        {isAlt ? (rank === 7 ? 'A' : 'B') : rank}
      </span>
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
        alt=""
        className="w-10 h-10 object-contain"
        onError={e => { e.target.style.display = 'none' }}
      />
      <p className="text-[9px] font-medium text-[#C9D1D9] truncate w-full text-center leading-tight">
        {mon.nickname || mon.pokemonName}
      </p>
      <p className={`text-[8px] font-mono leading-tight ${color}`}>{statFn(mon)}</p>
      <p className="text-[8px] text-[#484F58] leading-tight">Lv{mon.level ?? '?'} · {ivPercent(mon.ivAttack, mon.ivDefense, mon.ivStamina).toFixed(0)}%</p>
    </div>
  )
}

function EmptySlot({ rank }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-[54px] opacity-25">
      <span className="w-4 h-4 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[9px] text-[#484F58]">
        {rank}
      </span>
      <div className="w-10 h-10 rounded-full bg-[#21262D] border border-dashed border-[#30363D]" />
      <p className="text-[9px] text-[#484F58]">Empty</p>
    </div>
  )
}

function TeamRoster({ label, color, badge, roster, statFn }) {
  const main = roster.slice(0, 6)
  const alts = roster.slice(6, 8)
  const emptySlots = Math.max(0, 6 - main.length)

  return (
    <div className={`border ${badge} rounded-xl p-3 space-y-2`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {main.map((mon, i) => (
          <TeamSlot key={mon._id} mon={mon} rank={i + 1} statFn={statFn} color={color} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} rank={main.length + i + 1} />
        ))}
        {alts.length > 0 && (
          <>
            <div className="flex-shrink-0 flex items-center px-0.5">
              <div className="h-12 w-px bg-[#30363D]" />
            </div>
            {alts.map((mon, i) => (
              <TeamSlot key={mon._id} mon={mon} rank={7 + i} statFn={statFn} color={color} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ---- main component ---------------------------------------------------------

export default function CollectionPage() {
  const { data: collection = [], isLoading, isError } = useCollection()
  const { data: pokedex = [] } = usePokedex()
  const addMutation = useAddToCollection()
  const updateMutation = useUpdateCatch()
  const deleteMutation = useDeleteCatch()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)    // caught pokemon object
  const [deleteTarget, setDeleteTarget] = useState(null) // caught pokemon object
  const [addForm, setAddForm] = useState(BLANK_FORM)
  const [editForm, setEditForm] = useState(BLANK_FORM)

  // ---- stats ----------------------------------------------------------------
  const stats = useMemo(() => {
    const total = collection.length
    const hundreds = collection.filter(c =>
      c.ivAttack === 15 && c.ivDefense === 15 && c.ivStamina === 15
    ).length
    const avgIv = total === 0 ? 0 : (
      collection.reduce((sum, c) => sum + ivPercent(c.ivAttack, c.ivDefense, c.ivStamina), 0) / total
    ).toFixed(1)

    // Build base stat lookup from pokedex (keyed by dexNr)
    const baseOf = {}
    for (const p of pokedex) {
      if (p.dexNr) baseOf[p.dexNr] = {
        atk: p.baseAttack ?? 0,
        def: p.baseDefense ?? 0,
        sta: p.baseStamina ?? 0,
      }
    }

    // Enrich each catch with effective stats at current level and projected to L50
    const enriched = collection.map(c => {
      const base = baseOf[c.pokemonId] ?? { atk: 0, def: 0, sta: 0 }
      const lv = Math.max(1, Math.min(50, Number(c.level) || 20))
      const ivAtk = Number(c.ivAttack) || 0
      const ivDef = Number(c.ivDefense) || 0
      const ivSta = Number(c.ivStamina) || 0
      return {
        ...c,
        base,
        // Current level effective stats
        effAtk:  effectiveAttack(base.atk, ivAtk, lv),
        effBulk: effectiveDefense(base.def, ivDef, lv) * effectiveStamina(base.sta, ivSta, lv),
        effCP:   calculateCP(base.atk, base.def, base.sta, ivAtk, ivDef, ivSta, lv),
        // Projected to L50 with same IVs
        potAtk:  effectiveAttack(base.atk, ivAtk, 50),
        potBulk: effectiveDefense(base.def, ivDef, 50) * effectiveStamina(base.sta, ivSta, 50),
        potCP:   calculateCP(base.atk, base.def, base.sta, ivAtk, ivDef, ivSta, 50),
      }
    })

    const topN = (arr, scoreFn, n = 8) =>
      [...arr].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, n)

    // Best right now (at their current level) — top 6 team + 2 alternates
    const topAttackers    = topN(enriched, c => c.effAtk)
    const topDefenders    = topN(enriched, c => c.effBulk)
    const topRaiders      = topN(enriched, c => c.effCP)
    // Highest potential (projected to L50 with current IVs)
    const potTopAttackers = topN(enriched, c => c.potAtk)
    const potTopDefenders = topN(enriched, c => c.potBulk)
    const potTopRaiders   = topN(enriched, c => c.potCP)

    return { total, hundreds, avgIv, topAttackers, topDefenders, topRaiders, potTopAttackers, potTopDefenders, potTopRaiders }
  }, [collection, pokedex])

  // ---- handlers -------------------------------------------------------------
  function handleAddChange(field, value) {
    setAddForm(prev => ({ ...prev, [field]: value }))
  }

  function handleEditChange(field, value) {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  function openEdit(caught) {
    setEditTarget(caught)
    setEditForm({
      pokemonId: caught.pokemonId,
      pokemonName: caught.pokemonName,
      nickname: caught.nickname || '',
      cp: String(caught.cp ?? ''),
      level: String(caught.level ?? '40'),
      ivAttack: String(caught.ivAttack ?? '15'),
      ivDefense: String(caught.ivDefense ?? '15'),
      ivStamina: String(caught.ivStamina ?? '15'),
      isShiny: caught.isShiny || false,
      isShadow: caught.isShadow || false,
      notes: caught.notes || '',
    })
  }

  const handleSaveAdd = useCallback(async () => {
    try {
      await addMutation.mutateAsync({
        pokemonId: addForm.pokemonId,
        pokemonName: addForm.pokemonName,
        nickname: addForm.nickname || addForm.pokemonName,
        cp: Number(addForm.cp) || 0,
        ivAttack: Number(addForm.ivAttack),
        ivDefense: Number(addForm.ivDefense),
        ivStamina: Number(addForm.ivStamina),
        level: Number(addForm.level) || 40,
        isShiny: addForm.isShiny,
        isShadow: addForm.isShadow,
        notes: addForm.notes,
        caughtDate: new Date().toISOString(),
      })
      setShowAddModal(false)
      setAddForm(BLANK_FORM)
    } catch { /* error handled by hook */ }
  }, [addMutation, addForm])

  const handleSaveEdit = useCallback(async () => {
    if (!editTarget) return
    try {
      await updateMutation.mutateAsync({
        id: editTarget._id,
        updates: {
          nickname: editForm.nickname || editForm.pokemonName,
          cp: Number(editForm.cp) || 0,
          ivAttack: Number(editForm.ivAttack),
          ivDefense: Number(editForm.ivDefense),
          ivStamina: Number(editForm.ivStamina),
          level: Number(editForm.level) || 40,
          isShiny: editForm.isShiny,
          isShadow: editForm.isShadow,
          notes: editForm.notes,
        },
      })
      setEditTarget(null)
    } catch { /* error handled by hook */ }
  }, [updateMutation, editTarget, editForm])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget._id)
      setDeleteTarget(null)
    } catch { /* error handled by hook */ }
  }, [deleteMutation, deleteTarget])

  // ---- render ---------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#E6EDF3]">My Collection</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Track your caught Pokemon and IVs.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#238636] hover:bg-[#2EA043]
                     text-white rounded-xl text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Pokemon
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Total Caught" value={stats.total} />
        <StatBadge
          label="Avg IV %"
          value={`${stats.avgIv}%`}
          color={Number(stats.avgIv) >= 90 ? 'text-[#3FB950]' : 'text-[#E6EDF3]'}
        />
        <StatBadge
          label="100% IVs"
          value={stats.hundreds}
          color={stats.hundreds > 0 ? 'text-yellow-400' : 'text-[#E6EDF3]'}
        />
      </div>

      {/* Best Right Now — top 6 + 2 alternates per role */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xs font-semibold text-[#C9D1D9] uppercase tracking-wider">Best Right Now</h2>
          <span className="text-[10px] text-[#484F58]">ranked by effective stats at current level · scroll for alts</span>
        </div>
        <TeamRoster label="Attacker" color="text-orange-400" badge="border-orange-500/20 bg-orange-500/5"
          roster={stats.topAttackers} statFn={c => `Atk ${c.effAtk.toFixed(0)}`} />
        <TeamRoster label="Defender" color="text-blue-400" badge="border-blue-500/20 bg-blue-500/5"
          roster={stats.topDefenders} statFn={c => `Bulk ${(c.effBulk / 1000).toFixed(0)}k`} />
        <TeamRoster label="Raider" color="text-green-400" badge="border-green-500/20 bg-green-500/5"
          roster={stats.topRaiders} statFn={c => `CP ${c.effCP.toLocaleString()}`} />
      </div>

      {/* Highest Potential — projected to L50 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xs font-semibold text-[#C9D1D9] uppercase tracking-wider">Highest Potential</h2>
          <span className="text-[10px] text-[#484F58]">projected to Level 50 with current IVs</span>
        </div>
        <TeamRoster label="Attacker" color="text-orange-400" badge="border-orange-500/20 bg-orange-500/5"
          roster={stats.potTopAttackers} statFn={c => `Atk ${c.potAtk.toFixed(0)}`} />
        <TeamRoster label="Defender" color="text-blue-400" badge="border-blue-500/20 bg-blue-500/5"
          roster={stats.potTopDefenders} statFn={c => `Bulk ${(c.potBulk / 1000).toFixed(0)}k`} />
        <TeamRoster label="Raider" color="text-green-400" badge="border-green-500/20 bg-green-500/5"
          roster={stats.potTopRaiders} statFn={c => `CP ${c.potCP.toLocaleString()}`} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#58A6FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#8B949E]">Loading collection...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-[#161B22] border border-[#F85149]/40 p-6 text-center">
          <p className="text-[#F85149] font-medium">Failed to load collection.</p>
          <p className="text-sm text-[#8B949E] mt-1">Please check your connection and try again.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && collection.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center text-3xl">
            🎯
          </div>
          <p className="text-[#E6EDF3] font-medium">No Pokemon logged yet</p>
          <p className="text-sm text-[#8B949E]">Click "Add Pokemon" to start tracking your collection.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && collection.length > 0 && (
        <PokemonTable
          collection={collection}
          pokedex={pokedex}
          onEdit={openEdit}
          onDelete={c => setDeleteTarget(c)}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <CatchModal
          title="Add Pokemon to Collection"
          form={addForm}
          onChange={handleAddChange}
          onClose={() => { setShowAddModal(false); setAddForm(BLANK_FORM) }}
          onSave={handleSaveAdd}
          isSaving={addMutation.isPending}
          pokedex={pokedex}
          isEditMode={false}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <CatchModal
          title={`Edit — ${editTarget.nickname || editTarget.pokemonName}`}
          form={editForm}
          onChange={handleEditChange}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
          isSaving={updateMutation.isPending}
          pokedex={pokedex}
          isEditMode={true}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.nickname || deleteTarget.pokemonName}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
