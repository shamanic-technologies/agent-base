/**
 * Database service for interacting with the DB service
 * Handles all API calls to the database service and API key management
 */
import { DB_SERVICE_URL } from '../config.js';
import { 
  ApiKeyMetadata, 
  ApiKeyCreateResponse,
  makeServiceRequest,
  CreateApiKeyRequest,
  ValidateApiKeyResponse,
  ErrorResponse,
  ServiceResponse,
} from '@agent-base/agents';
import { v4 as uuidv4 } from 'uuid';
import { generateApiKey, getKeyPrefix, hashApiKey, isValidKeyFormat } from '../utils/apiKeyUtils.js';
import { storeSecret, getSecret } from './secretService.js';

/**
 * Create a new API key
 * Generates key, stores secret, saves metadata to database
 */
export async function createApiKey(name: string, userId: string): Promise<ApiKeyCreateResponse | null> {
  try {
    // Generate new API key and ID
    const apiKey = generateApiKey();
    const keyId = uuidv4();
    const keyPrefix = getKeyPrefix(apiKey);

    console.log(`Generated new key. ID: ${keyId}, Prefix: ${keyPrefix}, User: ${userId}`);

    // Store secret
    await storeSecret(userId, keyId, apiKey);
    console.log(`Successfully initiated secret storage for api_key_${keyId}`);

    // Prepare metadata payload
    const keyMetadataPayload = {
      key_id: keyId,
      name,
      key_prefix: keyPrefix,
      hashed_key: hashApiKey(apiKey),
    } as CreateApiKeyRequest;

    // Save to database
    console.log(`Saving metadata for key ${keyId} to database...`);
    const dbResponse = await makeServiceRequest<ApiKeyMetadata>(
      DB_SERVICE_URL,
      'post',
      '/api-keys',
      userId,
      keyMetadataPayload
    );

    if (!dbResponse.success) {
      console.error('Failed to store API key metadata:', dbResponse.error);
      throw new Error('Failed to store API key metadata');
    }

    console.log(`Successfully stored metadata for key ${keyId}`);

    // Prepare response
    return {
      ...dbResponse.data,
      apiKey: apiKey,
    } as ApiKeyCreateResponse;
  } catch (error) {
    console.error('Error in createApiKey:', error);
    return null;
  }
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyMetadata[] | null> {
  try {
    console.log(`Fetching API keys for user: ${userId}`);
    const response = await makeServiceRequest<ApiKeyMetadata[]>(
      DB_SERVICE_URL, 
      'get', 
      '/api-keys', 
      userId
    );
    
    if (!response.success) {
      console.error('Failed to fetch API keys metadata:', response.error);
      return null;
    }

    console.log(`Found ${response.data.length} API keys for user ${userId}`);
    return response.data as ApiKeyMetadata[];
  } catch (error) {
    console.error('Error in getUserApiKeys:', error);
    return null;
  }
}

/**
 * Validate an API key
 * Verifies the key format, hashes it, and validates with the database service
 */
export async function validateApiKey(apiKey: string, userId: string): Promise<ServiceResponse<ApiKeyMetadata>> {
  try {
    if (!apiKey || !isValidKeyFormat(apiKey)) {
      return { success: false, error: 'Invalid API key format' } as ErrorResponse;
    }

    const keyPrefix = getKeyPrefix(apiKey);
    console.log(`Attempting validation for key prefix: ${keyPrefix}`);

    // Hash the key for secure storage comparison
    const hashedKey = hashApiKey(apiKey);

    // Call database service to validate key
    const validatePayload = {
      hashed_key: hashedKey,
      key_prefix: keyPrefix
    };

    const dbResponse = await makeServiceRequest<ApiKeyMetadata>(
      DB_SERVICE_URL,
      'post',
      '/api-keys/validate',
      undefined,
      validatePayload
    );
    
    if (!dbResponse.success) {
      console.log(`Key validation failed for prefix ${keyPrefix}`);
      return { success: false, error: 'Invalid or revoked API key' } as ErrorResponse;
    }

    console.log(`Key validation successful for key ${dbResponse.data.key_id}`);
    
    return {
      success: true,
      data: dbResponse.data
    } as ServiceResponse<ApiKeyMetadata>;
  } catch (error) {
    console.error('Error in validateApiKey:', error);
    return { 
      success: false, 
      error: 'Internal error during key validation' 
    } as ErrorResponse;
  }
} 