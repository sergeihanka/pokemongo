import { useQuery } from '@tanstack/react-query';
import {
  fetchPokedex,
  fetchPokemonDetail,
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
 * Fetches full detail for a single Pokemon by name.
 * First resolves the formId from the cached slim list, then fetches the full
 * entry via the detail endpoint. Falls back to the slim list entry if the
 * detail fetch fails.
 * @param {string|null|undefined} name - The Pokemon name to look up
 */
export function usePokemonDetail(name) {
  return useQuery({
    queryKey: ['pokedex', 'detail', name],
    queryFn: async () => {
      if (!name) return null;

      const searchName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Step 1: find the slim entry in the cached list to get the formId
      const pokedex = await fetchPokedex();

      let slimMatch = pokedex.find((p) => p.nameNormalized === searchName);

      if (!slimMatch) {
        slimMatch = pokedex.find(
          (p) =>
            p.nameNormalized.includes(searchName) ||
            searchName.includes(p.nameNormalized)
        );
      }

      if (!slimMatch?.formId) return slimMatch ?? null;

      // Step 2: fetch the full detail entry using the formId
      try {
        return await fetchPokemonDetail(slimMatch.formId);
      } catch {
        // Detail fetch failed — fall back to the slim list entry
        return slimMatch;
      }
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
