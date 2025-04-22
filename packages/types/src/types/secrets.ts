/**
 * Shared types for secrets management
 */
import { BaseResponse } from './common.js';
import { UserType } from './user.js';


/**
 * Request to store a secret
 */
export interface StoreSecretRequest {
  userType: UserType;
  secretType: string;
  secretValue: string | object;
}

export interface StoreActionConfirmationRequest extends StoreSecretRequest {
  secretType: string;
  secretValue: 'true' | 'false';
}

export interface CheckSecretRequest {
  userType: UserType;
  secretType: string;
}

/**
 * Request for retrieving a secret
 */
export interface GetSecretRequest {
  userType: UserType;
  secretType: string;
}

export type SecretExists = {
  exists: boolean;
}

export type SecretValue = {
  value: string | null;
}