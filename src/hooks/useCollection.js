import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCatchCollection,
  addToCatchCollection,
  updateCatch,
  deleteCatch,
  deleteAllCatches,
} from '../services/api.js';

const COLLECTION_QUERY_KEY = ['collection'];

// ---------------------------------------------------------------------------
// Fetch Collection
// ---------------------------------------------------------------------------

/**
 * Fetches all caught Pokemon in the user's collection.
 * Returns an array of catch objects from the Netlify function.
 */
export function useCollection() {
  return useQuery({
    queryKey: COLLECTION_QUERY_KEY,
    queryFn: getCatchCollection,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Add to Collection
// ---------------------------------------------------------------------------

/**
 * Mutation to add a new caught Pokemon to the collection.
 * Automatically invalidates the collection query on success.
 *
 * Usage:
 *   const { mutate, isPending } = useAddToCollection();
 *   mutate({ pokemonName, ivAtk, ivDef, ivStam, cp, level, ... });
 */
export function useAddToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (catchData) => addToCatchCollection(catchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Update a Catch
// ---------------------------------------------------------------------------

/**
 * Mutation to update an existing catch by ID.
 * Automatically invalidates the collection query on success.
 *
 * Usage:
 *   const { mutate, isPending } = useUpdateCatch();
 *   mutate({ id: 'abc123', updates: { ivAtk: 15, notes: '...' } });
 *
 * @param {string} [id] - Optional: if provided, the mutation function only
 *   requires the updates object (the id is bound from the hook argument).
 *   If omitted, pass { id, updates } to mutate().
 */
export function useUpdateCatch(id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => {
      // Support both calling patterns:
      //   useUpdateCatch(id) → mutate(updates)
      //   useUpdateCatch()   → mutate({ id, updates })
      if (id !== undefined) {
        return updateCatch(id, payload);
      }
      const { id: payloadId, updates } = payload;
      return updateCatch(payloadId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Delete a Catch
// ---------------------------------------------------------------------------

/**
 * Mutation to delete a caught Pokemon from the collection by ID.
 * Automatically invalidates the collection query on success.
 *
 * Usage:
 *   const { mutate, isPending } = useDeleteCatch();
 *   mutate('abc123');
 */
export function useDeleteCatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (catchId) => deleteCatch(catchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Delete All Catches
// ---------------------------------------------------------------------------

export function useDeleteAllCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllCatches,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTION_QUERY_KEY });
    },
  });
}
