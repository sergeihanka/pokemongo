import { useState, useRef, useCallback } from 'react'
import { useTrainerLevel } from '../../context/TrainerLevelContext.jsx'

const SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

function ivPct(a, d, s) {
  if (a == null || d == null || s == null) return null
  return Math.round(((Number(a) + Number(d) + Number(s)) / 45) * 100)
}

function resizeToBase64(file, maxPx = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

function isDuplicate(scan, collection) {
  if (!scan.pokemonName) return false
  return collection.some(c => {
    if ((c.pokemonName || '').toLowerCase() !== (scan.pokemonName || '').toLowerCase()) return false
    // Exact IV match = definite duplicate
    if (scan.ivAttack != null && scan.ivAttack === c.ivAttack &&
        scan.ivDefense != null && scan.ivDefense === c.ivDefense &&
        scan.ivStamina != null && scan.ivStamina === c.ivStamina) return true
    // CP within ±80 = likely duplicate
    if (scan.cp != null && c.cp != null && Math.abs(scan.cp - c.cp) <= 80) return true
    return false
  })
}

export default function AlbumScanner({ collection, pokedex, onImport, onClose }) {
  const [trainerLevel] = useTrainerLevel()
  const [phase, setPhase] = useState('select') // select | scanning | review
  const [items, setItems] = useState([])         // { file, preview, status, result, selected, error }
  const [scanIdx, setScanIdx] = useState(0)
  const inputRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return
    const arr = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      result: null,
      selected: true,
      error: null,
    }))
    setItems(arr)
    setPhase('scanning')
    setScanIdx(0)

    // Process sequentially to avoid hammering the API
    for (let i = 0; i < arr.length; i++) {
      setScanIdx(i)
      try {
        const image = await resizeToBase64(arr[i].file)
        const res = await fetch('/api/scan-pokemon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, mediaType: 'image/jpeg', trainerLevel }),
        })
        const result = await res.json()
        const dup = isDuplicate(result, collection)
        arr[i] = {
          ...arr[i],
          status: dup ? 'duplicate' : 'new',
          result,
          selected: !dup, // auto-deselect duplicates
        }
      } catch (err) {
        arr[i] = { ...arr[i], status: 'error', error: err.message }
      }
      setItems([...arr])
    }
    setPhase('review')
  }, [collection, trainerLevel])

  function toggle(i) {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, selected: !item.selected } : item
    ))
  }

  async function handleImport() {
    const toImport = items
      .filter(item => item.selected && item.result && item.status !== 'error')
      .map(item => item.result)
    await onImport(toImport)
    onClose()
  }

  const newCount = items.filter(i => i.status === 'new').length
  const dupCount = items.filter(i => i.status === 'duplicate').length
  const selectedCount = items.filter(i => i.selected && i.status !== 'error').length

  // Find dex number for sprite
  function dexNr(name) {
    if (!name) return null
    const match = pokedex.find(p =>
      (p.names?.English || '').toLowerCase() === name.toLowerCase()
    )
    return match?.dexNr ?? null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#30363D]"
           style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div>
          <h3 className="text-base font-bold text-[#E6EDF3]">Scan Photo Album</h3>
          {phase === 'scanning' && (
            <p className="text-xs text-[#8B949E]">Scanning {scanIdx + 1} of {items.length}…</p>
          )}
          {phase === 'review' && (
            <p className="text-xs text-[#8B949E]">{newCount} new · {dupCount} already in collection</p>
          )}
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] transition">
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* SELECT phase */}
        {phase === 'select' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#8B949E]">
              Select one or more Pokémon GO screenshots from your photo library.
              The scanner will detect IVs, CP, and level — and skip any that are already in your collection.
            </p>
            <div className="text-xs text-[#484F58] bg-[#161B22] border border-[#30363D] rounded-lg p-3 space-y-1">
              <p>Tips for best accuracy:</p>
              <p>• Screenshot the <strong className="text-[#8B949E]">appraisal screen</strong> so IVs are shown as numbers</p>
              <p>• Make sure the stardust cost (Power Up button) is visible</p>
              <p>• Your trainer level is set to <strong className="text-[#58A6FF]">{trainerLevel}</strong> — update it in the header if wrong</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-[#30363D] hover:border-[#58A6FF]/60
                         text-[#8B949E] hover:text-[#C9D1D9] transition text-sm font-medium"
            >
              📸 Select Screenshots
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
        )}

        {/* SCANNING phase */}
        {phase === 'scanning' && (
          <div className="p-6 space-y-3">
            {/* Progress bar */}
            <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#58A6FF] rounded-full transition-all"
                style={{ width: `${((scanIdx) / items.length) * 100}%` }}
              />
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#8B949E] truncate">Photo {i + 1}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {item.status === 'pending' && i === scanIdx && (
                      <div className="w-4 h-4 border-2 border-[#58A6FF] border-t-transparent rounded-full animate-spin" />
                    )}
                    {item.status === 'pending' && i > scanIdx && (
                      <div className="w-4 h-4 rounded-full border border-[#30363D]" />
                    )}
                    {(item.status === 'new' || item.status === 'duplicate') && (
                      <span className="text-[#3FB950]">✓</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-[#F85149]">✗</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVIEW phase */}
        {phase === 'review' && (
          <div className="divide-y divide-[#30363D]/50">
            {items.map((item, i) => {
              const r = item.result
              const nr = r ? dexNr(r.pokemonName) : null
              const pct = r ? ivPct(r.ivAttack, r.ivDefense, r.ivStamina) : null

              return (
                <label key={i} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition
                  ${item.status === 'error' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#21262D]'}`}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={item.status === 'error'}
                    onChange={() => toggle(i)}
                    className="w-4 h-4 rounded accent-[#58A6FF] flex-shrink-0"
                  />
                  <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  {nr && (
                    <img src={`${SPRITE}${nr}.png`} alt="" className="w-8 h-8 object-contain flex-shrink-0"
                         onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    {item.status === 'error' ? (
                      <p className="text-xs text-[#F85149]">Scan failed</p>
                    ) : r ? (
                      <>
                        <p className="text-sm font-medium text-[#C9D1D9] truncate">{r.pokemonName || '?'}</p>
                        <p className="text-[11px] text-[#8B949E] font-mono">
                          CP {r.cp ?? '?'} · Lv{r.level ?? '?'}
                          {pct != null ? ` · ${pct}% IV` : ''}
                        </p>
                        {r.ivAttack != null && (
                          <p className="text-[10px] font-mono text-[#484F58]">
                            {r.ivAttack}/{r.ivDefense}/{r.ivStamina}
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                  <div className="flex-shrink-0">
                    {item.status === 'duplicate' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40">
                        In collection
                      </span>
                    )}
                    {item.status === 'new' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40">
                        New
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {phase === 'review' && (
        <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t border-[#30363D]"
             style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#30363D] text-[#8B949E]
                       hover:text-[#C9D1D9] hover:bg-[#21262D] transition text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedCount === 0}
            className="flex-1 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2EA043] text-white
                       transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            Import {selectedCount > 0 ? selectedCount : ''} Pokémon
          </button>
        </div>
      )}
    </div>
  )
}
