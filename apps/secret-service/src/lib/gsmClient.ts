import { GoogleSecretManager } from '@agent-base/secret-client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables specifically for secret service if needed,
// or rely on global .env loading if service is run in an environment where that's handled.
// For simplicity, assuming .env in the service's root or globally available vars.
if (process.env.NODE_ENV === 'development') {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('[SecretService] Loaded .env file for development.');
  }
}

/**
 * Google Secret Manager client instance for the Secret Service.
 */
let gsmClientInstance: GoogleSecretManager;

/**
 * Initializes the Google Secret Manager client.
 * This function should be called once during application startup.
 * @throws Error if essential environment variables (GOOGLE_PROJECT_ID) are missing or initialization fails.
 */
export async function initializeGsmClient(): Promise<void> {
  if (gsmClientInstance) {
    console.log('[SecretService] GoogleSecretManager client already initialized.');
    return;
  }

  console.log('[SecretService] Initializing GoogleSecretManager client...');
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    console.error('[SecretService] FATAL ERROR: GOOGLE_PROJECT_ID environment variable is not set.');
    throw new Error('GOOGLE_PROJECT_ID environment variable is not set.');
  }

  let credentialsJson;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      credentialsJson = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      console.error(
        '[SecretService] Failed to parse GOOGLE_CREDENTIALS_JSON. Client will attempt to use Application Default Credentials.',
        e
      );
      // credentialsJson remains undefined, GoogleSecretManager client will use ADC
    }
  }

  try {
    gsmClientInstance = new GoogleSecretManager({
      projectId: projectId,
      credentials: credentialsJson, // Pass undefined if JSON parsing failed or var not set, client handles ADC
    });
    console.log('[SecretService] GoogleSecretManager client initialized successfully.');
  } catch (error: any) {
    console.error('[SecretService] FATAL ERROR: Could not initialize GoogleSecretManager client:', error.message);
    throw new Error(`Failed to initialize GoogleSecretManager client: ${error.message}`);
  }
}

/**
 * Returns the initialized Google Secret Manager client instance.
 * @throws Error if the client has not been initialized by calling initializeGsmClient().
 * @returns The GoogleSecretManager instance.
 */
export function getGsmClient(): GoogleSecretManager {
  if (!gsmClientInstance) {
    throw new Error(
      'GoogleSecretManager client has not been initialized. Call initializeGsmClient() first.'
    );
  }
  return gsmClientInstance;
} 