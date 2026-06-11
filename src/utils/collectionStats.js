import {
  effectiveAttack,
  effectiveDefense,
  effectiveStamina,
  calculateCP,
} from './ivCalculator'

export function ivPct(a, d, s) {
  return ((Number(a) || 0) + (Number(d) || 0) + (Number(s) || 0)) / 45 * 100
}

// ---- evolution chain helpers ------------------------------------------------

export function getFinalEvos(entry, byFormId, visited = new Set()) {
  if (!entry) return []
  const key = entry.formId ?? String(entry.dexNr)
  if (visited.has(key)) return [entry]
  visited.add(key)
  const links = (entry.evolutionLinks ?? []).filter(l => l.formId)
  if (links.length === 0) return [entry]
  const results = []
  for (const link of links) {
    const next = byFormId.get(link.formId.toUpperCase())
    results.push(...getFinalEvos(next ?? null, byFormId, new Set(visited)))
  }
  return results.length ? results : [entry]
}

export function getEvoPathTo(start, targetFormId, byFormId, visited = new Set()) {
  if (!start) return null
  const key = start.formId ?? String(start.dexNr)
  if (visited.has(key)) return null
  visited.add(key)
  const normalTarget = targetFormId?.toUpperCase()
  if (start.formId?.toUpperCase() === normalTarget) return [{ entry: start, link: null }]
  const links = (start.evolutionLinks ?? []).filter(l => l.formId)
  for (const link of links) {
    const next = byFormId.get(link.formId.toUpperCase())
    const sub = getEvoPathTo(next ?? null, targetFormId, byFormId, new Set(visited))
    if (sub) return [{ entry: start, link }, ...sub]
  }
  return null
}

// ---- enrichment -------------------------------------------------------------

/**
 * Enriches each catch with effective stats, potential stats, and evolution data.
 * Returns the enriched array plus the byFormId and byDexNr lookup maps.
 */
export function enrichCollection(collection, pokedex) {
  const byFormId = new Map()
  const byDexNr = new Map()
  for (const p of pokedex) {
    if (p.dexNr) byDexNr.set(p.dexNr, p)
    if (p.formId) byFormId.set(p.formId.toUpperCase(), p)
  }

  const enriched = collection.map(c => {
    const entry = byDexNr.get(c.pokemonId)
    const base = entry
      ? { atk: entry.baseAttack ?? 0, def: entry.baseDefense ?? 0, sta: entry.baseStamina ?? 0 }
      : { atk: 0, def: 0, sta: 0 }
    const lv = Math.max(1, Math.min(50, Number(c.level) || 20))
    const ivAtk = Number(c.ivAttack) || 0
    const ivDef = Number(c.ivDefense) || 0
    const ivSta = Number(c.ivStamina) || 0

    const finals = entry ? getFinalEvos(entry, byFormId) : []

    const bestAtkEvo  = finals.length ? finals.reduce((b, f) => (f?.baseAttack ?? 0) > (b?.baseAttack ?? 0) ? f : b) : null
    const bestBulkEvo = finals.length ? finals.reduce((b, f) =>
      ((f?.baseDefense ?? 0) * (f?.baseStamina ?? 0)) > ((b?.baseDefense ?? 0) * (b?.baseStamina ?? 0)) ? f : b) : null
    const bestCPEvo   = finals.length ? finals.reduce((b, f) => {
      const cpF = f ? calculateCP(f.baseAttack ?? 0, f.baseDefense ?? 0, f.baseStamina ?? 0, ivAtk, ivDef, ivSta, 50) : 0
      const cpB = b ? calculateCP(b.baseAttack ?? 0, b.baseDefense ?? 0, b.baseStamina ?? 0, ivAtk, ivDef, ivSta, 50) : 0
      return cpF > cpB ? f : b
    }) : null

    const evoPathForAtk  = entry && bestAtkEvo  ? (getEvoPathTo(entry, bestAtkEvo.formId,  byFormId) ?? [{ entry, link: null }]) : (entry ? [{ entry, link: null }] : [])
    const evoPathForBulk = entry && bestBulkEvo ? (getEvoPathTo(entry, bestBulkEvo.formId, byFormId) ?? [{ entry, link: null }]) : (entry ? [{ entry, link: null }] : [])
    const evoPathForCP   = entry && bestCPEvo   ? (getEvoPathTo(entry, bestCPEvo.formId,   byFormId) ?? [{ entry, link: null }]) : (entry ? [{ entry, link: null }] : [])

    return {
      ...c,
      base,
      effAtk:  effectiveAttack(base.atk, ivAtk, lv),
      effBulk: effectiveDefense(base.def, ivDef, lv) * effectiveStamina(base.sta, ivSta, lv),
      effCP:   calculateCP(base.atk, base.def, base.sta, ivAtk, ivDef, ivSta, lv),
      potAtk:  effectiveAttack(base.atk, ivAtk, 50),
      potBulk: effectiveDefense(base.def, ivDef, 50) * effectiveStamina(base.sta, ivSta, 50),
      potCP:   calculateCP(base.atk, base.def, base.sta, ivAtk, ivDef, ivSta, 50),
      evoAtk:  bestAtkEvo  ? effectiveAttack(bestAtkEvo.baseAttack ?? 0, ivAtk, 50)  : effectiveAttack(base.atk, ivAtk, 50),
      evoBulk: bestBulkEvo ? effectiveDefense(bestBulkEvo.baseDefense ?? 0, ivDef, 50) * effectiveStamina(bestBulkEvo.baseStamina ?? 0, ivSta, 50) : effectiveDefense(base.def, ivDef, 50) * effectiveStamina(base.sta, ivSta, 50),
      evoCP:   bestCPEvo   ? calculateCP(bestCPEvo.baseAttack ?? 0, bestCPEvo.baseDefense ?? 0, bestCPEvo.baseStamina ?? 0, ivAtk, ivDef, ivSta, 50) : calculateCP(base.atk, base.def, base.sta, ivAtk, ivDef, ivSta, 50),
      bestAtkEvo, bestBulkEvo, bestCPEvo,
      evoPathForAtk, evoPathForBulk, evoPathForCP,
      currentEntry: entry,
      ivPctVal: ivPct(c.ivAttack, c.ivDefense, c.ivStamina),
    }
  })

  return { enriched, byFormId, byDexNr }
}

// ---- rankings ---------------------------------------------------------------

export function buildRankings(enriched, n = 8) {
  const topN = (arr, scoreFn) => [...arr].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, n)
  return {
    topAttackers:    topN(enriched, c => c.effAtk),
    topDefenders:    topN(enriched, c => c.effBulk),
    topRaiders:      topN(enriched, c => c.effCP),
    potTopAttackers: topN(enriched, c => c.evoAtk),
    potTopDefenders: topN(enriched, c => c.evoBulk),
    potTopRaiders:   topN(enriched, c => c.evoCP),
  }
}
