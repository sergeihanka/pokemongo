import axios from 'axios';

const POGO_API_BASE = import.meta.env.VITE_POGO_API_BASE || 'https://pogoapi.net/api/v1';

// Module-level cache Maps — data is static/rarely changes
const cache = {
  pokedex: null,
  pokemonStats: null,
  moves: null,
  shinyData: null,
  typeEffectiveness: null,
};

// Cache for individual Pokemon detail entries keyed by formId
const detailCache = new Map();

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
 * Fetch the slim PoGO Pokedex list from the Netlify function.
 * Returns an array that preserves all returned fields plus adds flat stat aliases.
 * Returns [] if the DB has not been seeded yet (HTTP 503).
 */
export async function fetchPokedex() {
  if (cache.pokedex) return cache.pokedex;

  let data;
  try {
    const response = await axios.get('/.netlify/functions/pokemon?action=list', {
      validateStatus: (status) => status < 600,
    });

    if (response.status === 503 && response.data?.seeded === false) {
      // DB not seeded yet — return empty list without caching so next call retries
      return [];
    }

    data = response.data;
  } catch (err) {
    // Network-level failure — bubble up so React Query can retry
    throw err;
  }

  const normalized = data.map((mon) => ({
    // Spread all returned fields
    ...mon,
    // Computed additions
    nameNormalized: normalizePokemonName(mon.names?.English ?? ''),
    // Flat stat aliases
    baseAttack: mon.stats?.attack ?? 0,
    baseDefense: mon.stats?.defense ?? 0,
    baseStamina: mon.stats?.stamina ?? 0,
  }));

  cache.pokedex = normalized;
  return normalized;
}

/**
 * Fetch a single Pokemon's full detail entry by formId.
 * Results are cached in detailCache.
 * @param {string} formId - The Pokemon form ID (e.g. "BULBASAUR")
 */
export async function fetchPokemonDetail(formId) {
  if (detailCache.has(formId)) return detailCache.get(formId);

  const { data } = await axios.get(
    `/.netlify/functions/pokemon?action=detail&formId=${encodeURIComponent(formId)}`
  );

  detailCache.set(formId, data);
  return data;
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

  const { data } = await axios.get('/.netlify/functions/pokemon?action=stats');

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

  const { data } = await axios.get('/.netlify/functions/pokemon?action=moves');
  const chargedData = [];

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

  const moves = Object.values(data).map((m) => normMove(m, 'fast'));

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

  const { data } = await axios.get('/.netlify/functions/pokemon?action=shiny');

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

  const { data } = await axios.get('/.netlify/functions/pokemon?action=types');

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
  // API wraps results in { data: [...], total, limit, skip }
  return Array.isArray(data) ? data : (data?.data ?? []);
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
  const { data } = await axios.put(`${COLLECTION_ENDPOINT}?id=${id}`, updates);
  return data;
}

/**
 * Delete a catch by ID.
 * @param {string} id - The catch document ID
 */
export async function deleteCatch(id) {
  const { data } = await axios.delete(`${COLLECTION_ENDPOINT}?id=${id}`);
  return data;
}

export async function deleteAllCatches() {
  const { data } = await axios.delete(`${COLLECTION_ENDPOINT}?all=true`);
  return data;
}
