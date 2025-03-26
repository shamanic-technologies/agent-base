/**
 * Database Information Utility
 * 
 * Returns database information including name, table info (ids, name, description, schema)
 * Uses Xata to manage databases for users.
 */
import { BasicUtilityTool } from '../../types/index.js';
import { registry } from '../../registry/registry.js';
import { BaseClient } from '@xata.io/client';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Database service URL from environment variable
const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;

/**
 * Interface for a Xata workspace
 */
interface Workspace {
  id: string;
  name: string;
  slug: string;
  unique_id: string;
  role?: string;
  plan?: string;
}

/**
 * Interface for workspaces response
 */
interface WorkspacesResponse {
  workspaces: Workspace[];
}

/**
 * Interface for user data response
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
 * Get a configured Xata client for the default database
 */
function getXataClient() {
  return new BaseClient({
    databaseURL: process.env.XATA_DATABASE_URL,
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH
  });
}

/**
 * Get all available Xata workspaces
 */
async function getXataWorkspaces(): Promise<Workspace[]> {
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  const workspacesResponse = await fetch('https://api.xata.io/workspaces', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!workspacesResponse.ok) {
    throw new Error(`Failed to list workspaces: ${workspacesResponse.status} ${workspacesResponse.statusText}`);
  }
  
  const workspacesData = await workspacesResponse.json() as WorkspacesResponse;
  
  if (!workspacesData.workspaces || workspacesData.workspaces.length === 0) {
    throw new Error('No workspaces found');
  }
  
  return workspacesData.workspaces;
}

/**
 * Find a workspace by slug or name
 */
async function findXataWorkspace(slugOrName: string): Promise<Workspace | null> {
  try {
    const workspaces = await getXataWorkspaces();
    
    const workspace = workspaces.find(ws => 
      ws.slug === slugOrName || ws.name === slugOrName
    );
    
    return workspace || null;
  } catch (error) {
    console.error("Error finding Xata workspace:", error);
    return null;
  }
}

/**
 * Generate a unique database name for a user
 */
function generateUniqueDatabaseName(prefix = 'user'): string {
  const databaseId = uuidv4().substring(0, 8);
  return `${prefix}-${databaseId}`;
}

/**
 * Check if a user has an assigned database ID in the database service
 */
async function getUserDatabaseId(userId: string): Promise<string | null> {
  try {
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
    
    const data = await response.json() as UserDataResponse;
    
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
 */
async function createUserDatabase(userId: string): Promise<string | null> {
  try {
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    
    if (!workspaceSlug) {
      throw new Error('XATA_WORKSPACE_SLUG is required in environment variables');
    }
    
    const workspace = await findXataWorkspace(workspaceSlug);
    
    if (!workspace) {
      throw new Error(`Workspace with slug/name "${workspaceSlug}" not found`);
    }
    
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
    }
    
    return databaseName;
  } catch (error) {
    console.error("Error creating user database:", error);
    return null;
  }
}

/**
 * Create a new Xata database in a workspace
 */
async function createXataDatabase(
  workspaceId: string, 
  databaseName: string, 
  region = 'us-east-1'
): Promise<any> {
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  const createDatabaseResponse = await fetch(`https://api.xata.io/workspaces/${workspaceId}/dbs/${databaseName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      region: region
    })
  });
  
  if (!createDatabaseResponse.ok) {
    const errorText = await createDatabaseResponse.text();
    throw new Error(`Failed to create database: ${createDatabaseResponse.status} - ${errorText}`);
  }
  
  return await createDatabaseResponse.json();
}

/**
 * Get information about a Xata database including tables and schemas
 */
async function getXataDatabaseInfo(databaseId: string): Promise<Record<string, any>> {
  try {
    const apiKey = process.env.XATA_API_KEY;
    if (!apiKey) {
      throw new Error('XATA_API_KEY is required in environment variables');
    }
    
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    if (!workspaceSlug) {
      throw new Error('XATA_WORKSPACE_SLUG is required in environment variables');
    }
    
    const workspace = await findXataWorkspace(workspaceSlug);
    if (!workspace) {
      throw new Error(`Workspace with slug/name "${workspaceSlug}" not found`);
    }
    
    // Get list of tables in the database
    const region = 'us-east-1'; // Default region
    const branch = 'main'; // Default branch
    const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
    
    const databaseResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!databaseResponse.ok) {
      throw new Error(`Failed to get database: ${databaseResponse.status} ${databaseResponse.statusText}`);
    }
    
    const databaseData = await databaseResponse.json() as any;
    
    // Get tables list 
    const tablesResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}/tables`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!tablesResponse.ok) {
      throw new Error(`Failed to get tables: ${tablesResponse.status} ${tablesResponse.statusText}`);
    }
    
    const tablesData = await tablesResponse.json() as { tables?: Array<{ id?: string; name: string; description?: string }> };
    const tablesInfo = [];
    
    // Get schema for each table
    for (const table of tablesData.tables || []) {
      const tableResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}/tables/${table.name}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!tableResponse.ok) {
        console.warn(`Failed to get table schema for ${table.name}: ${tableResponse.status}`);
        continue;
      }
      
      const tableData = await tableResponse.json() as { columns?: Array<{ name: string; type: string }> };
      const schema: Record<string, string> = {};
      
      // Convert Xata schema to our simplified format
      if (tableData.columns) {
        tableData.columns.forEach(column => {
          schema[column.name] = column.type;
        });
      }
      
      tablesInfo.push({
        id: table.id || `table_${table.name}`,
        name: table.name,
        description: table.description || `Table containing ${table.name} data`,
        schema
      });
    }
    
    return {
      database_id: databaseId,
      database_name: databaseData.name || databaseId,
      tables: tablesInfo
    };
  } catch (error) {
    console.error("Error getting Xata database info:", error);
    return {
      database_id: databaseId,
      error: "Failed to retrieve database information",
      error_details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get or create a database for a user
 */
async function getUserDatabase(userId: string): Promise<Record<string, any>> {
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

/**
 * Implementation of the Get Database utility
 */
const getDatabaseUtility: BasicUtilityTool = {
  id: 'utility_get_database',
  description: 'Get information about the user\'s dedicated database, including tables and schemas',
  schema: {
    // No parameters needed
  },
  
  execute: async (userId: string, conversationId: string): Promise<any> => {
    try {
      console.log(`📊 [DATABASE] Getting database information for user ${userId}`);
      
      // Get or create user database and return its information
      const databaseInfo = await getUserDatabase(userId);
      
      return databaseInfo;
    } catch (error) {
      console.error("❌ [DATABASE] Error:", error);
      return {
        error: "Failed to get database information",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(getDatabaseUtility);

// Export the utility
export default getDatabaseUtility; 