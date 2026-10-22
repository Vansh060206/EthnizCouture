interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxEntries: number = 2000) {
    this.maxEntries = maxEntries;

    // Background cleanup of expired entries every 60 seconds
    const cleanupInterval = setInterval(() => {
      this.evictExpired();
    }, 60000);

    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order in Map
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 60, tags: string[] = []): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
        this.evictions++;
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt, tags });

    // Index tags for O(1) tag-based invalidation
    for (const tag of tags) {
      let keysForTag = this.tagIndex.get(tag);
      if (!keysForTag) {
        keysForTag = new Set<string>();
        this.tagIndex.set(tag, keysForTag);
      }
      keysForTag.add(key);
    }
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        const keysForTag = this.tagIndex.get(tag);
        if (keysForTag) {
          keysForTag.delete(key);
          if (keysForTag.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
      this.cache.delete(key);
    }
  }

  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of Array.from(keys)) {
      this.cache.delete(key);
      count++;
    }
    this.tagIndex.delete(tag);
    return count;
  }

  flush(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Math.round((this.hits / total) * 10000) / 100 : 0,
      evictions: this.evictions,
      indexedTagsCount: this.tagIndex.size
    };
  }
}

export const cacheService = new CacheService(3000);
