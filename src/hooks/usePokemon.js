import { useQuery } from '@tanstack/react-query';
import {
  fetchPokedex,
  fetchPokemonStats,
  fetchMoves,
  fetchShinyData,
  fetchTypeEffectiveness,
} from '../services/api.js';

// Stale time: 1 hour — Pokedex data is essentially static
const POKEDEX_STALE_TIME = 1000 * 60 * 60;
// Stale time: 30 minutes for auxiliary data
const AUX_STALE_TIME = 1000 * 60 * 30;

// ---------------------------------------------------------------------------
// Full Pokedex
// ---------------------------------------------------------------------------

/**
 * Fetches and caches the full PoGO Pokedex list.
 * Returns an array of normalized Pokemon objects.
 */
export function usePokedex() {
  return useQuery({
    queryKey: ['pokedex'],
    queryFn: fetchPokedex,
    staleTime: POKEDEX_STALE_TIME,
    gcTime: POKEDEX_STALE_TIME * 2,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Single Pokemon Detail
// ---------------------------------------------------------------------------

/**
 * Finds a specific Pokemon by name from the cached Pokedex.
 * Performs a case-insensitive substring match on normalized names.
 * @param {string|null|undefined} name - The Pokemon name to look up
 */
export function usePokemonDetail(name) {
  return useQuery({
    queryKey: ['pokedex', 'detail', name],
    queryFn: async () => {
      const pokedex = await fetchPokedex();
      if (!name) return null;

      const searchName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Exact match first
      let match = pokedex.find((p) => p.nameNormalized === searchName);

      // Fallback: partial match
      if (!match) {
        match = pokedex.find(
          (p) =>
            p.nameNormalized.includes(searchName) ||
            searchName.includes(p.nameNormalized)
        );
      }

      return match ?? null;
    },
    enabled: Boolean(name),
    staleTime: POKEDEX_STALE_TIME,
    gcTime: POKEDEX_STALE_TIME * 2,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Pokemon Stats  (pogoapi.net)
// ---------------------------------------------------------------------------

/**
 * Fetches base stats for all Pokemon from pogoapi.net.
 * Returns a Map keyed by dex number.
 */
export function usePokemonStats() {
  return useQuery({
    queryKey: ['pokemonStats'],
    queryFn: fetchPokemonStats,
    staleTime: POKEDEX_STALE_TIME,
    gcTime: POKEDEX_STALE_TIME * 2,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Shiny Data
// ---------------------------------------------------------------------------

/**
 * Fetches shiny availability data.
 * Returns a Set of normalized Pokemon names that have shiny variants.
 */
export function useShinyData() {
  return useQuery({
    queryKey: ['shinyData'],
    queryFn: fetchShinyData,
    staleTime: AUX_STALE_TIME,
    gcTime: AUX_STALE_TIME * 2,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

/**
 * Fetches all fast and charged moves.
 * Returns an array of normalized move objects.
 */
export function useMoves() {
  return useQuery({
    queryKey: ['moves'],
    queryFn: fetchMoves,
    staleTime: AUX_STALE_TIME,
    gcTime: AUX_STALE_TIME * 2,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Type Effectiveness
// ---------------------------------------------------------------------------

/**
 * Fetches the type effectiveness chart.
 * Returns a nested object: { attackingType: { defendingType: multiplier } }
 */
export function useTypeEffectiveness() {
  return useQuery({
    queryKey: ['typeEffectiveness'],
    queryFn: fetchTypeEffectiveness,
    staleTime: POKEDEX_STALE_TIME,
    gcTime: POKEDEX_STALE_TIME * 2,
    retry: 2,
  });
}
