/**
 * Database service for interacting with the DB service
 * Handles all API calls to the database service and API key management
 */
import { DATABASE_SERVICE_URL } from '../config.js';
import { 
  CreateApiKeyRequest,
  ValidateApiKeyResponse,
  ErrorResponse,
  ServiceResponse,
  ApiKey,
  ValidateApiKeyRequest,
  UserType,
  StoreSecretRequest,
  UtilityProvider,
  PlatformApiKeySecretType
} from '@agent-base/types';
import { makeWebAuthenticatedServiceRequest, storeSecretWebClient, makeWebAnonymousServiceRequest, createApiKeyMetadata } from '@agent-base/api-client';
import { v4 as uuidv4 } from 'uuid';
import { generateApiKey, getKeyPrefix, hashApiKey, isValidKeyFormat } from '../utils/apiKeyUtils.js';

// /**
//  * Create a new API key
//  * Generates key, stores secret, saves metadata to database
//  */
// export async function createApiKey(name: string, platformUserId: string): Promise<ServiceResponse<string>> {
//   try {
//     // Generate new API key and ID
//     const apiKey: string = generateApiKey();
//     const keyId = uuidv4();
//     const keyPrefix = getKeyPrefix(apiKey);

//     // Store secret
//     const requestData: StoreSecretRequest = {
//       userType: UserType.Platform,
//       secretUtilityProvider: UtilityProvider.AGENT_BASE,
//       secretType: `api_key_${keyId}` as PlatformApiKeySecretType,
//       secretValue: apiKey,
//     };
//     const storeResponse = await storeSecretWebClient(platformUserId, requestData);
//     if (!storeResponse.success) {
//       console.error('Failed to store secret:', storeResponse.error);
//       return storeResponse;
//     }

//     // Prepare metadata payload
//     const keyMetadataPayload: CreateApiKeyRequest = {
//       keyId,
//       name,
//       keyPrefix,
//       hashedKey: hashApiKey(apiKey),
//     };

//     const dbResponse = await createApiKeyMetadata(keyMetadataPayload, platformUserId);
    

//     if (!dbResponse.success) {
//       console.error('Failed to store API key metadata:', dbResponse.error);
//       throw new Error('Failed to store API key metadata');
//     }

//     // Prepare response
//     return {
//       success: true,
//       data: apiKey,
//     };
//   } catch (error) {
//     console.error('Error in createApiKey:', error);
//     return { success: false, error: 'Internal error during API key creation' } as ErrorResponse;
//   }
// }

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(platformUserId: string): Promise<ServiceResponse<ApiKey[]>> {
  try {
    console.log(`Fetching API keys for user: ${platformUserId}`);
    const response = await makeWebAuthenticatedServiceRequest<ApiKey[]>(
      DATABASE_SERVICE_URL, 
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
 * Does NOT require platformUserId as input, as the DB service finds the user based on the key.
 */
export async function validateApiKey(apiKey: string): Promise<ServiceResponse<ApiKey>> {
  try {
    if (!apiKey || !isValidKeyFormat(apiKey)) {
      console.log(`Invalid API key format: ${apiKey.substring(0, 5)}...`);
      return { success: false, error: 'Invalid API key format' } as ErrorResponse;
    }

    const keyPrefix = getKeyPrefix(apiKey);

    // Hash the key for secure storage comparison
    const hashedKey = hashApiKey(apiKey);

    // Call database service to validate key
    const validatePayload: ValidateApiKeyRequest = {
      hashedKey,
      keyPrefix
    };

    // Use anonymous request: DB service validates the key and returns the associated user info (including platformUserId)
    const validateResponse = await makeWebAnonymousServiceRequest<ApiKey>(
      DATABASE_SERVICE_URL,
      'post',
      '/api-keys/validate',
      validatePayload
    );
    
    if (!validateResponse.success) {
      console.log(`Key validation failed for prefix ${keyPrefix}: ${validateResponse.error}`);
      return { success: false, error: validateResponse.error || 'API key validation failed' };
    }

    // Ensure data and platformUserId exist on success
    if (!validateResponse.data || !validateResponse.data.platformUserId) {
        console.error(`Key validation succeeded for prefix ${keyPrefix} but response missing data or platformUserId.`);
        return { success: false, error: 'Internal validation error: Incomplete data from database service.' };
    }
    
    return validateResponse;
  } catch (error) {
    console.error('Error in validateApiKey:', error);
    return { 
      success: false, 
      error: 'Internal error during key validation' 
    } as ErrorResponse;
  }
} 