/**
 * API Cache Utility for API Gateway
 * 
 * Provides caching functionality for API key validation and client user IDs 
 * to reduce load on downstream services and improve response times.
 */


// Default Cache TTLs in milliseconds (e.g., 5 minutes)
const DEFAULT_API_KEY_CACHE_TTL_MS = process.env.API_KEY_CACHE_TTL_MS 
  ? parseInt(process.env.API_KEY_CACHE_TTL_MS, 10) 
  : 5 * 60 * 1000;

const DEFAULT_CLIENT_USER_CACHE_TTL_MS = process.env.CLIENT_USER_CACHE_TTL_MS
  ? parseInt(process.env.CLIENT_USER_CACHE_TTL_MS, 10)
  : 5 * 60 * 1000;

console.log(`[ApiCache] Initializing with API Key TTL: ${DEFAULT_API_KEY_CACHE_TTL_MS}ms, Client User TTL: ${DEFAULT_CLIENT_USER_CACHE_TTL_MS}ms`);

// Interface for cached items, including an expiry timestamp
interface CachedItem<T> {
  data: T;
  expires: number;
}

/**
 * In-memory cache for API Gateway authentication data.
 * Uses separate Maps for API key validation and client user IDs.
 */
class ApiCache {
  private apiKeyCache = new Map<string, CachedItem<string>>(); // apiKey -> platformUserId
  private clientUserCache = new Map<string, CachedItem<string>>(); // compositeKey -> clientUserId (internal UUID)

  /**
   * Creates a composite key for the client user cache.
   * @param platformUserId The ID of the platform user.
   * @param platformClientUserId The external client user ID provided in the header.
   * @returns A unique string key for the cache.
   */
  private createClientUserCacheKey(platformUserId: string, platformClientUserId: string): string {
    return `${platformUserId}:${platformClientUserId}`;
  }

  /**
   * Retrieves the platform user ID associated with an API key from the cache.
   * Returns undefined if the key is not found or the cached item has expired.
   * Handles cache expiration internally.
   * @param platformApiKey The platform API key.
   * @returns The cached platform user ID (string) or undefined.
   */
  getPlatformUserId(platformApiKey: string): string | undefined {
    const cached = this.apiKeyCache.get(platformApiKey);
    if (!cached || cached.expires < Date.now()) {
      if (cached) {
        console.log(`[ApiCache] Platform API key will be cached because cache expired`);
        this.apiKeyCache.delete(platformApiKey); // Remove expired entry
      } else {
        console.log(`[ApiCache] Platform API key will be cached for the first time`); // Optional: Log misses
      }
      return undefined;
    }
    return cached.data;
  }

  /**
   * Stores an API key and its corresponding platform user ID in the cache.
   * @param apiKey The platform API key.
   * @param platformUserId The platform user ID (string) to cache.
   */
  setPlatformUserId(apiKey: string, platformUserId: string): void {
    const expires = Date.now() + DEFAULT_API_KEY_CACHE_TTL_MS;
    console.log(`[ApiCache] Caching platform user ID ${platformUserId} for API key starting with ${apiKey.substring(0, 5)}... until ${new Date(expires).toISOString()}`);
    this.apiKeyCache.set(apiKey, { data: platformUserId, expires });
  }

  /**
   * Retrieves the internal client user ID (UUID) from the cache using platform user ID and external client ID.
   * Returns undefined if the key is not found or the cached item has expired.
   * Handles cache expiration internally.
   * @param platformUserId The ID of the platform user.
   * @param platformClientUserId The external client user ID provided in the header.
   * @returns The cached internal client user ID (string) or undefined.
   */
  getClientUserId(platformUserId: string, platformClientUserId: string): string | undefined {
    const key = this.createClientUserCacheKey(platformUserId, platformClientUserId);
    const cached = this.clientUserCache.get(key);
    if (!cached || cached.expires < Date.now()) {
      if (cached) {
        console.log(`[ApiCache] ClientUserId will be cached because cache expired`);
        this.clientUserCache.delete(key); // Remove expired entry
      } else {
        console.log(`[ApiCache] ClientUserId will be cached for the first time`); // Optional: Log misses
      }
      return undefined;
    }
    return cached.data;
  }

  /**
   * Stores the internal client user ID (UUID) in the cache.
   * @param platformUserId The ID of the platform user.
   * @param platformClientUserId The external client user ID provided in the header.
   * @param clientUserId The internal client user ID (UUID) to cache.
   */
  setClientUserId(platformUserId: string, platformClientUserId: string, clientUserId: string): void {
    const key = this.createClientUserCacheKey(platformUserId, platformClientUserId);
    const expires = Date.now() + DEFAULT_CLIENT_USER_CACHE_TTL_MS;
    console.log(`[ApiCache] Caching client user ID ${clientUserId} for key ${key} until ${new Date(expires).toISOString()}`);
    this.clientUserCache.set(key, { data: clientUserId, expires });
  }

  // Optional: Methods to invalidate or clear cache if needed later
  invalidateApiKey(apiKey: string): void {
    this.apiKeyCache.delete(apiKey);
  }

  invalidateClientUser(platformUserId: string, platformClientUserId: string): void {
    const key = this.createClientUserCacheKey(platformUserId, platformClientUserId);
    this.clientUserCache.delete(key);
  }

  clearAll(): void {
    this.apiKeyCache.clear();
    this.clientUserCache.clear();
    console.log('[ApiCache] Cleared all caches.');
  }
}

// Export a singleton instance of the cache
export const apiCache = new ApiCache(); 