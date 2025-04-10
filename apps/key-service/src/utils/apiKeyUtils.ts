/**
 * API Key utility functions
 */
import { randomBytes } from 'crypto';

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