import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useCollection } from '../hooks/useCollection'
import { usePokedex } from '../hooks/usePokemon'
import { useTrainerLevel } from '../context/TrainerLevelContext.jsx'
import { ivPct, enrichCollection, buildRankings } from '../utils/collectionStats'

// ---- context builder --------------------------------------------------------

function slotLine(c, statLabel, statVal) {
  const tags = [c.isShiny && '✨Shiny', c.isShadow && '👻Shadow'].filter(Boolean).join(' ')
  return `  ${c.pokemonName} | IV ${c.ivAttack}/${c.ivDefense}/${c.ivStamina} (${c.ivPctVal?.toFixed(0) ?? ivPct(c.ivAttack, c.ivDefense, c.ivStamina).toFixed(0)}%) | Lv ${c.level} | ${statLabel}: ${statVal}${tags ? ' | ' + tags : ''}`
}

function buildCollectionContext(collection, pokedex, trainerLevel) {
  if (!collection.length) {
    return `COLLECTION: Empty — no Pokémon logged yet.\nTrainer Level: ${trainerLevel}`
  }

  const total = collection.length
  const hundreds = collection.filter(c => c.ivAttack === 15 && c.ivDefense === 15 && c.ivStamina === 15).length
  const avg = (collection.reduce((s, c) => s + ivPct(c.ivAttack, c.ivDefense, c.ivStamina), 0) / total).toFixed(1)

  const { enriched } = enrichCollection(collection, pokedex)
  const rankings = buildRankings(enriched, 6)

  let ctx = `TRAINER LEVEL: ${trainerLevel}\n`
  ctx += `COLLECTION SUMMARY: ${total} Pokémon | ${hundreds}× perfect IVs | avg ${avg}% IVs\n\n`

  // ---- ranked rosters -------------------------------------------------------
  ctx += `BEST RIGHT NOW (effective stats at current level):\n`
  ctx += `Top Attackers:\n`
  rankings.topAttackers.forEach((c, i) => { ctx += `${i + 1}. ${slotLine(c, 'Eff.Atk', c.effAtk.toFixed(1))}\n` })
  ctx += `Top Defenders (by bulk):\n`
  rankings.topDefenders.forEach((c, i) => { ctx += `${i + 1}. ${slotLine(c, 'Bulk', (c.effBulk / 1000).toFixed(1) + 'k')}\n` })
  ctx += `Top Raiders (by CP):\n`
  rankings.topRaiders.forEach((c, i) => { ctx += `${i + 1}. ${slotLine(c, 'CP', c.effCP.toLocaleString())}\n` })

  ctx += `\nHIGHEST POTENTIAL (projected to Lv50 with best evolution, same IVs):\n`
  ctx += `Top Attackers:\n`
  rankings.potTopAttackers.forEach((c, i) => {
    const evoNote = c.bestAtkEvo && c.bestAtkEvo.dexNr !== c.pokemonId ? ` → ${c.bestAtkEvo.names?.English}` : ''
    ctx += `${i + 1}. ${slotLine(c, 'Evo.Atk@L50', c.evoAtk.toFixed(1))}${evoNote}\n`
  })
  ctx += `Top Defenders (by bulk):\n`
  rankings.potTopDefenders.forEach((c, i) => {
    const evoNote = c.bestBulkEvo && c.bestBulkEvo.dexNr !== c.pokemonId ? ` → ${c.bestBulkEvo.names?.English}` : ''
    ctx += `${i + 1}. ${slotLine(c, 'Evo.Bulk@L50', (c.evoBulk / 1000).toFixed(1) + 'k')}${evoNote}\n`
  })
  ctx += `Top Raiders (by CP):\n`
  rankings.potTopRaiders.forEach((c, i) => {
    const evoNote = c.bestCPEvo && c.bestCPEvo.dexNr !== c.pokemonId ? ` → ${c.bestCPEvo.names?.English}` : ''
    ctx += `${i + 1}. ${slotLine(c, 'Evo.CP@L50', c.evoCP.toLocaleString())}${evoNote}\n`
  })

  // ---- full collection list -------------------------------------------------
  ctx += `\nFULL COLLECTION (sorted by CP):\n`
  const sorted = [...enriched].sort((a, b) => (b.cp ?? 0) - (a.cp ?? 0)).slice(0, 120)
  for (const c of sorted) {
    const pct = c.ivPctVal?.toFixed(0) ?? ivPct(c.ivAttack, c.ivDefense, c.ivStamina).toFixed(0)
    const tags = [
      c.isShiny && '✨Shiny',
      c.isShadow && '👻Shadow',
      c.nickname && c.nickname !== c.pokemonName && `"${c.nickname}"`,
    ].filter(Boolean).join(' ')
    ctx += `${c.pokemonName} | #${String(c.pokemonId || '?').padStart(3,'0')} | CP ${c.cp ?? '?'} | Lv ${c.level ?? '?'} | IV ${c.ivAttack ?? '?'}/${c.ivDefense ?? '?'}/${c.ivStamina ?? '?'} (${pct}%)${tags ? ' | ' + tags : ''}\n`
  }
  if (enriched.length > 120) ctx += `…and ${enriched.length - 120} more Pokémon not shown\n`

  return ctx
}

