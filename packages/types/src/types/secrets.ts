/**
 * Shared types for secrets management
 */
import { BaseResponse } from './common.js';
import { UserType } from './user.js';
import { UtilityProvider, UtilitySecretType, UtilityActionConfirmation } from './utility.js';

/**
 * Request to store a secret
 */
export interface StoreSecretRequest {
  userType: UserType;
  secretType: UtilitySecretType;
  secretUtilityProvider: UtilityProvider;
  secretValue: string;
}

export interface StoreActionConfirmationRequest extends StoreSecretRequest {
  secretType: UtilityActionConfirmation;
  secretValue: 'true' | 'false';
}

export interface CheckSecretRequest {
  userType: UserType;
  secretType: UtilitySecretType;
  secretUtilityProvider: UtilityProvider;
}

/**
 * Request for retrieving a secret
 */
export interface GetSecretRequest {
  userType: UserType;
  secretType: UtilitySecretType;
  secretUtilityProvider: UtilityProvider;
}

export type SecretExists = {
  exists: boolean;
}

export type SecretValue = {
  value: string | null;
}