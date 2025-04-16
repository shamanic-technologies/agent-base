/**
 * Secret management service
 * Handles storing and retrieving API key secrets
 */

import { StoreSecretRequest, ServiceResponse } from '@agent-base/types';
import { storeSecret as storeSecretApiClient } from '@agent-base/api-client';
/**
 * Store a secret value in the secret service
 * @param userId The user ID who owns the secret
 * @param keyId The key ID associated with the secret
 * @param secretValue The actual secret value to store
 */
export async function storeSecret(userId: string, keyId: string, secretValue: string): Promise<ServiceResponse<string>> {
  try {
    const secretType = `api_key_${keyId}`;
    console.log(`Storing secret for user ${userId}, key ${keyId}`);
    
    const requestData: StoreSecretRequest = {
      secretType: secretType,
      secretValue: secretValue,
    };
    
    const storeResponse = await storeSecretApiClient(userId, requestData);
    
    if (!storeResponse.success) {
      console.error(`Failed to store secret for type ${secretType}:`, storeResponse.data);
      return storeResponse;
    }
    
    console.log(`Successfully stored secret for type ${secretType}`);
    return storeResponse;
  } catch (error) {
    console.error('Error storing secret:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
