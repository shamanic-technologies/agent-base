/**
 * Shared types for secrets management
 */
import { BaseResponse } from './common.js';

/**
 * Request to store a secret
 */
export interface StoreSecretRequest {
  secretType: string;
  secretValue: string | object;
}

export interface CheckSecretRequest {
  userId: string;
  secretType: string;
}

export interface CheckSecretResponse extends BaseResponse {
  exists: boolean;
}

/**
 * Response from storing a secret
 */
export interface StoreSecretResponse extends BaseResponse {
  message?: string;
}

/**
 * Request for retrieving a secret
 */
export interface GetSecretRequest {
  userId: string;
  secretType: string;
}

/**
 * Response for retrieving a secret
 */
export interface GetSecretResponse extends BaseResponse {
  data?: {
    value: string | object;
  };
} 