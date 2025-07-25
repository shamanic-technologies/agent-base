/**
 * Shared types for secrets management
 */
import { UserType } from './user.js';
import { UtilityProvider, UtilitySecretType, UtilityActionConfirmation } from './utility.js';

/**
 * Request to store a secret
 */
export interface StoreSecretRequest {
  userType: UserType;
  secretType: UtilitySecretType;
  secretUtilityProvider: UtilityProvider;
  secretUtilitySubProvider?: string;
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
  secretUtilitySubProvider?: string;
}

/**
 * Request for retrieving a secret
 */
export interface GetSecretRequest {
  userType: UserType;
  secretType: UtilitySecretType;
  secretUtilityProvider: UtilityProvider;
  secretUtilitySubProvider?: string;
}

export type SecretExists = {
  exists: boolean;
}

export type SecretValue = {
  value: string | null;
}