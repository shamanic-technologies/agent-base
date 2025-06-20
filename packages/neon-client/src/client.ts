import fetch from 'node-fetch';
import { createHash } from 'crypto';
import type { NeonProject, ConnectionURI } from './types.js';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import postgres from 'postgres';
import ws from 'ws';

// Configure WebSocket for the Neon driver
neonConfig.webSocketConstructor = ws;

const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const projectCache = new Map<string, NeonProject>();
const connectionStringCache = new Map<string, string>();

/**
 * Generates a deterministic, valid project name from a user ID and organization ID.
 * @param clientUserId The user's unique ID.
 * @param clientOrganizationId The organization's unique ID.
 * @returns A Neon-compatible project name.
 */
function generateProjectName(clientUserId: string, clientOrganizationId: string): string {
  const combinedId = `${clientOrganizationId}-${clientUserId}`;
  const hash = createHash('sha256').update(combinedId).digest('hex');
  // Use a prefix and a shortened hash for a readable, unique name
  return `db-${hash.substring(0, 16)}`;
}

/**
 * Retrieves the Neon API Key from environment variables.
 * This is an internal function.
 * @throws {Error} If NEON_API_KEY is not set.
 */
function getApiKey(): string {
  console.debug('[neon-client] Attempting to retrieve NEON_API_KEY...');
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.debug('[neon-client] NEON_API_KEY not found or is empty.');
    throw new Error('[neon-client] NEON_API_KEY environment variable is not set or is empty.');
  }
  console.debug('[neon-client] NEON_API_KEY retrieved successfully.');
  return apiKey.trim();
}

/**
 * Finds a Neon project by name.
 * @param projectName The name of the project to find.
 * @returns The project if found, otherwise null.
 */
async function findProjectByName(projectName: string): Promise<NeonProject | null> {
  if (projectCache.has(projectName)) {
    return projectCache.get(projectName)!;
  }

  const apiKey = getApiKey();

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
  };

  console.debug(`[neon-client] findProjectByName: Fetching projects with org-key.`);
  console.debug(`[neon-client] findProjectByName: Request headers: ${JSON.stringify(headers)}`);

  const response = await fetch(`${NEON_API_BASE}/projects`, {
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`Neon API Error: Failed to list projects. ${await response.text()}`);
  }

  const { projects } = (await response.json()) as { projects: NeonProject[] };
  const project = projects.find(p => p.name === projectName);
  
  if (project) {
    projectCache.set(projectName, project);
  }

  return project || null;
}

/**
 * Creates a new Neon project.
 * @param projectName The name of the project to create.
 * @returns The newly created project.
 */
async function createProject(projectName: string): Promise<NeonProject> {
  const apiKey = getApiKey();

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const body = {
    project: { name: projectName },
  };

  console.debug(`[neon-client] createProject: Creating project '${projectName}' with org-key.`);
  console.debug(`[neon-client] createProject: Request headers: ${JSON.stringify(headers)}`);
  console.debug(`[neon-client] createProject: Request body: ${JSON.stringify(body)}`);

  const response = await fetch(`${NEON_API_BASE}/projects`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Neon API Error: Failed to create project. ${await response.text()}`);
  }

  const { project: newProject } = (await response.json()) as { project: NeonProject };
  projectCache.set(projectName, newProject);
  return newProject;
}

/**
 * Retrieves the connection string for a given Neon project.
 * @param projectId The ID of the project.
 * @returns The PostgreSQL connection string.
 */
async function getConnectionString(projectId: string): Promise<string> {
  if (connectionStringCache.has(projectId)) {
    return connectionStringCache.get(projectId)!;
  }

  const apiKey = getApiKey();
  // The default database name is 'neondb' and the role is 'neondb_owner'
  const response = await fetch(`${NEON_API_BASE}/projects/${projectId}/connection_uri?database_name=neondb&role_name=neondb_owner`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Neon API Error: Failed to get connection URI. ${await response.text()}`);
  }

  const { connection_uri } = (await response.json()) as ConnectionURI;
  connectionStringCache.set(projectId, connection_uri);
  return connection_uri;
}

/**
 * Retrieves a PostgreSQL connection string for a given user and organization.
 * It ensures a database project exists for the user-org pair, creating one if necessary.
 * 
 * @param clientUserId The user's unique identifier.
 * @param clientOrganizationId The organization's unique identifier.
 * @returns A promise that resolves to a PostgreSQL connection string.
 */
export async function getOrCreateDbConnection(clientUserId: string, clientOrganizationId: string): Promise<string> {
    const projectName = generateProjectName(clientUserId, clientOrganizationId);
    
    let project = await findProjectByName(projectName);

    if (!project) {
        console.log(`No Neon project found for '${projectName}'. Creating a new one...`);
        project = await createProject(projectName);
        console.log(`Successfully created project '${project.name}' with ID '${project.id}'.`);
    }

    const connectionString = await getConnectionString(project.id);
    return connectionString;
}

const supportedTypes: Record<string, string> = {
  'string': 'VARCHAR(255)',
  'text': 'TEXT',
  'email': 'VARCHAR(255)',
  'int': 'INTEGER',
  'float': 'REAL',
  'bool': 'BOOLEAN',
  'datetime': 'TIMESTAMP WITH TIME ZONE'
};

const isValidIdentifier = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

/**
 * Creates a new table in the database.
 * @param tableName The name of the table to create.
 * @param schema The schema of the table.
 */
export async function createTable(tableName: string, schema: Record<string, string>): Promise<void> {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
  }

  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    const columnDefinitions = Object.entries(schema).map(([name, type]) => {
      if (!isValidIdentifier(name)) {
        throw new Error(`Invalid column name: ${name}`);
      }
      const pgType = supportedTypes[type.toLowerCase()];
      if (!pgType) {
        throw new Error(`Unsupported column type: ${type}`);
      }
      return `"${name}" ${pgType}`;
    });

    const finalQuery = `CREATE TABLE "${tableName}" (${columnDefinitions.join(', ')})`;
    
    await pool.query(finalQuery);
  } finally {
    await pool.end();
  }
}

/**
 * Gets a table's schema and data.
 * @param tableName The name of the table to retrieve.
 * @param limit The maximum number of rows to return.
 * @returns The table schema and data.
 */
export async function getTable(tableName: string, limit: number = 10): Promise<{ columns: { name: string; type: string; }[], rows: Record<string, any>[] }> {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
  }

  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const columnsResult = await pool.query({
      text: `
        SELECT column_name, data_type 
        FROM information_schema.columns
        WHERE table_name = $1;
      `,
      values: [tableName]
    });

    const rowsResult = await pool.query({
      text: `SELECT * FROM "${tableName}" LIMIT $1;`,
      values: [limit]
    });

    return {
      columns: columnsResult.rows.map(c => ({ name: c.column_name, type: c.data_type })),
      rows: rowsResult.rows
    };
  } finally {
    await pool.end();
  }
}

/**
 * Executes a raw SQL query against the database.
 * @param query The raw SQL query string to execute.
 * @returns The result of the query.
 */
export async function executeQuery(query: string): Promise<Record<string, any>[]> {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const result = await pool.query(query);
    return result.rows;
  } finally {
    await pool.end();
  }
} 