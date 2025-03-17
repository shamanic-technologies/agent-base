/**
 * Xata Client Service
 * 
 * Comprehensive implementation of Xata client services for database management
 * Handles workspace discovery, database creation, and schema management
 */

import { BaseClient } from '@xata.io/client';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get a configured Xata client for the default database
 * @returns A configured Xata client
 */
export function getXataClient() {
  // Create a client for the default database
  return new BaseClient({
    databaseURL: process.env.XATA_DATABASE_URL || 'https://helloworld-database-url.us-east-1.xata.sh/db/helloworld',
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH || 'main'
  });
}

/**
 * Get a Xata client for a specific database
 * @param databaseId The database ID to configure the client for
 * @returns A configured Xata client for the specified database
 */
export function getXataClientForDatabase(databaseId: string) {
  // Get the database URL from environment or default
  const databaseUrl = process.env.XATA_DATABASE_URL || 'https://helloworld-database-url.us-east-1.xata.sh/db/helloworld';
  
  // Modify the URL to point to the specific database
  const userDatabaseUrl = databaseUrl.replace(/\/db\/[^/]+$/, `/db/${databaseId}`);
  
  // Create a client for the specific database
  return new BaseClient({
    databaseURL: userDatabaseUrl,
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH || 'main'
  });
}

/**
 * Interface for a Xata workspace
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  unique_id: string;
  role?: string;
  plan?: string;
}

/**
 * Get all available Xata workspaces
 * @returns Array of workspaces
 */
export async function getXataWorkspaces(): Promise<Workspace[]> {
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  // List workspaces
  const workspacesResponse = await fetch('https://api.xata.io/workspaces', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!workspacesResponse.ok) {
    throw new Error(`Failed to list workspaces: ${workspacesResponse.status} ${workspacesResponse.statusText}`);
  }
  
  const workspacesData = await workspacesResponse.json() as { workspaces: Workspace[] };
  
  if (!workspacesData.workspaces || workspacesData.workspaces.length === 0) {
    throw new Error('No workspaces found');
  }
  
  return workspacesData.workspaces;
}

/**
 * Find a workspace by slug or name
 * @param slugOrName The slug or name of the workspace to find
 * @returns The workspace if found, null otherwise
 */
export async function findXataWorkspace(slugOrName: string): Promise<Workspace | null> {
  try {
    const workspaces = await getXataWorkspaces();
    
    // Find workspace by slug or name
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
 * Create a new Xata database in a workspace
 * @param workspaceId The ID of the workspace to create the database in
 * @param databaseName The name of the database to create
 * @param region The region to create the database in
 * @returns The created database response if successful
 */
export async function createXataDatabase(
  workspaceId: string, 
  databaseName: string, 
  region: string = 'us-east-1'
): Promise<any> {
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  // Create database in the workspace
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
 * Generate a unique database name for a user
 * @param prefix Optional prefix for the database name
 * @returns A unique database name
 */
export function generateUniqueDatabaseName(prefix: string = 'user'): string {
  const databaseId = uuidv4().substring(0, 8);
  return `${prefix}-${databaseId}`;
}

/**
 * Create a table in a Xata database
 * @param databaseName The name of the database to create the table in
 * @param tableName The name of the table to create
 * @param workspace The workspace containing the database
 * @returns The created table response if successful
 */
export async function createXataTable(
  databaseName: string,
  tableName: string,
  workspace: Workspace
): Promise<any> {
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  const region = 'us-east-1'; // Default region
  const branch = 'main'; // Default branch
  const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
  
  // Create table in the database
  const createTableResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/${tableName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({})
  });
  
  if (!createTableResponse.ok) {
    const errorText = await createTableResponse.text();
    throw new Error(`Failed to create table: ${createTableResponse.status} - ${errorText}`);
  }
  
  return await createTableResponse.json();
}

/**
 * Add a column to a table in a Xata database
 * @param databaseName The name of the database
 * @param tableName The name of the table
 * @param columnName The name of the column to add
 * @param columnType The data type of the column
 * @param workspace The workspace containing the database
 * @returns The column creation response if successful
 */
export async function addXataTableColumn(
  databaseName: string,
  tableName: string,
  columnName: string,
  columnType: string,
  workspace: Workspace
): Promise<any> {
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('XATA_API_KEY is required in environment variables');
  }
  
  const region = 'us-east-1'; // Default region
  const branch = 'main'; // Default branch
  const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
  
  // Add column to the table
  const addColumnResponse = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/${tableName}/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      name: columnName,
      type: columnType
    })
  });
  
  if (!addColumnResponse.ok) {
    const errorText = await addColumnResponse.text();
    throw new Error(`Failed to add column: ${addColumnResponse.status} - ${errorText}`);
  }
  
  return await addColumnResponse.json();
}

/**
 * Get information about a Xata database including tables and schemas
 * @param databaseId The ID of the database
 * @returns Database information including tables and schemas
 */
export async function getXataDatabaseInfo(databaseId: string): Promise<Record<string, any>> {
  try {
    // In a real implementation, you would use the Xata SDK to get actual database information
    // For now, we return mock data
    const tablesInfo = [
      {
        id: "table_001",
        name: "users",
        description: "Contains user information",
        schema: {
          id: "string",
          name: "string",
          email: "string",
          created_at: "datetime"
        }
      },
      {
        id: "table_002",
        name: "products",
        description: "Product catalog",
        schema: {
          id: "string",
          name: "string",
          price: "number",
          category: "string",
          in_stock: "boolean"
        }
      }
    ];
    
    return {
      database_id: databaseId,
      database_name: databaseId,
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