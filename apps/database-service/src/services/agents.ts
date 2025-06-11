/**
 * Agents Service
 * 
 * Handles all database operations related to agents
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import {
  AgentRecord,
  ListClientUserAgentsInput,
  CreateAgentInput,
  ServiceResponse,
  mapAgentFromDatabase,
  GetClientUserAgentInput,
  UpdateAgentInput,
  ConversationId,
  Agent,
  LinkAgentToClientUserInput,
  ErrorResponse,
} from '@agent-base/types';

const AGENTS_TABLE = 'agents';
const CLIENT_USER_AGENTS_TABLE = 'client_user_agents';
const CONVERSATIONS_TABLE = 'conversations';

/**
 * Creates a new agent in the database.
 * @param input - The agent data to create, excluding user_id.
 * @returns A BaseResponse indicating success or failure, with the created agent data on success.
 */
export async function createAgent(input: CreateAgentInput): Promise<ServiceResponse<Agent>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Insert new agent
    const result = await client.query(
      `INSERT INTO "${AGENTS_TABLE}" 
      (first_name, last_name, profile_picture, gender, model_id, memory, job_title)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.firstName,
        input.lastName,
        input.profilePicture,
        input.gender,
        input.modelId,
        input.memory,
        input.jobTitle
      ]
    );

    return {
      success: true,
      data: mapAgentFromDatabase(result.rows[0])
    };
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return { success: false, error: error.message || 'Failed to create agent' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Updates an existing agent in the database.
 * @param input - The agent data to update, excluding user_id.
 * @returns A BaseResponse indicating success or failure, with the updated agent data on success.
 */
export async function updateAgent(input: UpdateAgentInput): Promise<ServiceResponse<Agent>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Build the SQL update statement dynamically based on provided fields
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (input.firstName !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      params.push(input.firstName);
    }
    
    if (input.lastName !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      params.push(input.lastName);
    }
    
    if (input.profilePicture !== undefined) {
      updateFields.push(`profile_picture = $${paramIndex++}`);
      params.push(input.profilePicture);
    }
    
    if (input.gender !== undefined) {
      updateFields.push(`gender = $${paramIndex++}`);
      params.push(input.gender);
    }
    
    if (input.modelId !== undefined) {
      updateFields.push(`model_id = $${paramIndex++}`);
      params.push(input.modelId);
    }
    
    if (input.memory !== undefined) {
      updateFields.push(`memory = $${paramIndex++}`);
      params.push(input.memory);
    }
    
    if (input.jobTitle !== undefined) {
      updateFields.push(`job_title = $${paramIndex++}`);
      params.push(input.jobTitle);
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // No fields to update
    if (updateFields.length === 1) {
      throw new Error('No fields to update');
    }
    
    // Add the agent_id as the last parameter
    params.push(input.id);
    
    const result = await client.query(
      `UPDATE "${AGENTS_TABLE}"
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Agent not found'
      };
    }

    return {
      success: true,
      data: mapAgentFromDatabase(result.rows[0])
    };
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return { success: false, error: error.message || 'Failed to update agent' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Links an agent to a user in the database.
 * @param input - An object containing client_user_id, client_organization_id, and agent_id.
 * @returns A BaseResponse indicating success or failure.
 */
export async function linkAgentToClientUser(input: LinkAgentToClientUserInput): Promise<ServiceResponse<null>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const query = `
      INSERT INTO ${CLIENT_USER_AGENTS_TABLE} (client_user_id, client_organization_id, agent_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (client_user_id, client_organization_id, agent_id) DO NOTHING
      RETURNING *;`;
    const values = [input.clientUserId, input.clientOrganizationId, input.agentId];
    await client.query(query, values);

    // Even if no new row was created (due to ON CONFLICT DO NOTHING), still consider it a success
    return { success: true, data: null };
  } catch (error: any) {
    console.error('Error linking agent to user:', error);
    return { success: false, error: error.message || 'Failed to link agent to user' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Lists all agents linked to a specific user.
 * @param input - An object containing the client_user_id and client_organization_id.
 * @returns A BaseResponse indicating success or failure, with the list of agents on success.
 */
export async function listClientUserAgents(input: ListClientUserAgentsInput): Promise<ServiceResponse<Agent[]>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Get all agents for the user by joining the agents and user_agents tables
    const result = await client.query(
      `SELECT a.* 
       FROM "${AGENTS_TABLE}" a
       INNER JOIN "${CLIENT_USER_AGENTS_TABLE}" ua ON a.id = ua.agent_id
       WHERE ua.client_user_id = $1 AND ua.client_organization_id = $2
       ORDER BY a.created_at DESC`,
      [input.clientUserId, input.clientOrganizationId]
    );

    return {
      success: true,
      data: result.rows.map(mapAgentFromDatabase)
    };
  } catch (error: any) {
    console.error('Error listing client user agents:', error);
    return { success: false, error: error.message || 'Failed to list client user agents' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gets a specific agent if it is linked to the user.
 * @param input - An object containing client_user_id, client_organization_id, and agent_id.
 * @returns A BaseResponse indicating success or failure, with the agent data on success.
 */
export async function getClientUserAgent(input: GetClientUserAgentInput): Promise<ServiceResponse<Agent>> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Query for the agent, joining with user_agents to verify ownership
    const query = `
      SELECT a.*
      FROM ${AGENTS_TABLE} a
      JOIN ${CLIENT_USER_AGENTS_TABLE} ua ON a.id = ua.agent_id
        WHERE a.id = $1 AND ua.client_user_id = $2 AND ua.client_organization_id = $3;
    `;
    const values = [input.agentId, input.clientUserId, input.clientOrganizationId];
    const result = await client.query(query, values);

    // Check if an agent was found for this user
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Agent not found or user does not have access'
      };
    }

    // Agent found and user has access
    return {
      success: true,
      data: mapAgentFromDatabase(result.rows[0])
    };

  } catch (error: any) {
    console.error('Error getting client user agent:', error);
    return { success: false, error: error.message || 'Failed to get client user agent' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Get the agent associated with a specific conversation.
 * @param conversation_id The ID of the conversation
 * @returns The agent record or error
 */
export async function getConversationAgent(input: ConversationId): Promise<ServiceResponse<Agent>> {
  const { conversationId } = input;

  if (!conversationId) {
    return { success: false, error: 'conversationId is required' };
  }

  const query = `
    SELECT a.* FROM ${AGENTS_TABLE} a
    JOIN ${CONVERSATIONS_TABLE} c ON a.id = c.agent_id
      WHERE c.conversation_id = $1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [conversationId]);

    if (result.rowCount === 0) {
      return { 
        success: false, 
        error: 'No agent found for this conversation'
      };
    } 

    return { 
      success: true, 
      data: mapAgentFromDatabase(result.rows[0])
    };

  } catch (error) {
    console.error(`Error getting agent for conversation ${conversationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}