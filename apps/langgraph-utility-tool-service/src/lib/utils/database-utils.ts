/**
 * Database Utilities
 * 
 * Utility functions for database operations and user database management
 */

import { findXataWorkspace, generateUniqueDatabaseName, createXataDatabase, getXataDatabaseInfo } from "../xata-client.js";
import fetch from "node-fetch";

// Database service URL from environment variable
const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Check if a user has an assigned database ID in the database service
 * @param userId The user ID to check
 * @returns The database ID if found, null otherwise
 */
export async function getUserDatabaseId(userId: string): Promise<string | null> {
  try {
    // Get user data from database service
    const response = await fetch(`${DB_SERVICE_URL}/db/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to get user data: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as { 
      success: boolean; 
      data: { 
        id: string; 
        data: { 
          database_id?: string;
          [key: string]: any; 
        };
      };
    };
    
    // Check if user has a database_id in their data
    if (data.success && data.data && data.data.data && data.data.data.database_id) {
      return data.data.data.database_id;
    }
    
    return null;
  } catch (error) {
    console.error("Error checking user database ID:", error);
    return null;
  }
}

/**
 * Create a new Xata database and associate it with a user
 * @param userId The user ID to associate with the new database
 * @returns The database ID if created successfully, null otherwise
 */
export async function createUserDatabase(userId: string): Promise<string | null> {
  try {
    // Get Xata credentials from environment variables
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    
    if (!workspaceSlug) {
      throw new Error('XATA_WORKSPACE_SLUG is required in environment variables');
    }
    
    // Find the workspace
    const workspace = await findXataWorkspace(workspaceSlug);
    
    if (!workspace) {
      throw new Error(`Workspace with slug/name "${workspaceSlug}" not found`);
    }
    
    // Generate a unique database name for this user
    const databaseName = generateUniqueDatabaseName('user');
    
    // Create a new database in the workspace
    await createXataDatabase(workspace.id, databaseName);
    
    console.log(`Database ${databaseName} created successfully`);
    
    // Update user in database service with the new database_id
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
      console.error(`Failed to update user with database ID: ${updateResponse.status}`);
      // Don't throw here, we'll still return the database ID even if the update failed
    }
    
    return databaseName;
  } catch (error) {
    console.error("Error creating user database:", error);
    return null;
  }
}

/**
 * Get or create a database for a user
 * @param userId The user ID to get or create a database for
 * @returns Object with database information or error details
 */
export async function getUserDatabase(userId: string): Promise<Record<string, any>> {
  try {
    if (!userId) {
      throw new Error("User ID is required to get or create a database");
    }
    
    // Check if user has a database ID
    let databaseId = await getUserDatabaseId(userId);
    
    // If not, create a new database
    if (!databaseId) {
      console.log(`No database found for user ${userId}, creating one...`);
      databaseId = await createUserDatabase(userId);
      
      if (!databaseId) {
        throw new Error("Failed to create database for user");
      }
      
      console.log(`Created new database ${databaseId} for user ${userId}`);
    }
    
    // Get database information
    return await getXataDatabaseInfo(databaseId);
  } catch (error) {
    console.error("Error getting user database:", error);
    return {
      error: "Failed to get database information",
      details: error instanceof Error ? error.message : String(error)
    };
  }
} 