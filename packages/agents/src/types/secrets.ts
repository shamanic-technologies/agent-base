/**
 * Shared types for secrets management
 */
import { BaseResponse } from './common.js';

/**
 * Request to store a secret
 */
export interface StoreSecretRequest {
  /** Type/identifier of the secret (e.g. 'api_key_123456') */
  secretType: string;
  /** Value to be stored securely */
  secretValue: string | object;
}

/**
 * Response from storing a secret
 */
export interface StoreSecretResponse extends BaseResponse {
  message?: string;
}

/**
 * Response for retrieving a secret
 */
export interface GetSecretResponse extends BaseResponse {
  data?: {
    value: string | object;
  };
}

/**
 * Response for checking if a secret exists
 */
export interface CheckSecretResponse extends BaseResponse {
  exists: boolean;
} 