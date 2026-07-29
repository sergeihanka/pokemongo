import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePokedex } from '../hooks/usePokemon'
import PokemonCard from '../components/Pokemon/PokemonCard'
import IVInput from '../components/IV/IVInput'
import IVAnalysis from '../components/IV/IVAnalysis'
import { RARITY_TIERS } from '../constants/rarityData'

// All type names supported by Pokemon GO
const TYPES = [
  'All', 'Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting',
  'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 'Normal',
  'Poison', 'Psychic', 'Rock', 'Steel', 'Water',
]

const TYPE_COLORS = {
  Bug: 'bg-lime-700 hover:bg-lime-600',
  Dark: 'bg-neutral-700 hover:bg-neutral-600',
  Dragon: 'bg-indigo-700 hover:bg-indigo-600',
  Electric: 'bg-yellow-600 hover:bg-yellow-500',
  Fairy: 'bg-pink-600 hover:bg-pink-500',
  Fighting: 'bg-orange-700 hover:bg-orange-600',
  Fire: 'bg-orange-600 hover:bg-orange-500',
  Flying: 'bg-sky-600 hover:bg-sky-500',
  Ghost: 'bg-purple-800 hover:bg-purple-700',
  Grass: 'bg-green-600 hover:bg-green-500',
  Ground: 'bg-amber-700 hover:bg-amber-600',
  Ice: 'bg-cyan-600 hover:bg-cyan-500',
  Normal: 'bg-stone-600 hover:bg-stone-500',
  Poison: 'bg-purple-600 hover:bg-purple-500',
  Psychic: 'bg-pink-700 hover:bg-pink-600',
  Rock: 'bg-yellow-800 hover:bg-yellow-700',
  Steel: 'bg-slate-600 hover:bg-slate-500',
  Water: 'bg-blue-600 hover:bg-blue-500',
}

const PAGE_SIZE = 50

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-[#161B22] border border-[#30363D] overflow-hidden animate-pulse">
      <div className="h-28 bg-[#21262D]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[#30363D] rounded w-3/4" />
        <div className="h-3 bg-[#30363D] rounded w-1/2" />
        <div className="flex gap-1 mt-2">
          <div className="h-5 w-12 bg-[#30363D] rounded-full" />
          <div className="h-5 w-12 bg-[#30363D] rounded-full" />
        </div>
      </div>
    </div>
  )
}

