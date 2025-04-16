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

export interface StoreActionConfirmationRequest extends StoreSecretRequest {
  secretType: string;
  secretValue: 'true' | 'false';
}

export interface CheckSecretRequest {
  userId: string;
  secretType: string;
}

/**
 * Request for retrieving a secret
 */
export interface GetSecretRequest {
  userId: string;
  secretType: string;
}

export interface SecretExists {
  exists: boolean;
}

export interface SecretValue {
  value: string | object;
} 