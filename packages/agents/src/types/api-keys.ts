/**
 * Shared types for API Key data
 */
import { BaseResponse } from './common.js';

/**
 * Represents the metadata for an API key stored in the database
 */
export interface ApiKeyMetadata {
  key_id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used: string | null;
}

/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
  key_id: string;
  name: string;
  key_prefix: string;
}

/**
 * Standard response for API key operations
 */
export interface ApiKeyResponse extends BaseResponse {
  data?: ApiKeyMetadata;
}

/**
 * Response for getting multiple API keys
 */
export interface ApiKeysListResponse extends BaseResponse {
  data?: ApiKeyMetadata[];
}

/**
 * Data returned when a new API key is successfully created.
 * Includes the full key value which should only be shown once.
 */
export interface ApiKeyCreateResponse extends ApiKeyMetadata {
  apiKey: string; // The full, unhashed API key value (only returned on creation)
} 