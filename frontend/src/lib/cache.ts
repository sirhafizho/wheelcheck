/**
 * Simple in-memory + sessionStorage cache with TTL and stale-while-revalidate.
 *
 * - Cached responses are served instantly on repeat calls.
 * - After TTL expires, stale data is returned immediately while a background
 *   revalidation runs (SWR pattern).
 * - sessionStorage persists cache across page navigations within the same tab.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// TTL presets (milliseconds)
export const CACHE_TTL = {
  FILTERS: 10 * 60 * 1000,  // 10 minutes — filter options rarely change
  PLACE_DETAIL: 5 * 60 * 1000, // 5 minutes — place data is fairly stable
  PLACE_LIST: 60 * 1000,    // 1 minute — listings refresh on navigation
  FAVORITES: 2 * 60 * 1000, // 2 minutes — user's own favorites
  REVIEWS: 3 * 60 * 1000,   // 3 minutes — reviews for a place
  COMMENTS: 2 * 60 * 1000,  // 2 minutes — comments for a place
} as const;

function getFromStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`wc_cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function setInStorage<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`wc_cache_${key}`, JSON.stringify(entry));
  } catch { /* quota exceeded — skip */ }
}

function removeFromStorage(key: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`wc_cache_${key}`);
  } catch { /* ignore */ }
}

export function getCached<T>(key: string): { data: T; fresh: boolean } | null {
  // Check memory first
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    const age = Date.now() - memEntry.timestamp;
    if (age < memEntry.ttl * 2) {
      // Within 2x TTL = usable (fresh if within TTL, stale otherwise)
      return { data: memEntry.data, fresh: age < memEntry.ttl };
    }
    // Too old — evict
    memoryCache.delete(key);
  }

  // Fall back to sessionStorage
  const storageEntry = getFromStorage<T>(key);
  if (storageEntry) {
    const age = Date.now() - storageEntry.timestamp;
    if (age < storageEntry.ttl * 2) {
      // Promote back to memory
      memoryCache.set(key, storageEntry);
      return { data: storageEntry.data, fresh: age < storageEntry.ttl };
    }
    removeFromStorage(key);
  }

  return null;
}

export function setCache<T>(key: string, data: T, ttl: number) {
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
  memoryCache.set(key, entry as CacheEntry<unknown>);
  setInStorage(key, entry);
}

export function invalidateCache(keyPrefix: string) {
  // Invalidate memory
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
  // Invalidate sessionStorage
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(`wc_cache_${keyPrefix}`)) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => sessionStorage.removeItem(k));
}

/**
 * Fetch with cache. Returns cached data instantly if available,
 * and revalidates in background if stale.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = getCached<T>(key);

  if (cached) {
    if (!cached.fresh) {
      // Stale — revalidate in background (fire-and-forget)
      fetcher()
        .then((data) => setCache(key, data, ttl))
        .catch(() => {}); // keep stale data on error
    }
    return cached.data;
  }

  // No cache — fetch and cache
  const data = await fetcher();
  setCache(key, data, ttl);
  return data;
}
