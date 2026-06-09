import axios from 'axios';

const POGO_API_BASE = import.meta.env.VITE_POGO_API_BASE || 'https://pogoapi.net/api/v1';
const POKEDEX_API_BASE = import.meta.env.VITE_POKEDEX_API_BASE || 'https://pokemon-go-api.github.io/pokemon-go-api/api';

// Module-level cache Maps — data is static/rarely changes
const cache = {
  pokedex: null,
  pokemonStats: null,
  moves: null,
  shinyData: null,
  typeEffectiveness: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTypeName(rawType) {
  if (!rawType) return null;
  const clean = rawType.replace('POKEMON_TYPE_', '').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function normalizePokemonName(rawName) {
  if (!rawName) return '';
  return rawName.toLowerCase().replace(/\s+/g, '_');
}

// ---------------------------------------------------------------------------
// Pokedex API  (pokemon-go-api.github.io)
// ---------------------------------------------------------------------------

/**
 * Fetch the full PoGO Pokedex.
 * Returns an array of normalized Pokemon objects.
 */
export async function fetchPokedex() {
  if (cache.pokedex) return cache.pokedex;

  const { data } = await axios.get(`${POKEDEX_API_BASE}/pokedex.json`);

  const normalized = data.map((mon) => ({
    dexNr: mon.dexNr,
    id: mon.id ?? String(mon.dexNr),
    formId: mon.formId ?? null,
    name: mon.names?.English ?? mon.id ?? String(mon.dexNr),
    nameNormalized: normalizePokemonName(mon.names?.English ?? ''),
    primaryType: normalizeTypeName(mon.primaryType?.names?.English ?? mon.primaryType?.type ?? ''),
    secondaryType: normalizeTypeName(
      mon.secondaryType?.names?.English ?? mon.secondaryType?.type ?? null
    ),
    baseAttack: mon.stats?.baseAttack ?? 0,
    baseDefense: mon.stats?.baseDefense ?? 0,
    baseStamina: mon.stats?.baseStamina ?? 0,
    evolutions: (mon.evolutions ?? []).map((evo) => ({
      id: evo.id,
      formId: evo.formId ?? null,
      name: evo.names?.English ?? evo.id ?? '',
      candyCost: evo.candyCost ?? 0,
    })),
    megaEvolutions: (mon.megaEvolutions ?? []).map((mega) => ({
      id: mega.id,
      name: mega.names?.English ?? mega.id ?? '',
      baseAttack: mega.stats?.baseAttack ?? 0,
      baseDefense: mega.stats?.baseDefense ?? 0,
      baseStamina: mega.stats?.baseStamina ?? 0,
    })),
    shadowForm: mon.shadowForm
      ? {
          baseAttack: mon.shadowForm.stats?.baseAttack ?? null,
          baseDefense: mon.shadowForm.stats?.baseDefense ?? null,
          baseStamina: mon.shadowForm.stats?.baseStamina ?? null,
        }
      : null,
    quickMoves: mon.quickMoves ?? [],
    cinematicMoves: mon.cinematicMoves ?? [],
    imageUrl: mon.assets?.image ?? null,
    shinyImageUrl: mon.assets?.shinyImage ?? null,
  }));

  cache.pokedex = normalized;
  return normalized;
}

// ---------------------------------------------------------------------------
// Pokemon Stats  (pogoapi.net)
// ---------------------------------------------------------------------------

/**
 * Fetch base stats from pogoapi.net.
 * Returns a Map keyed by pokemon_id (number).
 */
export async function fetchPokemonStats() {
  if (cache.pokemonStats) return cache.pokemonStats;

  const { data } = await axios.get(`${POGO_API_BASE}/pokemon_stats.json`);

  // The response is an object keyed by string dex number
  const statsMap = new Map();
  for (const [key, mon] of Object.entries(data)) {
    statsMap.set(Number(key), {
      pokemonId: mon.pokemon_id,
      pokemonName: mon.pokemon_name,
      nameNormalized: normalizePokemonName(mon.pokemon_name),
      baseAttack: mon.base_attack,
      baseDefense: mon.base_defense,
      baseStamina: mon.base_stamina,
    });
  }

  cache.pokemonStats = statsMap;
  return statsMap;
}

// ---------------------------------------------------------------------------
// Moves  (pogoapi.net)
// ---------------------------------------------------------------------------

/**
 * Fetch all moves.
 * Returns an array of move objects.
 */
export async function fetchMoves() {
  if (cache.moves) return cache.moves;

  const { data } = await axios.get(`${POGO_API_BASE}/fast_moves.json`);
  const { data: chargedData } = await axios.get(`${POGO_API_BASE}/charged_moves.json`);

  const normMove = (move, type) => ({
    moveId: move.move_id ?? move.id,
    name: move.name,
    type: normalizeTypeName(move.type),
    moveType: type,
    power: move.power ?? 0,
    energy: move.energy ?? move.energy_delta ?? 0,
    duration: move.duration_ms ?? move.cooldown_ms ?? 0,
    damageWindowStart: move.damage_window_start_ms ?? null,
    damageWindowEnd: move.damage_window_end_ms ?? null,
    dps: move.dps ?? null,
    eps: move.eps ?? null,
  });

  const moves = [
    ...Object.values(data).map((m) => normMove(m, 'fast')),
    ...Object.values(chargedData).map((m) => normMove(m, 'charged')),
  ];

  cache.moves = moves;
  return moves;
}

// ---------------------------------------------------------------------------
// Shiny Data  (pogoapi.net)
// ---------------------------------------------------------------------------

/**
 * Fetch shiny availability.
 * Returns a Set of pokemon names (lowercased, underscored) that have shinies.
 */
export async function fetchShinyData() {
  if (cache.shinyData) return cache.shinyData;

  const { data } = await axios.get(`${POGO_API_BASE}/shiny_pokemon.json`);

  // Response shape varies — handle both array and object forms
  const shinySet = new Set();
  const entries = Array.isArray(data) ? data : Object.values(data);
  for (const entry of entries) {
    const name = entry.pokemon_name ?? entry.name ?? '';
    if (name) shinySet.add(normalizePokemonName(name));
  }

  cache.shinyData = shinySet;
  return shinySet;
}

// ---------------------------------------------------------------------------
// Type Effectiveness  (pogoapi.net)
// ---------------------------------------------------------------------------

/**
 * Fetch type effectiveness chart.
 * Returns a nested object: { attackingType: { defendingType: multiplier } }
 */
export async function fetchTypeEffectiveness() {
  if (cache.typeEffectiveness) return cache.typeEffectiveness;

  const { data } = await axios.get(`${POGO_API_BASE}/type_effectiveness.json`);

  cache.typeEffectiveness = data;
  return data;
}

// ---------------------------------------------------------------------------
// Catch Collection  (Netlify Functions)
// ---------------------------------------------------------------------------

const COLLECTION_ENDPOINT = '/.netlify/functions/collection';

/**
 * Fetch all caught Pokemon in the user's collection.
 */
export async function getCatchCollection() {
  const { data } = await axios.get(COLLECTION_ENDPOINT);
  return data;
}

/**
 * Add a new caught Pokemon to the collection.
 * @param {Object} catchData - The Pokemon catch data to save
 */
export async function addToCatchCollection(catchData) {
  const { data } = await axios.post(COLLECTION_ENDPOINT, catchData);
  return data;
}

/**
 * Update an existing catch by ID.
 * @param {string} id - The catch document ID
 * @param {Object} updates - Fields to update
 */
export async function updateCatch(id, updates) {
  const { data } = await axios.put(`${COLLECTION_ENDPOINT}/${id}`, updates);
  return data;
}

/**
 * Delete a catch by ID.
 * @param {string} id - The catch document ID
 */
export async function deleteCatch(id) {
  const { data } = await axios.delete(`${COLLECTION_ENDPOINT}/${id}`);
  return data;
}
