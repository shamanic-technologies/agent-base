/**
 * Token Cache Utility
 * 
 * Provides caching functionality for JWT tokens to reduce load on auth service
 * and improve response times for token validation
 */
import { User } from '../types';

// Cache TTL in milliseconds (5 minutes)
const TOKEN_CACHE_TTL = 5 * 60 * 1000;

interface CachedToken {
  user: User;
  expires: number;
}

// In-memory token cache
class TokenCache {
  private cache = new Map<string, CachedToken>();
  
  /**
   * Get user from cache if token is valid and not expired
   * @param token JWT token
   * @returns User object if found and valid, undefined otherwise
   */
  get(token: string): User | undefined {
    const cached = this.cache.get(token);
    
    // Return undefined if not in cache or expired
    if (!cached || cached.expires < Date.now()) {
      if (cached) {
        // Remove expired token
        this.cache.delete(token);
      }
      return undefined;
    }
    
    return cached.user;
  }
  
  /**
   * Store user information with token in cache
   * @param token JWT token
   * @param user User information
   */
  set(token: string, user: User): void {
    this.cache.set(token, {
      user,
      expires: Date.now() + TOKEN_CACHE_TTL
    });
  }
  
  /**
   * Remove token from cache (e.g., on logout)
   * @param token JWT token to invalidate
   */
  invalidate(token: string): void {
    this.cache.delete(token);
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const tokenCache = new TokenCache(); 