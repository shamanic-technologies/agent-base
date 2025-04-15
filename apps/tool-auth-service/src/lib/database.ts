/**
 * Database Service Client
 * 
 * Handles all interactions with the database service
 */
import {
  OAuth, 
  CreateOrUpdateCredentialsInput, 
  DatabaseResponse,
  CredentialsResponse,
  GetUserCredentialsInput
} from '@agent-base/types';
// Import the shared HTTP client utility
import { makeServiceRequest } from '@agent-base/types';

const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;

// Re-export the types for convenience
export type { OAuth, CreateOrUpdateCredentialsInput, DatabaseResponse };

/**
 * Create or update user credentials using the shared HTTP client utility.
 */
export async function createOrUpdateCredentials(
  input: CreateOrUpdateCredentialsInput
): Promise<DatabaseResponse> {
  if (!DB_SERVICE_URL) {
    console.error('DATABASE_SERVICE_URL is not defined.');
    return { success: false, error: 'Database service URL not configured.' };
  }
  // Use makeServiceRequest for POST request
  return makeServiceRequest<void>(
    DB_SERVICE_URL,
    'POST',
    '/credentials',
    undefined, // No specific userId needed in header for this endpoint
    input // Send input as the request body (data)
  );
}

/**
 * Get user credentials by user ID using the shared HTTP client utility.
 */
export async function getCredentials(
  input: GetUserCredentialsInput
): Promise<CredentialsResponse<OAuth[]>> {
  if (!DB_SERVICE_URL) {
    console.error('DATABASE_SERVICE_URL is not defined.');
    return { success: false, error: 'Database service URL not configured.' };
  }
  // Use makeServiceRequest for GET request, sending input as query parameters
  return makeServiceRequest<OAuth[]>(
    DB_SERVICE_URL,
    'GET',
    '/credentials',
    undefined, // No specific userId needed in header for this endpoint
    undefined, // No request body (data)
    input // Send input as query parameters (params)
  );
}
