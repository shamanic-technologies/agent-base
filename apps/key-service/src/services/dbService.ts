/**
 * Database service for interacting with the DB service
 * Handles all API calls to the database service and API key management
 */
import { DB_SERVICE_URL } from '../config.js';
import { 
  CreateApiKeyRequest,
  ValidateApiKeyResponse,
  ErrorResponse,
  ServiceResponse,
  ApiKey,
  ValidateApiKeyRequest
} from '@agent-base/types';
import { makeAuthenticatedServiceRequest } from '@agent-base/api-client';
import { v4 as uuidv4 } from 'uuid';
import { generateApiKey, getKeyPrefix, hashApiKey, isValidKeyFormat } from '../utils/apiKeyUtils.js';
import { storeSecret } from './secretService.js';

/**
 * Create a new API key
 * Generates key, stores secret, saves metadata to database
 */
export async function createApiKey(name: string, platformUserId: string): Promise<ServiceResponse<string>> {
  try {
    // Generate new API key and ID
    const apiKey: string = generateApiKey();
    const keyId = uuidv4();
    const keyPrefix = getKeyPrefix(apiKey);

    console.log(`Generated new key. ID: ${keyId}, Prefix: ${keyPrefix}, User: ${platformUserId}`);

    // Store secret
    const storeResponse = await storeSecret(platformUserId, keyId, apiKey);
    if (!storeResponse.success) {
      console.error('Failed to store secret:', storeResponse.error);
      return storeResponse as ErrorResponse;
    }
    console.log(`Successfully initiated secret storage for api_key_${keyId}`);

    // Prepare metadata payload
    const keyMetadataPayload: CreateApiKeyRequest = {
      keyId,
      name,
      keyPrefix,
      hashedKey: hashApiKey(apiKey),
    };

    // Save to database
    console.log(`Saving metadata for key ${keyId} to database...`);
    const dbResponse = await makeAuthenticatedServiceRequest<ApiKey>(
      DB_SERVICE_URL,
      'post',
      '/api-keys',
      platformUserId,
      keyMetadataPayload
    );

    if (!dbResponse.success) {
      console.error('Failed to store API key metadata:', dbResponse.error);
      throw new Error('Failed to store API key metadata');
    }

    console.log(`Successfully stored metadata for key ${keyId}`);

    // Prepare response
    return {
      success: true,
      data: apiKey,
    };
  } catch (error) {
    console.error('Error in createApiKey:', error);
    return { success: false, error: 'Internal error during API key creation' } as ErrorResponse;
  }
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(platformUserId: string): Promise<ServiceResponse<ApiKey[]>> {
  try {
    console.log(`Fetching API keys for user: ${platformUserId}`);
    const response = await makeAuthenticatedServiceRequest<ApiKey[]>(
      DB_SERVICE_URL, 
      'get', 
      '/api-keys', 
      platformUserId
    );
    
    if (!response.success) {
      console.error('Failed to fetch API keys metadata:', response.error);
      return response;
    }

    console.log(`Found ${response.data.length} API keys for user ${platformUserId}`);
    return response;
  } catch (error) {
    console.error('Error in getUserApiKeys:', error);
    return { success: false, error: 'Internal error during API key retrieval' } as ErrorResponse;
  }
}

/**
 * Validate an API key
 * Verifies the key format, hashes it, and validates with the database service
 */
export async function validateApiKey(apiKey: string, platformUserId: string): Promise<ServiceResponse<ApiKey>> {
  try {
    if (!apiKey || !isValidKeyFormat(apiKey)) {
      return { success: false, error: 'Invalid API key format' } as ErrorResponse;
    }

    const keyPrefix = getKeyPrefix(apiKey);
    console.log(`Attempting validation for key prefix: ${keyPrefix}`);

    // Hash the key for secure storage comparison
    const hashedKey = hashApiKey(apiKey);

    // Call database service to validate key
    const validatePayload: ValidateApiKeyRequest = {
      hashedKey,
      keyPrefix
    };

    const validateResponse = await makeAuthenticatedServiceRequest<ApiKey>(
      DB_SERVICE_URL,
      'post',
      '/api-keys/validate',
      platformUserId,
      validatePayload
    );
    
    if (!validateResponse.success) {
      console.log(`Key validation failed for prefix ${keyPrefix}`);
      return validateResponse;
    }

    console.log(`Key validation successful for key ${validateResponse.data.keyId}`);
    
    return validateResponse;
  } catch (error) {
    console.error('Error in validateApiKey:', error);
    return { 
      success: false, 
      error: 'Internal error during key validation' 
    } as ErrorResponse;
  }
} 