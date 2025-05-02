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
  const apiKey = process.env.XATA_API_KEY;
  const databaseURL = process.env.XATA_DATABASE_URL;
  
  if (!apiKey) {
    throw new Error("Xata API Key not configured in environment variables (XATA_API_KEY).");
  }
  if (!databaseURL) {
    throw new Error("Xata Database URL not configured in environment variables (XATA_DATABASE_URL).");
  }
  
  // Return a new instance of the client with the required configuration
  return new BaseClient({ 
    apiKey: apiKey,
    databaseURL: databaseURL,
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
  const databaseUrl = process.env.XATA_DATABASE_URL;
  
  // Modify the URL to point to the specific database
  // Ensure databaseUrl is defined before replacing
  if (!databaseUrl) {
    throw new Error("XATA_DATABASE_URL is not set in environment variables.");
  }
  const userDatabaseUrl = databaseUrl.replace(/\/db\/[^/]+$/, `/db/${databaseId}`);
  
  // Create a client for the specific database
  return new BaseClient({
    databaseURL: userDatabaseUrl,
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH
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
 * Interface for the structure of a single table's info within a database
 */
export interface TableInfo {
  id: string; // Consistent ID format, e.g., table_${tableName}
  name: string;
  description?: string; // Optional description
  schema: Record<string, string>; // Column name -> Xata type
}

/**
 * Get all available Xata workspaces
 * @returns Array of workspaces
 * @throws Error if API key is missing or API call fails
 */
export async function getXataWorkspaces(): Promise<Workspace[]> {
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('Service configuration error: XATA_API_KEY not set');
  }
  
  // List workspaces
  const response = await fetch('https://api.xata.io/workspaces', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: Failed to list workspaces: ${response.status} ${response.statusText}. ${errorText}`);
  }
  
  const data = await response.json() as { workspaces: Workspace[] };
  
  if (!data.workspaces || data.workspaces.length === 0) {
     console.warn('No Xata workspaces found for the provided API key.');
     return []; // Return empty array if no workspaces found
  }
  
  return data.workspaces;
}

/**
 * Find a workspace by slug or name
 * @param slugOrName The slug or name of the workspace to find
 * @returns The workspace if found, null otherwise
 * @throws Propagates errors from getXataWorkspaces
 */
export async function findXataWorkspace(slugOrName: string): Promise<Workspace | null> {
  // Propagates errors from getXataWorkspaces
  const workspaces = await getXataWorkspaces();
    
  // Find workspace by slug or name
  const workspace = workspaces.find(ws => 
    ws.slug === slugOrName || ws.name === slugOrName
  );
    
  return workspace || null; // Return null if not found
}

/**
 * Create a new Xata database in a workspace
 * @param workspaceId The ID of the workspace to create the database in
 * @param databaseName The name of the database to create
 * @param region The region to create the database in (default: us-east-1)
 * @returns The created database response JSON if successful
 * @throws Error if API key is missing or API call fails
 */
export async function createXataDatabase(
  workspaceId: string, 
  databaseName: string, 
  region: string = 'us-east-1'
): Promise<any> { // Return type could be more specific if needed
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('Service configuration error: XATA_API_KEY not set');
  }
  
  // Create database in the workspace
  const response = await fetch(`https://api.xata.io/workspaces/${workspaceId}/dbs/${databaseName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      region: region
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    // Check for specific error indicating database already exists? (e.g., 409 Conflict)
    if (response.status === 409) {
       console.warn(`Database '${databaseName}' already exists in workspace '${workspaceId}'. Proceeding assuming it's usable.`);
       // Return a mock success or fetch existing DB info if needed? For now, just return null or empty object.
       return { message: "Database already exists" }; 
    }
    throw new Error(`API Error: Failed to create Xata database '${databaseName}': ${response.status} - ${errorText}`);
  }
  
  return await response.json();
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
 * @param workspace The workspace object containing the database
 * @returns The created table response JSON if successful
 * @throws Error if API key, workspace info is missing, or API call fails
 */
export async function createXataTable(
  databaseName: string,
  tableName: string,
  workspace: Workspace
): Promise<any> { // Return type could be more specific
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  if (!apiKey) {
    throw new Error('Service configuration error: XATA_API_KEY not set');
  }
  if (!workspace || !workspace.slug || !workspace.unique_id) {
     throw new Error('Invalid workspace provided for creating table.');
  }
  
  const region = 'us-east-1'; // TODO: Make configurable?
  const branch = 'main'; // TODO: Make configurable?
  const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
  
  // Create table in the database
  const response = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/${tableName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({}) // Empty body for table creation
  });
  
  if (!response.ok) {
    const errorText = await response.text();
     // Check for specific error indicating table already exists? (e.g., 4xx)
     if (response.status === 400 && errorText.includes('already exists')) {
        console.warn(`Table '${tableName}' already exists in database '${databaseName}'. Proceeding.`);
        // Return a mock success or fetch existing table info?
        return { message: `Table '${tableName}' already exists.` };
     }
    throw new Error(`API Error: Failed to create table '${tableName}': ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Add a column to a table in a Xata database
 * @param databaseName The name of the database
 * @param tableName The name of the table
 * @param columnName The name of the column to add
 * @param columnType The data type of the column (must be a valid Xata type)
 * @param workspace The workspace object containing the database
 * @returns The column creation response JSON if successful
 * @throws Error if API key, workspace info is missing, or API call fails
 */
export async function addXataTableColumn(
  databaseName: string,
  tableName: string,
  columnName: string,
  columnType: string, // TODO: Add validation for known Xata types?
  workspace: Workspace
): Promise<any> { // Return type could be more specific
  // Get Xata API key
  const apiKey = process.env.XATA_API_KEY;
  if (!apiKey) {
    throw new Error('Service configuration error: XATA_API_KEY not set');
  }
   if (!workspace || !workspace.slug || !workspace.unique_id) {
     throw new Error('Invalid workspace provided for adding column.');
  }
  
  const region = 'us-east-1'; // TODO: Make configurable?
  const branch = 'main'; // TODO: Make configurable?
  const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
  
  // Add column to the table
  const response = await fetch(`${workspaceUrl}/db/${databaseName}:${branch}/tables/${tableName}/columns`, {
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
  
  if (!response.ok) {
    const errorText = await response.text();
     // Check for specific error indicating column already exists? (e.g., 400)
     if (response.status === 400 && errorText.includes('already exists')) {
        console.warn(`Column '${columnName}' already exists in table '${tableName}'. Proceeding.`);
        // Return mock success?
         return { message: `Column '${columnName}' already exists.` };
     }
    throw new Error(`API Error: Failed to add column '${columnName}': ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Get information about a Xata database including tables and schemas.
 * @param databaseId The ID/name of the database.
 * @returns An object containing database details.
 * @throws Error if configuration is missing or API calls fail.
 */
export async function getXataDatabaseInfo(databaseId: string): Promise<{ database_id: string; database_name: string; tables: TableInfo[]; }> {
  const logPrefix = '[XATA_CLIENT_GET_INFO]'; // Updated log prefix
  try {
    const apiKey = process.env.XATA_API_KEY;
    if (!apiKey) {
      throw new Error('Service configuration error: XATA_API_KEY not set');
    }
    
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    if (!workspaceSlug) {
      throw new Error('Service configuration error: XATA_WORKSPACE_SLUG not set');
    }
    
    const workspace = await findXataWorkspace(workspaceSlug);
    if (!workspace) {
      // findXataWorkspace now returns null if not found, handle it here
      throw new Error(`Configuration error: Workspace '${workspaceSlug}' not found`);
    }
    
    // Common Xata API details
    const region = 'us-east-1'; // TODO: Make configurable?
    const branch = 'main'; // TODO: Make configurable?
    const workspaceUrl = `https://${workspace.slug}-${workspace.unique_id}.${region}.xata.sh`;
    const authHeader = { 'Authorization': `Bearer ${apiKey}` };
    
    // 1. Get overall database info (mainly to confirm existence and get official name)
    console.log(`${logPrefix} Fetching info for database: ${databaseId}`);
    const dbResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}`, {
      method: 'GET',
      headers: authHeader
    });
    
    // A 404 here means the database doesn't exist in Xata for this workspace/branch
    if (dbResponse.status === 404) {
       throw new Error(`Database '${databaseId}' not found in Xata workspace '${workspaceSlug}'.`);
    }
    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      throw new Error(`API Error: Failed to get database info for '${databaseId}': ${dbResponse.status} ${dbResponse.statusText}. ${errorText}`);
    }
    // Extract database name if available, otherwise use the provided ID
    const dbData = await dbResponse.json() as { name?: string; [key: string]: any }; 
    const databaseName = dbData.name || databaseId;
    
    // 2. Get list of tables in the database
    console.log(`${logPrefix} Fetching tables for database: ${databaseId}`);
    const tablesResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}/tables`, {
      method: 'GET',
      headers: authHeader
    });
    
    if (!tablesResponse.ok) {
      const errorText = await tablesResponse.text();
      // If tables fail to load, maybe return DB info without tables? Or throw? Let's throw.
      throw new Error(`API Error: Failed to get tables for '${databaseId}': ${tablesResponse.status} ${tablesResponse.statusText}. ${errorText}`);
    }
    
    // Type definition for the table list response
    type XataTableListResponse = { tables?: Array<{ name: string; [key: string]: any }> };
    const tablesData = await tablesResponse.json() as XataTableListResponse;
    const tablesInfo: TableInfo[] = []; // Initialize array for TableInfo objects
    
    // 3. Get schema for each table found
    if (tablesData.tables && tablesData.tables.length > 0) {
      console.log(`${logPrefix} Fetching schema for ${tablesData.tables.length} tables...`);
      // Use Promise.all for potentially faster schema fetching
      await Promise.all(tablesData.tables.map(async (table) => {
        const tableName = table.name;
        try {
          const tableSchemaResponse = await fetch(`${workspaceUrl}/db/${databaseId}:${branch}/tables/${tableName}/schema`, {
            method: 'GET',
            headers: authHeader
          });
          
          if (!tableSchemaResponse.ok) {
            const errorText = await tableSchemaResponse.text();
            // Log warning but don't fail the whole operation for one table's schema
            console.warn(`${logPrefix} Failed to get schema for table '${tableName}': ${tableSchemaResponse.status}. ${errorText}`);
            // Add table with empty schema? Or skip? Let's skip for now.
            return; 
          }
          
          // Type definition for schema response
          type XataSchemaResponse = { columns?: Array<{ name: string; type: string; [key: string]: any }> };
          const tableSchemaData = await tableSchemaResponse.json() as XataSchemaResponse;
          const schema: Record<string, string> = {};
          
          // Convert Xata schema columns to simple key-value format
          if (tableSchemaData.columns) {
            tableSchemaData.columns.forEach(column => {
              schema[column.name] = column.type; // Store just the type
            });
          }
          
          // Add to our result array
          tablesInfo.push({
            id: `table_${tableName}`, // Construct a consistent ID
            name: tableName,
            description: `Schema for table ${tableName}`, // Basic description
            schema
          });
        } catch (schemaError: any) {
           console.warn(`${logPrefix} Error fetching schema for table '${tableName}':`, schemaError);
           // Skip this table on error
        }
      }));
      console.log(`${logPrefix} Finished fetching table schemas.`);
    } else {
       console.log(`${logPrefix} No tables found in database '${databaseId}'.`);
    }
    
    // --- Ensure Return Value Matches Updated Signature ---
    return {
      database_id: databaseId,
      database_name: databaseName, // Use the fetched name
      tables: tablesInfo
    };
  } catch (error: any) {
    console.error(`${logPrefix} Error getting Xata database info:`, error);
    // Re-throw the error with context
    throw new Error(`Failed to retrieve database information for \'${databaseId}\': ${error.message}`);
  }
} 