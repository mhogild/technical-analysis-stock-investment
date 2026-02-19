/**
 * Simple in-memory cache with TTL support.
 * On Vercel serverless functions, this cache persists within warm instances.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class StockCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private getKey(symbol: string, dataType: string): string {
    return `${symbol.toUpperCase()}:${dataType}`;
  }

  get<T>(symbol: string, dataType: string): T | null {
    const key = this.getKey(symbol, dataType);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(symbol: string, dataType: string, data: T, ttlMs: number): void {
    const key = this.getKey(symbol, dataType);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(symbol: string, dataType: string): void {
    const key = this.getKey(symbol, dataType);
    this.cache.delete(key);
  }

  invalidateAll(symbol: string): void {
    const prefix = `${symbol.toUpperCase()}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const stockCache = new StockCache();
