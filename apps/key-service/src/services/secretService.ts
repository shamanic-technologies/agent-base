/**
 * Secret management service
 * Handles storing and retrieving API key secrets
 */
import axios from 'axios';
import { SECRET_SERVICE_URL } from '../config.js';
import { StoreSecretRequest, StoreSecretResponse, GetSecretResponse } from '@agent-base/agents';

/**
 * Store a secret value in the secret service
 * @param userId The user ID who owns the secret
 * @param keyId The key ID associated with the secret
 * @param secretValue The actual secret value to store
 */
export async function storeSecret(userId: string, keyId: string, secretValue: string): Promise<boolean> {
  try {
    const secretType = `api_key_${keyId}`;
    console.log(`Storing secret for user ${userId}, key ${keyId}`);
    
    const requestData: StoreSecretRequest = {
      secretType: secretType,
      secretValue: secretValue,
    };
    
    const response = await axios.post<StoreSecretResponse>(
      `${SECRET_SERVICE_URL}/api/store-secret`,
      requestData,
      {
        headers: { 'x-user-id': userId }
      }
    );
    
    if (!response.data?.success) {
      console.error(`Failed to store secret for type ${secretType}:`, response.data);
      throw new Error(`Failed to store secret for type ${secretType}`);
    }
    
    console.log(`Successfully stored secret for type ${secretType}`);
    return true;
  } catch (error) {
    console.error('Error storing secret:', error);
    throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a secret value from the secret service
 * @param userId The user ID who owns the secret
 * @param keyId The key ID associated with the secret
 * @returns The secret value or null if not found
 */
export async function getSecret(userId: string, keyId: string): Promise<string | null> {
  try {
    const secretType = `api_key_${keyId}`;
    console.log(`Retrieving secret for user ${userId}, key ${keyId}`);
    
    const response = await axios.get<GetSecretResponse>(
      `${SECRET_SERVICE_URL}/api/get-secret/${secretType}`,
      {
        headers: { 'x-user-id': userId }
      }
    );
    
    if (!response.data?.success) {
      console.log(`Secret not found for type ${secretType}`);
      return null;
    }
    
    return response.data.data?.value as string;
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw new Error(`Failed to retrieve secret: ${error instanceof Error ? error.message : String(error)}`);
  }
}
