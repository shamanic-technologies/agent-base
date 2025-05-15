import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import {
  GoogleSecretManagerConfigError,
  SecretNotFoundError,
  GoogleCloudSecretManagerApiError,
} from './errors.js';
import type { GoogleSecretManagerConfig } from './types.js';

/**
 * A client for interacting with Google Cloud Secret Manager.
 * Provides methods to store, retrieve, and check for the existence of secrets.
 */
export class GoogleSecretManager {
  private client: SecretManagerServiceClient;
  private projectParent: string;
  private projectId: string;

  /**
   * Creates an instance of the GoogleSecretManager client.
   * @param config Configuration for the client, including projectId and optional credentials.
   * @throws {GoogleSecretManagerConfigError} If projectId is not provided.
   */
  constructor(config: GoogleSecretManagerConfig) {
    if (!config.projectId) {
      throw new GoogleSecretManagerConfigError('Google Cloud Project ID (projectId) is required.');
    }
    this.projectId = config.projectId;
    this.projectParent = `projects/${this.projectId}`;

    try {
      this.client = new SecretManagerServiceClient({
        credentials: config.credentials,
        projectId: this.projectId, // Also pass projectId here for clarity and if client uses it
      });
    } catch (error: any) {
      throw new GoogleCloudSecretManagerApiError(
        `Failed to initialize Google Secret Manager client: ${error.message}`,
        error
      );
    }
  }

  /**
   * Retrieves the latest version of a secret's value.
   * @param secretId The ID of the secret (not the full path).
   * @returns The secret value as a string, or null if the secret or version is not found or has no data.
   * @throws {GoogleCloudSecretManagerApiError} If an API error occurs other than NOT_FOUND.
   */
  async getSecret(secretId: string): Promise<string | null> {
    const name = `${this.projectParent}/secrets/${secretId}/versions/latest`;
    try {
      const [version] = await this.client.accessSecretVersion({ name });
      if (!version.payload?.data) {
        // Secret version exists but has no data
        console.warn(`Secret version ${name} found but has no data.`);
        return null;
      }
      return version.payload.data.toString();
    } catch (error: any) {
      if (error.code === 5) { // gRPC status code 5: NOT_FOUND
        return null; // Secret or version not found
      }
      console.error(`Error getting secret ${name} from GSM:`, error);
      throw new GoogleCloudSecretManagerApiError(
        `Failed to get secret '${secretId}': ${error.message}`,
        error
      );
    }
  }

  /**
   * Stores a secret value. 
   * If the secret does not exist, it creates the secret and adds the value as the first version.
   * If the secret exists, it adds a new version with the provided value.
   * The secret ID should only contain alphanumeric characters, hyphens, and underscores.
   * @param secretId The ID of the secret (e.g., 'my-api-key'). Max 255 chars.
   * @param value The string value of the secret to store.
   * @throws {GoogleSecretManagerConfigError} If secretId is invalid.
   * @throws {GoogleCloudSecretManagerApiError} If an API error occurs.
   */
  async storeSecret(secretId: string, value: string): Promise<void> {
    if (!/^[a-zA-Z0-9_-]{1,255}$/.test(secretId)) {
      throw new GoogleSecretManagerConfigError(
        'Invalid secretId. It must be 1-255 characters and contain only letters, numbers, hyphens (-), and underscores (_).'
      );
    }

    const secretPath = `${this.projectParent}/secrets/${secretId}`;
    const payload = { data: Buffer.from(value, 'utf8') };

    try {
      // Check if secret exists. client.getSecret() is preferred over listing for a single secret.
      await this.client.getSecret({ name: secretPath });
      // If exists, add a new version
      await this.client.addSecretVersion({ parent: secretPath, payload });
      console.log(`Added new version to existing secret: ${secretId}`);
    } catch (error: any) {
      if (error.code === 5) { // gRPC status code 5: NOT_FOUND
        // Secret doesn't exist, create it
        try {
          await this.client.createSecret({
            parent: this.projectParent,
            secretId,
            secret: { 
              replication: { automatic: {} },
              // You can add labels here if needed: labels: { env: 'production' }
            },
          });
          // Add the first version
          await this.client.addSecretVersion({ parent: secretPath, payload });
          console.log(`Created secret '${secretId}' and stored initial version.`);
        } catch (creationError: any) {
          console.error(`Error creating or adding version to secret '${secretId}':`, creationError);
          throw new GoogleCloudSecretManagerApiError(
            `Failed to create secret '${secretId}' or add version: ${creationError.message}`,
            creationError
          );
        }
      } else {
        // Other error during getSecret or addSecretVersion (if secret existed)
        console.error(`Error storing secret '${secretId}' in GSM:`, error);
        throw new GoogleCloudSecretManagerApiError(
          `Failed to store secret '${secretId}': ${error.message}`,
          error
        );
      }
    }
  }

  /**
   * Checks if a secret with the given ID exists.
   * @param secretId The ID of the secret.
   * @returns True if the secret exists, false otherwise.
   * @throws {GoogleCloudSecretManagerApiError} If an API error occurs other than NOT_FOUND.
   */
  async secretExists(secretId: string): Promise<boolean> {
    const name = `${this.projectParent}/secrets/${secretId}`;
    try {
      await this.client.getSecret({ name });
      return true;
    } catch (error: any) {
      if (error.code === 5) { // gRPC status code 5: NOT_FOUND
        return false;
      }
      console.error(`Error checking secret existence for '${secretId}':`, error);
      throw new GoogleCloudSecretManagerApiError(
        `Failed to check existence of secret '${secretId}': ${error.message}`,
        error
      );
    }
  }

  /**
   * Deletes a secret and all its versions.
   * Use with caution, this operation is irreversible without backups.
   * @param secretId The ID of the secret to delete.
   * @throws {SecretNotFoundError} If the secret does not exist.
   * @throws {GoogleCloudSecretManagerApiError} If an API error occurs.
   */
  async deleteSecret(secretId: string): Promise<void> {
    const name = `${this.projectParent}/secrets/${secretId}`;
    try {
      await this.client.deleteSecret({ name });
      console.log(`Secret '${secretId}' deleted successfully.`);
    } catch (error: any) {
      if (error.code === 5) { // gRPC status code 5: NOT_FOUND
        throw new SecretNotFoundError(secretId, `Secret '${secretId}' not found for deletion.`);
      }
      console.error(`Error deleting secret '${secretId}':`, error);
      throw new GoogleCloudSecretManagerApiError(
        `Failed to delete secret '${secretId}': ${error.message}`,
        error
      );
    }
  }
}

// Export types and errors for consumers of the library
export * from './types.js';
export * from './errors.js';
export * from './utils.js'; 