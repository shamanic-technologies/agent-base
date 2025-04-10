/**
 * Secret Service client utilities
 * Wraps calls to the dedicated secret-service application.
 */
import axios from 'axios';
import { SECRET_SERVICE_URL } from '../config.js';
import fs from 'fs';
import path from 'path';

// --- Service Account Authentication --- 
// Load service account key for authenticating requests to secret-service
// TODO: Securely manage the path to this key or the key itself (e.g., via env var or mounted secret)
let SERVICE_ACCOUNT_TOKEN: string | null = null;
const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json'); // Adjust path if needed

try {
    if (fs.existsSync(serviceAccountPath)) {
        // For simplicity in dev, load the whole key file and treat it as a token
        // In prod, use a more robust method like generating a short-lived token
        const keyFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        // THIS IS A SIMPLIFICATION: Using the whole key content directly as Bearer token
        // In production, you should generate an OIDC token or use ADC for service-to-service auth.
        SERVICE_ACCOUNT_TOKEN = keyFileContent;
        console.log('Loaded service account key for secret-service authentication.');
    } else {
        console.warn(`WARNING: Service account key not found at ${serviceAccountPath}. Secret service calls may fail.`);
    }
} catch (err) {
    console.error('Error loading service account key:', err);
}

function getAuthHeaders(): { Authorization?: string } {
    if (!SERVICE_ACCOUNT_TOKEN) {
        console.error('Cannot make authenticated call to secret-service: service account token not loaded.');
        // Depending on requirements, could throw error or return empty headers
        return {}; 
    }
    // Using simplified Bearer token method
    return { Authorization: `Bearer ${SERVICE_ACCOUNT_TOKEN}` };
}

// --- API Call Wrappers ---

/**
 * Stores an API key secret by calling the secret-service.
 * Uses secretType = 'api_key_<keyId>'.
 * 
 * @param {string} userId - The ID of the user owning the key (for the header).
 * @param {string} keyId - The unique ID of the API key.
 * @param {string} apiKeyPayload - The full API key value to store.
 * @returns {Promise<void>}
 * @throws {Error} If the API call fails.
 */
export async function storeSecret(userId: string, keyId: string, apiKeyPayload: string): Promise<void> {
  const url = `${SECRET_SERVICE_URL}/api/store-secret`;
  const secretType = `api_key_${keyId}`;
  console.log(`Attempting to store secret via secret-service: type=${secretType}, user=${userId}`);
  
  try {
    const response = await axios.post(url, 
        { 
            secretType: secretType, 
            secretValue: apiKeyPayload 
        }, 
        { 
            headers: { 'x-user-id': userId } 
        } 
    );

    // Assuming secret-service returns 200 OK on success based on route code
    if (response.status === 200 && response.data?.success) {
        console.log(`Successfully stored secret ${secretType} via secret-service.`);
    } else {
        console.error(`secret-service POST /api/store-secret failed for ${secretType}: Status ${response.status}`, response.data);
        throw new Error(`Failed to store secret ${secretType} via secret-service. Status: ${response.status}, Error: ${response.data?.error}`);
    }
  } catch (error) {
    console.error(`Error calling secret-service to store secret ${secretType}:`, axios.isAxiosError(error) ? error.response?.data || error.message : error);
    throw new Error(`API call failed when storing secret ${secretType}`);
  }
}

/**
 * Retrieves an API key secret by calling the secret-service.
 * Uses secretType = 'api_key_<keyId>'.
 *
 * @param {string} userId - The ID of the user who should own the key.
 * @param {string} keyId - The unique ID of the API key.
 * @returns {Promise<string | null>} The secret API key value or null if not found (API returns error/non-success).
 * @throws {Error} If the API call fails unexpectedly.
 */
export async function getSecret(userId: string, keyId: string): Promise<string | null> {
  const url = `${SECRET_SERVICE_URL}/api/get-secret`;
  const secretType = `api_key_${keyId}`;
  console.log(`Attempting to retrieve secret via secret-service: type=${secretType}, user=${userId}`);

  try {
    const response = await axios.post<{ success: boolean, value?: string, error?: string }>(url, {
        userId: userId,
        secretType: secretType
    });

    // Check for success and presence of value based on secret-service route logic
    if (response.status === 200 && response.data?.success && response.data.value !== undefined) {
      console.log(`Successfully retrieved secret ${secretType} via secret-service.`);
      return response.data.value;
    } else {
        // Handle cases where the secret wasn't found or another error occurred according to secret-service
        console.log(`Secret ${secretType} not found or error from secret-service:`, response.data?.error || `Status ${response.status}`);
        return null; // Treat non-success/missing value as not found
    }

  } catch (error) {
    // Log unexpected errors during the API call itself (network issues, 5xx from secret-service)
    console.error(`Error calling secret-service to retrieve secret ${secretType}:`, axios.isAxiosError(error) ? error.response?.data || error.message : error);
    // Don't treat generic errors as "not found", rethrow them
    throw new Error(`API call failed when retrieving secret ${secretType}`); 
  }
} 