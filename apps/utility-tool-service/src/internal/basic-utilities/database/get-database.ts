/**
 * Database Information Utility
 * 
 * Returns database information including name, table info (ids, name, description, schema)
 * Uses Xata to manage databases for users.
 */
import { z } from 'zod'; // Import Zod
import { 
  InternalUtilityTool,
  ErrorResponse,
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';
// Removed BaseClient import as direct client usage is moved
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
// Import necessary functions and types from xata-client
import {
  findXataWorkspace,
  createXataDatabase,
  getXataDatabaseInfo,
  generateUniqueDatabaseName,
  Workspace, // Import Workspace interface
  TableInfo // Import TableInfo interface
} from '../../clients/xata-client.js';

// Database service URL from environment variable
const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;

// --- Local Type Definitions ---
// Workspace interface is now imported from xata-client
/*
interface Workspace {
  id: string;
  name: string;
  slug: string;
  unique_id: string;
  role?: string;
  plan?: string;
}
*/

// Removed WorkspacesResponse - No longer needed locally
/*
interface WorkspacesResponse {
  workspaces: Workspace[];
}
*/

/**
 * Interface for user data response from the internal DB service
 */
interface UserDataResponse {
  success: boolean;
  data?: {
    id: string;
    data: {
      database_id?: string;
      [key: string]: any;
    };
  };
  error?: string;
}

/**
 * Success response structure for this utility
 */
interface GetDatabaseSuccessResponse {
  status: 'success';
  data: {
    database_id: string;
    database_name: string;
    tables: TableInfo[]; // Use TableInfo interface
  }
}

// Type union for the utility's response
type GetDatabaseResponse = GetDatabaseSuccessResponse | ErrorResponse;

// --- End Local Definitions ---

// Removed Xata helper functions that are now in xata-client.ts
// - getXataClient
// - getXataWorkspaces
// - findXataWorkspace
// - generateUniqueDatabaseName
// - createXataDatabase
// - getXataDatabaseInfo

/**
 * Get the database ID associated with a user from the internal DB service.
 * This function remains local as it interacts with DB_SERVICE_URL, not Xata directly.
 * @param userId - The ID of the user.
 * @returns The database ID string or null if not found or error occurred.
 */
async function getUserDatabaseId(userId: string): Promise<string | null> {
  if (!DB_SERVICE_URL) {
    console.error('Service configuration error: DATABASE_SERVICE_URL not set');
    return null; // Indicate configuration error
  }
  try {
    const response = await fetch(`${DB_SERVICE_URL}/db/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // If user not found (404), it's not an error, just means no DB ID yet
    if (response.status === 404) {
      console.log(`No database record found for user ${userId} in internal service.`);
      return null;
    }
    
    if (!response.ok) {
      // Log other errors but return null, let the caller decide if it's critical
      console.error(`Failed to get user data from internal service: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as UserDataResponse;
    
    if (data.success && data.data?.data?.database_id) {
      return data.data.data.database_id;
    }
    
    return null;
  } catch (error: any) {
    console.error("Error checking user database ID:", error);
    return null; // Network or parsing error
  }
}

/**
 * Create a new Xata database (using helper from xata-client) 
 * AND associate it with a user via the internal DB service.
 * This function remains local as it orchestrates both Xata and internal service calls.
 * @param userId - The ID of the user.
 * @returns The newly created database name (ID) or null if creation failed.
 * @throws Error if configuration is missing or critical API calls fail.
 */
async function createUserDatabase(userId: string): Promise<string | null> {
  const logPrefix = '[DB_CREATE_USER_DB]';
  try {
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    if (!workspaceSlug) {
      throw new Error('Service configuration error: XATA_WORKSPACE_SLUG not set');
    }
    
    // Use findXataWorkspace from xata-client.js
    const workspace = await findXataWorkspace(workspaceSlug);
    if (!workspace) {
      // findXataWorkspace throws specific errors if needed
      throw new Error(`Configuration error: Workspace '${workspaceSlug}' not found`);
    }
    
    // Use generateUniqueDatabaseName from xata-client.js
    const databaseName = generateUniqueDatabaseName('user');
    
    // Create the new database in the Xata workspace using helper
    console.log(`${logPrefix} Attempting to create Xata database '${databaseName}' in workspace '${workspace.id}'`);
    // Use createXataDatabase from xata-client.js
    await createXataDatabase(workspace.id, databaseName);
    console.log(`${logPrefix} Xata database ${databaseName} created successfully.`);
    
    // Update user in database service with the new database_id
    if (!DB_SERVICE_URL) {
      throw new Error('Service configuration error: DATABASE_SERVICE_URL not set');
    }
    console.log(`${logPrefix} Updating user '${userId}' in internal service with db_id: ${databaseName}`);
    const updateResponse = await fetch(`${DB_SERVICE_URL}/db/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          database_id: databaseName
        },
        updated_at: new Date().toISOString()
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`${logPrefix} Failed to update user record for '${userId}' with database ID '${databaseName}': ${updateResponse.status}. ${errorText}`);
      // Decide if this is critical. For now, log and return DB name, but maybe throw?
    } else {
      console.log(`${logPrefix} Successfully updated user '${userId}' record.`);
    }
    
    return databaseName;
  } catch (error: any) {
    console.error(`${logPrefix} Error creating user database:`, error);
    throw new Error(`Failed to create user database: ${error.message}`);
  }
}

/**
 * Get or create a database for a user, then return its info.
 * This function remains local as it orchestrates the user-specific DB logic.
 * @param userId - The ID of the user.
 * @returns Database information object matching GetDatabaseSuccessResponse['data'].
 * @throws Error if user ID is missing, or if DB creation/retrieval fails critically.
 */
async function getUserDatabase(userId: string): Promise<GetDatabaseSuccessResponse['data']> {
  const logPrefix = '[DB_GET_USER_DB]';
  try {
    if (!userId) {
      throw new Error("User ID is required to get or create a database");
    }
    
    console.log(`${logPrefix} Checking for existing database ID for user: ${userId}`);
    let databaseId = await getUserDatabaseId(userId);
    
    if (!databaseId) {
      console.log(`${logPrefix} No database ID found for user ${userId}, attempting to create one...`);
      databaseId = await createUserDatabase(userId);
      
      if (!databaseId) {
        throw new Error("Failed to create and associate a database for the user.");
      }
      console.log(`${logPrefix} Created and associated new database '${databaseId}' for user ${userId}.`);
    } else {
       console.log(`${logPrefix} Found existing database ID '${databaseId}' for user ${userId}.`);
    }
    
    console.log(`${logPrefix} Retrieving database details for ID: ${databaseId}`);
    // Use getXataDatabaseInfo from xata-client.js (returns correct type now)
    const dbInfo = await getXataDatabaseInfo(databaseId);
    return dbInfo; 

  } catch (error: any) {
    console.error(`${logPrefix} Error getting or creating user database:`, error);
    throw error; 
  }
}

/**
 * Implementation of the Get Database utility
 */
const getDatabaseUtility: InternalUtilityTool = {
  id: 'utility_get_database',
  description: 'Get information about the user\'s dedicated database, including tables and schemas. If no database exists for the user, one will be created.',
  schema: {
    type: 'object',
    properties: {}
  },
  
  execute: async (userId: string, conversationId: string): Promise<GetDatabaseResponse> => {
    const logPrefix = '📊 [DB_GET_DATABASE]';
    try {
      console.log(`${logPrefix} Getting database information for user ${userId}`);
      const databaseInfo = await getUserDatabase(userId);
      
      const successResponse: GetDatabaseSuccessResponse = {
        status: 'success',
        data: databaseInfo
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to get database information",
        details: error.message || String(error)
      };
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(getDatabaseUtility);

// Export the utility
export default getDatabaseUtility;