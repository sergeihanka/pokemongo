import { useState, useRef, useCallback } from 'react'

// ---- CSV parser ---------------------------------------------------------------

function parseCSVRow(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVRow(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

// ---- row mapper ---------------------------------------------------------------

function mapRow(row) {
  const name = row['Name']?.trim()
  const dexNr = parseInt(row['Pokemon Number'])
  const cp = parseInt(row['CP'])
  const atkIV = row['Atk IV']?.trim()
  const defIV = row['Def IV']?.trim()
  const staIV = row['Sta IV']?.trim()

  // Skip rows with missing IVs ("User Input Required") or invalid basics
  if (!atkIV || !defIV || !staIV) return { skip: 'no-ivs' }
  if (!name || isNaN(dexNr) || isNaN(cp)) return { skip: 'invalid' }

  const levelMin = parseFloat(row['Level Min']) || 20
  const levelMax = parseFloat(row['Level Max']) || levelMin
  const level = Math.round((levelMin + levelMax) / 2)

  const shadow = parseInt(row['Shadow/Purified'] || '0')
  const lucky = row['Lucky'] === '1'

  let caughtDate = null
  const rawDate = row['Catch Date']?.trim()
  if (rawDate) {
    try { caughtDate = new Date(rawDate).toISOString() } catch { /* ignore */ }
  }

  const formPart = row['Form']?.trim()
  const noteParts = [
    formPart && `Form: ${formPart}`,
    lucky && 'Lucky',
    row['Quick Move']?.trim() && `Move: ${row['Quick Move'].trim()}`,
    row['Charge Move']?.trim() && row['Charge Move'].trim() !== row['Quick Move']?.trim()
      && `/ ${row['Charge Move'].trim()}`,
  ].filter(Boolean).join(' ')

  return {
    pokemonId: dexNr,
    pokemonName: name,
    nickname: name,
    cp,
    level,
    ivAttack:  Math.max(0, Math.min(15, parseInt(atkIV))),
    ivDefense: Math.max(0, Math.min(15, parseInt(defIV))),
    ivStamina: Math.max(0, Math.min(15, parseInt(staIV))),
    isShiny:   false,
    isShadow:  shadow === 1,
    notes:     noteParts,
    caughtDate,
  }
}

function fingerprint(mon) {
  return `${mon.pokemonId}|${mon.cp}|${mon.ivAttack}|${mon.ivDefense}|${mon.ivStamina}|${mon.level}`
}

function isDupOfExisting(mon, collection) {
  return collection.some(c =>
    c.pokemonId === mon.pokemonId &&
    c.ivAttack === mon.ivAttack &&
    c.ivDefense === mon.ivDefense &&
    c.ivStamina === mon.ivStamina &&
    Math.abs((c.cp ?? 0) - mon.cp) <= 20
  )
}

// ---- component ---------------------------------------------------------------

export default function CsvImporter({ collection, onImport, onClose }) {
  const [phase, setPhase] = useState('select')   // select | review | importing
  const [parsed, setParsed] = useState([])        // valid mons to import
  const [stats, setStats] = useState(null)         // { total, skippedNoIV, skippedInvalid, dedupedCSV, dedupedExisting }
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result)
      let skippedNoIV = 0, skippedInvalid = 0, dedupedCSV = 0, dedupedExisting = 0
      const seenKeys = new Set()
      const valid = []

      for (const row of rows) {
        const mapped = mapRow(row)
        if (mapped.skip === 'no-ivs') { skippedNoIV++; continue }
        if (mapped.skip === 'invalid') { skippedInvalid++; continue }

        const key = fingerprint(mapped)
        if (seenKeys.has(key)) { dedupedCSV++; continue }
        seenKeys.add(key)

        if (isDupOfExisting(mapped, collection)) { dedupedExisting++; continue }

        valid.push(mapped)
      }

      setParsed(valid)
      setStats({ total: rows.length, skippedNoIV, skippedInvalid, dedupedCSV, dedupedExisting })
      setPhase('review')
    }
    reader.readAsText(file)
  }, [collection])

  async function handleImport() {
    setPhase('importing')
    setProgress(0)
    await onImport(parsed, (n) => setProgress(n))
    onClose()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#30363D]"
           style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div>
          <h3 className="text-base font-bold text-[#E6EDF3]">Import CSV</h3>
          {phase === 'review' && stats && (
            <p className="text-xs text-[#8B949E]">
              {parsed.length} ready to import
            </p>
          )}
          {phase === 'importing' && (
            <p className="text-xs text-[#8B949E]">Importing {progress} / {parsed.length}…</p>
          )}
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] transition">
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5"
           style={{ WebkitOverflowScrolling: 'touch' }}>

        {phase === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-[#8B949E]">
              Import your Pokémon from a Pokémon GO data-export CSV (e.g. Poke Genie). The app will skip any Pokémon with unreadable IVs and automatically remove duplicates.
            </p>
            <div className="text-xs text-[#484F58] bg-[#161B22] border border-[#30363D] rounded-lg p-3 space-y-1">
              <p className="text-[#8B949E] font-medium">Supported format:</p>
              <p>• Poke Genie CSV export (File → Export → CSV)</p>
              <p>• Pokémon with "User Input Required" IVs are skipped automatically</p>
              <p>• Exact duplicates within the CSV are removed</p>
              <p>• Pokémon already in your collection are skipped</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-[#30363D] hover:border-[#58A6FF]/60
                         text-[#8B949E] hover:text-[#C9D1D9] transition text-sm font-medium"
            >
              📄 Choose CSV File
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {phase === 'review' && stats && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#3FB950]">{parsed.length}</p>
                <p className="text-xs text-[#8B949E] mt-0.5">Ready to import</p>
              </div>
              <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#E6EDF3]">{stats.total}</p>
                <p className="text-xs text-[#8B949E] mt-0.5">Rows in CSV</p>
              </div>
            </div>

            {/* Skip breakdown */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl divide-y divide-[#30363D]">
              {stats.skippedNoIV > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-[#C9D1D9]">Skipped — IVs unreadable</p>
                    <p className="text-xs text-[#484F58]">"User Input Required" entries</p>
                  </div>
                  <span className="text-sm font-mono text-[#8B949E]">{stats.skippedNoIV}</span>
                </div>
              )}
              {stats.skippedInvalid > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-[#C9D1D9]">Skipped — missing data</p>
                    <p className="text-xs text-[#484F58]">No name, dex number, or CP</p>
                  </div>
                  <span className="text-sm font-mono text-[#8B949E]">{stats.skippedInvalid}</span>
                </div>
              )}
              {stats.dedupedCSV > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-[#C9D1D9]">Removed — CSV duplicates</p>
                    <p className="text-xs text-[#484F58]">Identical rows within the file</p>
                  </div>
                  <span className="text-sm font-mono text-orange-400">{stats.dedupedCSV}</span>
                </div>
              )}
              {stats.dedupedExisting > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-[#C9D1D9]">Skipped — already in collection</p>
                    <p className="text-xs text-[#484F58]">Same species, IVs, and CP</p>
                  </div>
                  <span className="text-sm font-mono text-orange-400">{stats.dedupedExisting}</span>
                </div>
              )}
            </div>

            {/* Preview list */}
            {parsed.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">Preview (first 10)</p>
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl divide-y divide-[#30363D]/50">
                  {parsed.slice(0, 10).map((mon, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
                        alt="" className="w-8 h-8 object-contain flex-shrink-0"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#C9D1D9] truncate">{mon.pokemonName}</p>
                        <p className="text-[11px] font-mono text-[#8B949E]">
                          CP {mon.cp} · Lv{mon.level} · {mon.ivAttack}/{mon.ivDefense}/{mon.ivStamina}
                          {mon.isShadow ? ' · Shadow' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {parsed.length > 10 && (
                    <div className="px-4 py-2 text-xs text-[#484F58] text-center">
                      …and {parsed.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {parsed.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[#8B949E]">Nothing new to import.</p>
                <p className="text-xs text-[#484F58] mt-1">All valid Pokémon are already in your collection.</p>
              </div>
            )}
          </div>
        )}

        {phase === 'importing' && (
          <div className="space-y-4">
            <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3FB950] rounded-full transition-all"
                style={{ width: `${parsed.length ? (progress / parsed.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-center text-sm text-[#8B949E]">
              Adding Pokémon to your collection…
            </p>
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
            disabled={parsed.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2EA043] text-white
                       transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            Import {parsed.length > 0 ? parsed.length : ''} Pokémon
          </button>
        </div>
      )}
    </div>
  )
}
