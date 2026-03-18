export interface CacheEntry<T> {
  data: T;
  refreshedAt: string;
  expiresAt: number;
  lastSuccessAt: string;
}

export interface ContentPerformanceCache<T = unknown> {
  get(now: Date): CacheEntry<T> | null;
  set(entry: CacheEntry<T>): void;
  clear(): void;
}

export function createContentPerformanceCache<T = unknown>(ttlMs = 60 * 60 * 1000): ContentPerformanceCache<T> {
  let entry: CacheEntry<T> | null = null;

  return {
    get(now: Date) {
      if (!entry) return null;
      if (now.getTime() > entry.expiresAt) return null;
      return entry;
    },
    set(next: CacheEntry<T>) {
      entry = {
        ...next,
        expiresAt: new Date(next.refreshedAt).getTime() + ttlMs,
      };
    },
    clear() {
      entry = null;
    },
  };
}
