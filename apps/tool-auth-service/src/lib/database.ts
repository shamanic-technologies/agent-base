/**
 * Database Service Client
 * 
 * Handles all interactions with the database service
 */
import axios from 'axios';
import { 
  Credential, 
  CreateOrUpdateCredentialsInput, 
  DatabaseResponse,
  CredentialsResponse,
  GetUserCredentialsInput
} from '@agent-base/agents';

const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;

// Re-export the types for convenience
export type { Credential, CreateOrUpdateCredentialsInput, DatabaseResponse };

/**
 * Create new user credentials
 */
export async function createOrUpdateCredentials(
  input: CreateOrUpdateCredentialsInput
): Promise<DatabaseResponse> {
  try {
    const response = await axios.post(`${DB_SERVICE_URL}/credentials`, input);
    return response.data;
  } catch (error) {
    console.error('Error creating credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get user credentials by user ID
 */
export async function getCredentials(
  input: GetUserCredentialsInput
): Promise<CredentialsResponse<Credential[]>> {
  try {
    const response = await axios.get(`${DB_SERVICE_URL}/credentials`, {
      data: input
    });
    return response.data;
  } catch (error) {
    console.error('Error getting credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// /**
//  * Update user credentials
//  */
// export async function updateCredentials(
//   userId: string,
//   input: UpdateCredentialsInput
// ): Promise<DatabaseResponse<Credentials>> {
//   try {
//     const response = await axios.patch(`${DB_SERVICE_URL}/credentials/${userId}`, input);
//     return response.data;
//   } catch (error) {
//     console.error('Error updating credentials:', error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error occurred'
//     };
//   }
// } 