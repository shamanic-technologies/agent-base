/**
 * Agents Service
 * 
 * Handles all database operations related to agents
 */
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db.js';
import {
  AgentRecord,
  CreateUserAgentInput,
  CreateUserAgentResponse,
  UpdateUserAgentInput,
  UpdateUserAgentResponse,
  ListUserAgentsInput,
  ListUserAgentsResponse,
  GetUserAgentInput,
  GetUserAgentResponse,
  BaseResponse
} from '@agent-base/types';

const AGENTS_TABLE = 'agents';
const USER_AGENTS_TABLE = 'user_agents';
const CONVERSATIONS_TABLE = 'conversations';

/**
 * Creates a new agent in the database.
 * @param input - The agent data to create, excluding user_id.
 * @returns A BaseResponse indicating success or failure, with the created agent data on success.
 */
export async function createAgent(input: Omit<CreateUserAgentInput, 'user_id'>): Promise<CreateUserAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Insert new agent
    const result = await client.query(
      `INSERT INTO "${AGENTS_TABLE}" 
      (agent_first_name, agent_last_name, agent_profile_picture, agent_gender, agent_model_id, agent_memory, agent_job_title)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.agent_first_name,
        input.agent_last_name,
        input.agent_profile_picture,
        input.agent_gender,
        input.agent_model_id,
        input.agent_memory,
        input.agent_job_title
      ]
    );

    return {
      success: true,
      data: result.rows[0] as AgentRecord
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
export async function updateAgent(input: Omit<UpdateUserAgentInput, 'user_id'>): Promise<UpdateUserAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Build the SQL update statement dynamically based on provided fields
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (input.agent_first_name !== undefined) {
      updateFields.push(`agent_first_name = $${paramIndex++}`);
      params.push(input.agent_first_name);
    }
    
    if (input.agent_last_name !== undefined) {
      updateFields.push(`agent_last_name = $${paramIndex++}`);
      params.push(input.agent_last_name);
    }
    
    if (input.agent_profile_picture !== undefined) {
      updateFields.push(`agent_profile_picture = $${paramIndex++}`);
      params.push(input.agent_profile_picture);
    }
    
    if (input.agent_gender !== undefined) {
      updateFields.push(`agent_gender = $${paramIndex++}`);
      params.push(input.agent_gender);
    }
    
    if (input.agent_model_id !== undefined) {
      updateFields.push(`agent_model_id = $${paramIndex++}`);
      params.push(input.agent_model_id);
    }
    
    if (input.agent_memory !== undefined) {
      updateFields.push(`agent_memory = $${paramIndex++}`);
      params.push(input.agent_memory);
    }
    
    if (input.agent_job_title !== undefined) {
      updateFields.push(`agent_job_title = $${paramIndex++}`);
      params.push(input.agent_job_title);
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // No fields to update
    if (updateFields.length === 1) {
      throw new Error('No fields to update');
    }
    
    // Add the agent_id as the last parameter
    params.push(input.agent_id);
    
    const result = await client.query(
      `UPDATE "${AGENTS_TABLE}"
       SET ${updateFields.join(', ')}
       WHERE agent_id = $${paramIndex}
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
      data: result.rows[0] as AgentRecord
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
 * @param input - An object containing user_id and agent_id.
 * @returns A BaseResponse indicating success or failure.
 */
export async function linkAgentToUser(input: { user_id: string, agent_id: string }): Promise<BaseResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const query = `
      INSERT INTO ${USER_AGENTS_TABLE} (user_id, agent_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, agent_id) DO NOTHING
      RETURNING *;`;
    const values = [input.user_id, input.agent_id];
    const result = await client.query(query, values);

    // Even if no new row was created (due to ON CONFLICT DO NOTHING), still consider it a success
    return { success: true };
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
 * @param input - An object containing the user_id.
 * @returns A BaseResponse indicating success or failure, with the list of agents on success.
 */
export async function listUserAgents(input: ListUserAgentsInput): Promise<ListUserAgentsResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Get all agents for the user by joining the agents and user_agents tables
    const result = await client.query(
      `SELECT a.* 
       FROM "${AGENTS_TABLE}" a
       INNER JOIN "${USER_AGENTS_TABLE}" ua ON a.agent_id = ua.agent_id
       WHERE ua.user_id = $1
       ORDER BY a.created_at DESC`,
      [input.user_id]
    );

    return {
      success: true,
      data: result.rows as AgentRecord[]
    };
  } catch (error: any) {
    console.error('Error listing user agents:', error);
    return { success: false, error: error.message || 'Failed to list user agents' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gets a specific agent if it is linked to the user.
 * @param input - An object containing user_id and agent_id.
 * @returns A BaseResponse indicating success or failure, with the agent data on success.
 */
export async function getUserAgent(input: GetUserAgentInput): Promise<GetUserAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Query for the agent, joining with user_agents to verify ownership
    const query = `
      SELECT a.*
      FROM ${AGENTS_TABLE} a
      JOIN ${USER_AGENTS_TABLE} ua ON a.agent_id = ua.agent_id
      WHERE a.agent_id = $1 AND ua.user_id = $2;
    `;
    const values = [input.agent_id, input.user_id];
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
      data: result.rows[0] as AgentRecord // Return the agent data
    };

  } catch (error: any) {
    console.error('Error getting user agent:', error);
    return { success: false, error: error.message || 'Failed to get user agent' };
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
export async function getConversationAgent(conversation_id: string): Promise<BaseResponse & { data?: AgentRecord }> {
  console.log(`[DB Service] Getting agent for conversation: ${conversation_id}`);

  if (!conversation_id) {
    return { success: false, error: 'conversation_id is required' };
  }

  const query = `
    SELECT a.* FROM ${AGENTS_TABLE} a
    JOIN ${CONVERSATIONS_TABLE} c ON a.agent_id = c.agent_id
    WHERE c.conversation_id = $1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [conversation_id]);

    if (result.rowCount === 0) {
      console.log(`[DB Service] No agent found for conversation ${conversation_id}`);
      return { 
        success: false, 
        error: 'No agent found for this conversation'
      };
    } 

    console.log(`[DB Service] Found agent ${result.rows[0].agent_id} for conversation ${conversation_id}`);
    return { 
      success: true, 
      data: result.rows[0] as AgentRecord 
    };

  } catch (error) {
    console.error(`[DB Service] Error getting agent for conversation ${conversation_id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}