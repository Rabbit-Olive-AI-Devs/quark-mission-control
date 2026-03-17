type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

export function cachedSync<T>(key: string, ttlMs: number, fn: () => T): T {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.value;
  const value = fn();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function cachedAsync<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return Promise.resolve(entry.value);
  return fn().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}
