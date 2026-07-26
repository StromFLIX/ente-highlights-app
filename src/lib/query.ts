import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

/** Bump to invalidate every persisted cache (e.g. after a response shape change). */
const CACHE_BUSTER = 'v2';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Query keys worth keeping on disk so a cold start renders instantly instead of
 * showing a spinner while the network round-trips. Previews and cluster lookups
 * are deliberately excluded: they are large, ephemeral and cheap to re-run.
 */
const PERSISTED_KEYS = new Set(['saved', 'saved-items', 'people', 'terms', 'config', 'sync']);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying a 4xx just burns time; retry transient failures only.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.kind === 'auth' || error.kind === 'http')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      staleTime: 30_000,
      // Must be >= the persister maxAge, otherwise restored entries are
      // garbage-collected before they can be used.
      gcTime: MAX_AGE_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'eh_query_cache',
  throttleTime: 2_000,
});

export const persistOptions = {
  persister,
  maxAge: MAX_AGE_MS,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && PERSISTED_KEYS.has(String(query.queryKey[0])),
  },
};

/** Drop both the in-memory and on-disk cache (used on sign-out). */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