// ---- message bubble ---------------------------------------------------------

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center mr-2 mt-0.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#58A6FF]" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-[#1F6FEB] text-white rounded-br-sm'
            : 'bg-[#21262D] border border-[#30363D] text-[#C9D1D9] rounded-bl-sm'}`}
      >
        {msg.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center mr-2 mt-0.5">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#58A6FF]" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      </div>
      <div className="bg-[#21262D] border border-[#30363D] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-[#8B949E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-[#8B949E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-[#8B949E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ---- main component ---------------------------------------------------------

const STORAGE_KEY = 'pokegosh_chat_messages'

export default function ChatPage() {
  const { data: collection = [] } = useCollection()
  const { data: pokedex = [] } = usePokedex()
  const [trainerLevel] = useTrainerLevel()

  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const collectionContext = useMemo(
    () => buildCollectionContext(collection, pokedex, trainerLevel),
    [collection, pokedex, trainerLevel]
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          collectionContext,
          trainerLevel,
        }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      setError(err.message || 'Failed to get response')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, messages, collectionContext, trainerLevel])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
    sessionStorage.removeItem(STORAGE_KEY)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const contextLine = collection.length
    ? `${collection.length} Pokémon · Trainer Lv ${trainerLevel}`
    : `No collection loaded · Trainer Lv ${trainerLevel}`

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-[#E6EDF3]">Chat with AI</h1>
          <p className="text-xs text-[#484F58] mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat history to save tokens"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363D] text-xs text-[#8B949E] hover:text-[#F85149] hover:border-[#F85149]/50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Chat
        </button>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-[#0D1117] rounded-xl border border-[#30363D] p-4"
           style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-8">
            <div className="w-14 h-14 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#58A6FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#C9D1D9]">Ask anything about your collection</p>
              <p className="text-xs text-[#484F58] mt-1 max-w-xs">
                Which Pokémon should I power up? Who's my best raid attacker? What's worth evolving?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {[
                'Who should I power up for raids?',
                'What are my best PvP options?',
                'Which duplicates should I transfer?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="text-xs text-left px-3 py-2 rounded-lg bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-[#C9D1D9] hover:border-[#58A6FF]/40 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 rounded-lg px-3 py-2">
              {error} — tap to retry
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 flex gap-2 mt-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your Pokémon GO collection…"
          disabled={loading}
          className="flex-1 bg-[#161B22] border border-[#30363D] rounded-xl px-4 py-3 text-sm text-[#C9D1D9]
                     placeholder-[#484F58] resize-none overflow-hidden
                     focus:outline-none focus:border-[#58A6FF] transition
                     disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1F6FEB] hover:bg-[#388BFD] text-white
                     flex items-center justify-center transition
                     disabled:opacity-40 disabled:cursor-not-allowed self-end"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-[#484F58] mt-2">
        Collection, rankings &amp; evolution potential always included · "Clear Chat" resets history
      </p>
    </div>
  )
}
