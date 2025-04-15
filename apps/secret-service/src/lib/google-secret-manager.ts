/**
 * Google Secret Manager Client
 * 
 * Provides an abstraction layer for interacting with Google Secret Manager
 */
// @ts-ignore - Ignore type checking for this import
import { CheckSecretRequest, CheckSecretResponse, GetSecretRequest, GetSecretResponse, StoreSecretRequest, StoreSecretResponse } from '@agent-base/types';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Initialize the Secret Manager client
const client = new SecretManagerServiceClient() as any;

// Get the project ID from environment variables
const projectId = process.env.GOOGLE_PROJECT_ID;

if (!projectId) {
  console.error('GOOGLE_PROJECT_ID environment variable is not set');
}

/**
 * Create a secret key for a user
 * 
 * @param userId The user ID
 * @param secretType The type of secret (e.g., 'stripe_api_keys')
 * @param secretValue The value to store (will be stringified)
 * @returns Success status and message
 */
export async function storeSecret(request: StoreSecretRequest, userId: string): Promise<StoreSecretResponse> {
  try {
    const { secretType, secretValue } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create a secret ID based on user and secret type
    const secretId = `user_${userId}_${secretType}`;
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
        return { success: true, message: 'Secret updated successfully' };
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
    return { success: true, message: 'Secret created successfully' } as StoreSecretResponse;
  } catch (error) {
    console.error('Error storing secret:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error storing secret',
    } as StoreSecretResponse;
  }
}

/**
 * Check if a secret exists for a user
 * 
 * @param userId The user ID
 * @param secretType The type of secret (e.g., 'stripe_api_keys')
 * @returns Whether the secret exists
 */
export async function checkSecretExists(request: CheckSecretRequest): Promise<CheckSecretResponse> {
  try {
    const { userId, secretType } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create the secret name
    const secretId = `user_${userId}_${secretType}`;
    const name = `projects/${projectId}/secrets/${secretId}`;

    try {
      const [secret] = await client.getSecret({
        name,
      });

      return { exists: !!secret, success: true };
    } catch (error: unknown) {
      // If the error is "NOT_FOUND", the secret doesn't exist
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 5) { // 5 is the gRPC code for NOT_FOUND
        return { exists: false, success: true };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error checking if secret exists:', error);
    return {
      exists: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking secret',
    };
  }
}

/**
 * Get a secret for a user
 * 
 * @param userId The user ID
 * @param secretType The type of secret (e.g., 'stripe_api_keys')
 * @returns The secret value (parsed from JSON)
 */
export async function getSecret(request: GetSecretRequest): Promise<GetSecretResponse> {
  try {
    const { userId, secretType } = request;

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is not set');
    }

    // Create the secret name
    const secretId = `user_${userId}_${secretType}`;
    const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;

    // Access the secret version
    const [version] = await client.accessSecretVersion({
      name,
    });

    const payload = version.payload?.data?.toString() || '{}';
    
    try {
      const parsedPayload = JSON.parse(payload);
      return { success: true, data: parsedPayload };
    } catch (error) {
      // If the payload isn't valid JSON, return it as a string
      return { success: true, data: payload };
    }
  } catch (error) {
    console.error('Error getting secret:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting secret',
    };
  }
} 