function QuickLookupTab() {
  const { data: pokedex = [] } = usePokedex()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [ivs, setIvs] = useState({ attack: 15, defense: 15, stamina: 15 })
  const handleIVChange = (field, value) => setIvs(prev => ({
    ...prev,
    [field === 'ivAtk' ? 'attack' : field === 'ivDef' ? 'defense' : 'stamina']: value,
  }))

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    return pokedex
      .filter(p => p.names?.English?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, pokedex])

  function handleSelect(pokemon) {
    setSelected(pokemon)
    setQuery(pokemon.names?.English || '')
    setShowDropdown(false)
  }

  function handleQueryChange(e) {
    setQuery(e.target.value)
    setSelected(null)
    setShowDropdown(true)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#E6EDF3]">Quick IV Lookup</h2>
        <p className="text-sm text-[#8B949E]">
          Search for a Pokemon and enter its IVs to instantly see gym and PVP ratings.
        </p>

        {/* Pokemon search */}
        <div className="relative">
          <label className="block text-xs font-medium text-[#8B949E] mb-1 uppercase tracking-wider">
            Pokemon
          </label>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search Pokemon name..."
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-4 py-2.5
                       text-[#C9D1D9] placeholder-[#484F58] focus:outline-none
                       focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF] transition"
          />
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-[#161B22] border border-[#30363D]
                           rounded-lg shadow-xl overflow-hidden">
              {suggestions.map(p => (
                <li key={p.dexNr}>
                  <button
                    onMouseDown={() => handleSelect(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                               hover:bg-[#21262D] transition text-[#C9D1D9]"
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNr}.png`}
                      alt=""
                      className="w-8 h-8 object-contain"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    <span className="font-medium">{p.names?.English}</span>
                    <span className="ml-auto text-xs text-[#484F58]">#{String(p.dexNr).padStart(3, '0')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* IV inputs */}
        <IVInput
          ivAtk={ivs.attack}
          ivDef={ivs.defense}
          ivStam={ivs.stamina}
          onChange={handleIVChange}
        />
      </div>

      {/* Analysis output */}
      {selected && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selected.dexNr}.png`}
              alt={selected.names?.English}
              className="w-16 h-16 object-contain"
            />
            <div>
              <h3 className="text-xl font-bold text-[#E6EDF3]">{selected.names?.English}</h3>
              <p className="text-sm text-[#8B949E]">
                #{String(selected.dexNr).padStart(3, '0')} &bull;{' '}
                ATK {selected.stats?.baseAttack} / DEF {selected.stats?.baseDefense} / STA {selected.stats?.baseStamina}
              </p>
            </div>
          </div>
          <IVAnalysis
            pokemon={selected}
            ivAtk={ivs.attack}
            ivDef={ivs.defense}
            ivStam={ivs.stamina}
          />
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { data: pokedex = [], isLoading, isError } = usePokedex()

  const [tab, setTab] = useState('browse') // 'browse' | 'lookup'
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedRarity, setSelectedRarity] = useState('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    let list = pokedex
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.names?.English?.toLowerCase().includes(q) ||
        String(p.dexNr).padStart(3, '0').includes(q)
      )
    }
    if (selectedType !== 'All') {
      list = list.filter(p =>
        p.primaryType?.names?.English === selectedType ||
        p.secondaryType?.names?.English === selectedType
      )
    }
    if (selectedRarity !== 'All') {
      list = list.filter(p => p.rarity === selectedRarity)
    }
    return list
  }, [pokedex, search, selectedType, selectedRarity])

  const visible = filtered.slice(0, visibleCount)

  const handleLoadMore = useCallback(() => {
    setVisibleCount(c => c + PAGE_SIZE)
  }, [])

  const handleSearchChange = useCallback(e => {
    setSearch(e.target.value)
    setVisibleCount(PAGE_SIZE)
  }, [])

  const handleTypeSelect = useCallback(type => {
    setSelectedType(type)
    setVisibleCount(PAGE_SIZE)
  }, [])

  const handleRaritySelect = useCallback(rarity => {
    setSelectedRarity(rarity)
    setVisibleCount(PAGE_SIZE)
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E6EDF3]">Pokemon GO IV Tracker</h1>
        <p className="text-sm text-[#8B949E] mt-1">
          Browse the Pokedex, calculate IVs, and track your collection.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#161B22] border border-[#30363D] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('browse')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition ${
            tab === 'browse'
              ? 'bg-[#238636] text-white shadow'
              : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
          }`}
        >
          Browse Pokedex
        </button>
        <button
          onClick={() => setTab('lookup')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition ${
            tab === 'lookup'
              ? 'bg-[#238636] text-white shadow'
              : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
          }`}
        >
          Quick IV Lookup
        </button>
      </div>

      {tab === 'lookup' && <QuickLookupTab />}

      {tab === 'browse' && (
        <>
          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484F58]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name or Pokedex number..."
              className="w-full bg-[#161B22] border border-[#30363D] rounded-xl pl-10 pr-4 py-3
                         text-[#C9D1D9] placeholder-[#484F58] focus:outline-none
                         focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF] transition"
            />
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map(type => {
              const isActive = selectedType === type
              const colorClass = type === 'All'
                ? (isActive ? 'bg-[#238636] text-white' : 'bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#30363D]')
                : isActive
                  ? `${TYPE_COLORS[type] || 'bg-[#30363D]'} text-white`
                  : 'bg-[#21262D] text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#30363D]'
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                    isActive ? 'border-transparent' : 'border-[#30363D]'
                  } ${colorClass}`}
                >
                  {type}
                </button>
              )
            })}
          </div>

          {/* Rarity filter chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-[#484F58] uppercase tracking-wider font-semibold">Rarity:</span>
            <button
              onClick={() => handleRaritySelect('All')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                selectedRarity === 'All'
                  ? 'bg-[#238636] text-white border-transparent'
                  : 'bg-[#21262D] text-[#8B949E] border-[#30363D] hover:text-[#C9D1D9] hover:bg-[#30363D]'
              }`}
            >
              All
            </button>
            {Object.entries(RARITY_TIERS).sort((a, b) => a[1].order - b[1].order).map(([key, tier]) => (
              <button
                key={key}
                onClick={() => handleRaritySelect(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                  selectedRarity === key
                    ? `${tier.color} ${tier.bg}`
                    : 'bg-[#21262D] text-[#8B949E] border-[#30363D] hover:text-[#C9D1D9] hover:bg-[#30363D]'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-[#8B949E]">
              {filtered.length === 0
                ? 'No Pokemon found.'
                : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} Pokemon`}
              {pokedex.length > 0 && selectedType === 'All' && !search && (
                <span className="ml-1">({pokedex.length} total)</span>
              )}
            </p>
          )}

          {/* Error state */}
          {isError && (
            <div className="rounded-xl bg-[#161B22] border border-[#F85149]/40 p-6 text-center">
              <p className="text-[#F85149] font-medium">Failed to load Pokedex data.</p>
              <p className="text-sm text-[#8B949E] mt-1">Please check your connection and try again.</p>
            </div>
          )}

          {/* Pokemon grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {isLoading
              ? Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)
              : visible.map(pokemon => (
                  <div
                    key={pokemon.dexNr}
                    className="cursor-pointer"
                    onClick={() => navigate(`/pokemon/${pokemon.names?.English?.toLowerCase()}`)}
                  >
                    <PokemonCard pokemon={pokemon} />
                  </div>
                ))
            }
          </div>

          {/* Load more */}
          {!isLoading && visibleCount < filtered.length && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                className="px-8 py-3 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D]
                           hover:border-[#8B949E] text-[#C9D1D9] rounded-xl font-medium
                           transition text-sm"
              >
                Load More
                <span className="ml-2 text-[#8B949E]">
                  ({filtered.length - visibleCount} remaining)
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
