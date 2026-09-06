export const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.error("Failed to set cache for key:", key, e);
  }
}

export function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const item: CacheItem<T> = JSON.parse(cached);
    if (Date.now() - item.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null; // Expired
    }
    
    return item.data;
  } catch (e) {
    console.error("Failed to get cache for key:", key, e);
    return null;
  }
}

export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.removeItem(key);
  } else {
    localStorage.clear();
  }
}
