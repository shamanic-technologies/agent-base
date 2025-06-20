import { BaseClient } from '@xata.io/client';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import type { Workspace } from './types.js';

// A cache to hold instantiated Xata clients
const clientCache = new Map<string, BaseClient>();

/**
 * Generates a deterministic, valid database name from a user ID and organization ID.
 * @param clientUserId The user's unique ID.
 * @param clientOrganizationId The organization's unique ID.
 * @returns A Xata-compatible database name.
 */
function generateDatabaseName(clientUserId: string, clientOrganizationId: string): string {
  const combinedId = `${clientOrganizationId}-${clientUserId}`;
  const hash = createHash('sha256').update(combinedId).digest('hex');
  // Truncate hash and prefix to ensure a valid and descriptive name
  return `db-${hash.substring(0, 24)}`;
}

/**
 * Finds a Xata workspace by its slug.
 * @param slug The slug of the workspace to find.
 * @returns The workspace if found, otherwise throws an error.
 */
async function findXataWorkspace(slug: string): Promise<Workspace> {
  const apiKey = process.env.XATA_API_KEY;
  if (!apiKey) {
    throw new Error('Service configuration error: XATA_API_KEY not set');
  }

  const response = await fetch('https://api.xata.io/workspaces', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: Failed to list workspaces: ${response.status}. ${errorText}`);
  }

  const { workspaces } = (await response.json()) as { workspaces: Workspace[] };
  const workspace = workspaces.find(ws => ws.slug === slug);

  if (!workspace) {
    throw new Error(`Configuration error: Workspace with slug '${slug}' not found.`);
  }

  return workspace;
}

/**
 * Creates a new Xata database if it doesn't already exist.
 * @param workspace The target workspace.
 * @param databaseName The name of the database to create.
 */
async function createXataDatabase(workspace: Workspace, databaseName: string): Promise<void> {
    const apiKey = process.env.XATA_API_KEY;
    const region = process.env.XATA_REGION || 'us-east-1';

    const response = await fetch(`https://api.xata.io/workspaces/${workspace.id}/dbs/${databaseName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ region }),
    });

    if (response.status === 409) { // 409 Conflict means it already exists
        console.log(`Database '${databaseName}' already exists. Proceeding.`);
        return;
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: Failed to create database '${databaseName}': ${response.status} - ${errorText}`);
    }
}


/**
 * Gets a Xata client for a specific database.
 * The client is cached to avoid re-instantiation.
 * @param databaseName The name of the database.
 * @returns A configured Xata client.
 */
function getXataClient(databaseName: string): BaseClient {
    if (clientCache.has(databaseName)) {
        return clientCache.get(databaseName)!;
    }

    const apiKey = process.env.XATA_API_KEY;
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    
    if (!apiKey || !workspaceSlug) {
        throw new Error("XATA_API_KEY and XATA_WORKSPACE_SLUG must be set.");
    }

    // This constructs the database URL dynamically.
    // Note: this part might need adjustment based on how workspace unique IDs are retrieved.
    // For now, we assume a standard URL format that we can build.
    // A better approach would be to get the full databaseURL from an API call when it's created.
    const databaseURL = `https://${workspaceSlug}.xata.sh/db/${databaseName}`;

    const client = new BaseClient({
        apiKey,
        databaseURL,
        branch: process.env.XATA_BRANCH || 'main',
    });

    clientCache.set(databaseName, client);
    return client;
}

/**
 * Retrieves a pre-configured Xata client for a given user and organization.
 * It ensures a database exists for the user-org pair, creating one if necessary.
 * 
 * @param clientUserId The user's unique identifier.
 * @param clientOrganizationId The organization's unique identifier.
 * @returns A promise that resolves to a Xata `BaseClient` instance.
 */
export async function getOrCreateClientForUser(clientUserId: string, clientOrganizationId: string): Promise<{client: BaseClient, databaseURL: string}> {
    const databaseName = generateDatabaseName(clientUserId, clientOrganizationId);
    
    const workspaceSlug = process.env.XATA_WORKSPACE_SLUG;
    if (!workspaceSlug) {
        throw new Error('Service configuration error: XATA_WORKSPACE_SLUG not set');
    }
    
    const databaseURL = `https://${workspaceSlug}.xata.sh/db/${databaseName}`;

    // Check cache first
    if (clientCache.has(databaseName)) {
        return { client: clientCache.get(databaseName)!, databaseURL };
    }


    // 1. Find the workspace
    const workspace = await findXataWorkspace(workspaceSlug);

    // 2. Create the database if it doesn't exist
    await createXataDatabase(workspace, databaseName);

    // 3. Get a configured client
    const client = getXataClient(databaseName);
    
    return { client, databaseURL };
} 