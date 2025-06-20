import fetch from 'node-fetch';
import { createHash } from 'crypto';
import type { NeonProject, ConnectionURI } from './types.js';

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