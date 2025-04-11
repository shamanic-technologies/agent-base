/**
 * API Key utility functions
 */
import { randomBytes, createHash } from 'crypto';

/**
 * Generates a cryptographically secure API key.
 * Format: agbase_<timestamp_base36>_<random_hex>
 * @returns {string} The generated API key.
 */
export function generateApiKey(): string {
  const keyBuffer = randomBytes(32);
  const timestamp = Date.now().toString(36); // Convert timestamp to base36 for compactness
  return `agbase_${timestamp}_${keyBuffer.toString('hex')}`;
}

/**
 * Gets the prefix of an API key (first 16 characters)
 * @param apiKey The API key to extract prefix from
 * @returns The key prefix
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16);
}

/**
 * Generates a hash of an API key for secure storage comparison
 * @param apiKey The API key to hash
 * @returns The hashed API key
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validates the format of an API key
 * @param apiKey The API key to validate
 * @returns True if valid format, false otherwise
 */
export function isValidKeyFormat(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.startsWith('agbase_');
} 