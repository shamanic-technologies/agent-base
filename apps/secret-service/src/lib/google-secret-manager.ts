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
    ServiceCredentials, 
    ServiceResponse, 
    StoreSecretRequest, 
    // StoreSecretResponse // Likely encompassed by ServiceResponse<string>
    UserType // Import UserType enum
} from '@agent-base/types';
import { getAuthHeaders } from '@agent-base/api-client';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Initialize the Secret Manager client (remove 'as any' if type inference works)
// Note: The official types might not perfectly align, 'as any' might still be needed
// if the library's usage doesn't match standard patterns or if types are complex.
// Let's try without 'as any' first.
const client = new SecretManagerServiceClient(); 

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
 * @param storeSecretRequest Object containing userType, userId, secretType, and secretValue
 * @returns Success status and message
 */
export async function storeSecret(storeSecretRequest: StoreSecretRequest, userId: string): Promise<ServiceResponse<string>> {
  // Add projectId check inside the function
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    console.error('GOOGLE_PROJECT_ID environment variable is not set'); // Keep console error for visibility
    throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
  }

  try {
    // Destructure directly from the request object
    const { userType, secretType, secretValue } = storeSecretRequest;

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
export async function checkSecretExists(request: CheckSecretRequest, userId: string): Promise<ServiceResponse<SecretExists>> {
  // Add projectId check inside the function
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    console.error('GOOGLE_PROJECT_ID environment variable is not set'); // Keep console error for visibility
    throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
  }

  try {
    // Destructure from the request object
    const { userType, secretType } = request;

    // Create the secret name based on user type, user id and secret type
    const userTypeStr = getUserTypeString(userType); // Use helper function
    const secretId = `${userTypeStr}_${userId}_${secretType}`.toLowerCase(); // Ensure lowercase
    const name = `projects/${projectId}/secrets/${secretId}`;

    try {
      const [secret] = await client.getSecret({
        name,
      });

      // Fix: Return boolean wrapped in SecretExists structure
      return { success: true, data: { exists: !!secret } }; 
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 5) { // 5 is gRPC code for NOT_FOUND
         // Fix: Return boolean wrapped in SecretExists structure
        return { success: true, data: { exists: false } }; 
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
export async function getSecret(request: GetSecretRequest, userId: string): Promise<ServiceResponse<SecretValue>> {
  // Add projectId check inside the function
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    console.error('GOOGLE_PROJECT_ID environment variable is not set'); // Keep console error for visibility
    // Return an error response matching the function signature
    return { 
      success: false, 
      error: 'Server configuration error: GOOGLE_PROJECT_ID environment variable is not set' 
    };
  }

  try {
    // Destructure from the request object
    const { userType, secretType } = request;

    // Create the secret name based on user type, user id and secret type
    const userTypeStr = getUserTypeString(userType); // Use helper function
    const secretId = `${userTypeStr}_${userId}_${secretType}`.toLowerCase(); // Ensure lowercase
    const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;

    // Access the secret version - wrap in try-catch for NOT_FOUND
    try {
        const [version] = await client.accessSecretVersion({
          name,
        });

        // Ensure payload and data exist
        if (!version.payload || !version.payload.data) {
            console.warn(`Secret version ${name} found but has no data.`);
            // Return null value wrapped in the SecretValue structure
            return { success: true, data: { value: null } }; 
        }

        // Decode and parse the secret data
        const payload = version.payload.data.toString();
        try {
            const parsedValue = JSON.parse(payload);
             // Wrap the parsed value in the SecretValue structure
            return { success: true, data: { value: parsedValue } };
        } catch (parseError) {
            // If parsing fails, return null wrapped in the SecretValue structure
            console.error(`Error parsing JSON payload for secret ${name}:`, parseError);
            return { success: true, data: { value: null } }; // Treat parse error as data unavailable
        }

    } catch (error: unknown) {
      // Check if the error is a Google Cloud "NOT_FOUND" error (code 5)
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 5) {
        console.log(`Secret ${name} not found. Returning null.`);
        // If secret is not found, return success with null wrapped in SecretValue structure
        return { success: true, data: { value: null } };
      }
      // For any other errors, re-throw to be caught by the outer catch block
      throw error; 
    }

  } catch (error) {
    console.error('Error getting secret:', error);
    // Return a structured error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting secret',
    };
  }
} 