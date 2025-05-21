import { GoogleSecretManager } from '@agent-base/secret-client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables specifically for secret service if needed,
// or rely on global .env loading if service is run in an environment where that's handled.
// For simplicity, assuming .env in the service's root or globally available vars.
if (process.env.NODE_ENV === 'development') {
  const envPath = path.resolve(process.cwd(), '.env'); // Use project root .env for dev
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('[SecretService] Loaded .env file for development from project root.');
  }
  // Also check for service-specific .env for development if GOOGLE_APPLICATION_CREDENTIALS is not set
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceEnvPath = path.resolve(process.cwd(), 'apps/secret-service/.env');
    if (fs.existsSync(serviceEnvPath)) {
        dotenv.config({ path: serviceEnvPath, override: true });
        console.log('[SecretService] Loaded service-specific .env file for development.');
    }
  }
}

/**
 * Google Secret Manager client instance for the Secret Service.
 */
let gsmClientInstance: GoogleSecretManager;

/**
 * Prepares GCP credentials if GOOGLE_APPLICATION_CREDENTIALS contains JSON content.
 * Writes JSON content to a temporary file and updates the env var to point to this file path.
 */
async function prepareGcpCredentials(): Promise<void> {
  const credsContent = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsContent && credsContent.trim().startsWith('{')) {
    console.log('[SecretService] GOOGLE_APPLICATION_CREDENTIALS appears to be JSON content. Writing to temporary file...');
    try {
      const tempDir = '/tmp'; // Standard temporary directory
      if (!fs.existsSync(tempDir)) {
        // This should generally not be needed in most environments but good for robustness
        fs.mkdirSync(tempDir, { recursive: true }); 
      }
      const tempCredPath = path.join(tempDir, 'secret_service_gcp_creds.json');
      fs.writeFileSync(tempCredPath, credsContent);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredPath; // Override env var for this process
      console.log(`[SecretService] Credentials written to ${tempCredPath} and GOOGLE_APPLICATION_CREDENTIALS updated for this process.`);
    } catch (error) {
      console.error('[SecretService] FATAL ERROR: Failed to write GOOGLE_APPLICATION_CREDENTIALS content to temporary file:', error);
      throw new Error('Failed to process GOOGLE_APPLICATION_CREDENTIALS JSON content.'); // Throw to halt initialization
    }
  } else if (credsContent) {
    console.log('[SecretService] GOOGLE_APPLICATION_CREDENTIALS appears to be a file path. Using as is.');
  } else {
    console.warn('[SecretService] GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Attempting to use Application Default Credentials (ADC).');
    // If ADC is expected to work (e.g., running on GCP compute, or gcloud auth configured locally), this is fine.
    // If a service account key is required and not provided, initialization will likely fail later.
  }
}

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
  
  // Prepare credentials (handles JSON content in GOOGLE_APPLICATION_CREDENTIALS)
  await prepareGcpCredentials();

  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    console.error('[SecretService] FATAL ERROR: GOOGLE_PROJECT_ID environment variable is not set.');
    throw new Error('GOOGLE_PROJECT_ID environment variable is not set.');
  }

  try {
    // Initialize client. It will use ADC, which now considers the potentially updated
    // GOOGLE_APPLICATION_CREDENTIALS (pointing to the temp file if JSON was provided).
    gsmClientInstance = new GoogleSecretManager({
      projectId: projectId,
      // No explicit 'credentials' property here; relies on GOOGLE_APPLICATION_CREDENTIALS env var
    });
    console.log('[SecretService] GoogleSecretManager client initialized successfully.');
  } catch (error: any) {
    console.error('[SecretService] FATAL ERROR: Could not initialize GoogleSecretManager client:', error.message, error.stack);
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