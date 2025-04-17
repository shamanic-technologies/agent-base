/**
 * Google Secret Manager Client
 * 
 * Provides an abstraction layer for interacting with Google Secret Manager
 */
// Remove @ts-ignore - Ensure types are correctly exported from @agent-base/types
import { 
    CheckSecretRequest, 
    // CheckSecretResponse, // Likely encompassed by ServiceResponse<SecretExists>
    ErrorResponse, 
    GetSecretRequest, 
    // GetSecretResponse, // Likely encompassed by ServiceResponse<SecretValue>
    SecretExists, 
    SecretValue, 
    ServiceResponse, 
    StoreSecretRequest, 
    // StoreSecretResponse // Likely encompassed by ServiceResponse<string>
    UserType // Import UserType enum
} from '@agent-base/types';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Initialize the Secret Manager client (remove 'as any' if type inference works)
// Note: The official types might not perfectly align, 'as any' might still be needed
// if the library's usage doesn't match standard patterns or if types are complex.
// Let's try without 'as any' first.
const client = new SecretManagerServiceClient(); 

// Get the project ID from environment variables
const projectId = process.env.GOOGLE_PROJECT_ID;

if (!projectId) {
  console.error('GOOGLE_PROJECT_ID environment variable is not set');
}

/**
 * Maps UserType enum to its lowercase string representation.
 * 
 * @param userType The UserType enum value.
 * @returns The lowercase string ('platform' or 'client').
 * @throws Error if the userType is invalid.
 */
function getUserTypeString(userType: UserType): string {
    switch (userType) {
        case UserType.Platform:
            return 'platform';
        case UserType.Client:
            return 'client';
        default:
            // This should ideally not happen if validation occurs upstream,
            // but defensively throw an error.
            throw new Error(`Invalid UserType enum value: ${userType}`);
    }
}

/**
 * Create a secret key for a user
 * 
 * @param request Object containing userType, userId, secretType, and secretValue
 * @returns Success status and message
 */
export async function storeSecret(request: StoreSecretRequest): Promise<ServiceResponse<string>> {
  try {
    // Destructure directly from the request object
    const { userType, userId, secretType, secretValue } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create a secret ID based on user type, user id and secret type
    const userTypeStr = getUserTypeString(userType); // Use helper function
    const secretId = `${userTypeStr}_${userId}_${secretType}`.toLowerCase(); // Ensure lowercase
    const parent = `projects/${projectId}`;
    const secretName = `${parent}/secrets/${secretId}`;

    // Check if the secret already exists
    try {
      const [existing] = await client.getSecret({
        name: secretName,
      });

      if (existing) {
        // If the secret exists, add a new version
        const [version] = await client.addSecretVersion({
          parent: secretName,
          payload: {
            data: Buffer.from(JSON.stringify(secretValue)),
          },
        });

        console.log(`Updated secret ${secretId} with new version: ${version.name}`);
        return { success: true, data: 'Secret updated successfully' };
      }
    } catch (error) {
      // Secret doesn't exist, continue to create it
      console.log(`Secret ${secretId} doesn't exist, creating it`);
    }

    // Create the secret
    await client.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    // Add the first version of the secret
    const [version] = await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(JSON.stringify(secretValue)),
      },
    });

    console.log(`Created secret ${secretId} with version: ${version.name}`);
    return { success: true, data: 'Secret created successfully' };
  } catch (error) {
    console.error('Error storing secret:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error storing secret',
    } as ErrorResponse;
  }
}

/**
 * Check if a secret exists for a user
 * 
 * @param request Object containing userType, userId, and secretType
 * @returns Whether the secret exists
 */
export async function checkSecretExists(request: CheckSecretRequest): Promise<ServiceResponse<SecretExists>> {
  try {
    // Destructure from the request object
    const { userType, userId, secretType } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create the secret name based on user type, user id and secret type
    const userTypeStr = getUserTypeString(userType); // Use helper function
    const secretId = `${userTypeStr}_${userId}_${secretType}`.toLowerCase(); // Ensure lowercase
    const name = `projects/${projectId}/secrets/${secretId}`;

    try {
      const [secret] = await client.getSecret({
        name,
      });

      // Fix: Return boolean directly for ServiceResponse<SecretExists>
      return { success: true, data: !!secret }; 
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 5) { // 5 is gRPC code for NOT_FOUND
         // Fix: Return boolean directly for ServiceResponse<SecretExists>
        return { success: true, data: false }; 
      }
      throw error;
    }
  } catch (error) {
    console.error('Error checking if secret exists:', error);
    // Fix: Ensure error response matches ServiceResponse structure
    // The 'data' field is not applicable here, only success and error.
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking secret',
    };
  }
}

/**
 * Get a secret for a user
 * 
 * @param request Object containing userType, userId, and secretType
 * @returns The secret value (parsed from JSON)
 */
export async function getSecret(request: GetSecretRequest): Promise<ServiceResponse<SecretValue>> {
  try {
    // Destructure from the request object
    const { userType, userId, secretType } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create the secret name based on user type, user id and secret type
    const userTypeStr = getUserTypeString(userType); // Use helper function
    const secretId = `${userTypeStr}_${userId}_${secretType}`.toLowerCase(); // Ensure lowercase
    const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;

    // Access the secret version
    const [version] = await client.accessSecretVersion({
      name,
    });

    const payload = version.payload?.data?.toString() || '{}';
    
    try {
      const parsedPayload = JSON.parse(payload);
      // Ensure the returned data structure matches ServiceResponse<SecretValue>
      // parsedPayload should already be in the form { value: ... }, assuming it was stored correctly.
      return { success: true, data: parsedPayload as SecretValue };
    } catch (error) {
      // If the payload isn't valid JSON, wrap the raw string in the SecretValue structure
      console.warn(`Payload for secret ${name} is not valid JSON. Returning as raw string wrapped in SecretValue.`);
      return { success: true, data: { value: payload } };
    }
  } catch (error) {
    console.error('Error getting secret:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting secret',
    };
  }
} 