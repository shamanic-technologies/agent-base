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
  CreateAgentInput,
  UpdateAgentInput,
  LinkAgentInput,
  CreateAgentResponse,
  UpdateAgentResponse,
  LinkAgentToUserResponse,
  ListUserAgentsInput,
  ListUserAgentsResponse,
  GetUserAgentInput,
  GetUserAgentResponse
} from '@agent-base/agents';

const AGENTS_TABLE = 'agents';
const USER_AGENTS_TABLE = 'user_agents';

// SQL definitions for table creation
const AGENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${AGENTS_TABLE}" (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_first_name VARCHAR(255) NOT NULL,
    agent_last_name VARCHAR(255) NOT NULL,
    agent_profile_picture TEXT NOT NULL,
    agent_gender VARCHAR(50) NOT NULL,
    agent_system_prompt TEXT NOT NULL,
    agent_model_id VARCHAR(255) NOT NULL,
    agent_memory TEXT NOT NULL,
    agent_job_title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )
`;

const USER_AGENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${USER_AGENTS_TABLE}" (
    user_id VARCHAR(255) NOT NULL,
    agent_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, agent_id),
    FOREIGN KEY (agent_id) REFERENCES ${AGENTS_TABLE}(agent_id)
  )
`;

/**
 * Ensures that the required tables exist in the database
 */
async function ensureTablesExist(client: PoolClient): Promise<void> {
  await client.query(AGENTS_TABLE_SQL);
  await client.query(USER_AGENTS_TABLE_SQL);
}

/**
 * Helper function to handle errors in service functions
 */
function handleServiceError(error: unknown, errorMessage: string): any {
  console.error(errorMessage, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error occurred'
  };
}

/**
 * Creates a new agent in the database
 */
export async function createAgent(
  input: CreateAgentInput
): Promise<CreateAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Create tables if they don't exist
    await ensureTablesExist(client);

    // Insert new agent
    const result = await client.query(
      `INSERT INTO "${AGENTS_TABLE}" 
      (agent_first_name, agent_last_name, agent_profile_picture, agent_gender, agent_system_prompt, agent_model_id, agent_memory, agent_job_title)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        input.agent_first_name,
        input.agent_last_name,
        input.agent_profile_picture,
        input.agent_gender,
        input.agent_system_prompt,
        input.agent_model_id,
        input.agent_memory,
        input.agent_job_title
      ]
    );

    return {
      success: true,
      data: result.rows[0] as AgentRecord
    };
  } catch (error) {
    return handleServiceError(error, 'Error creating agent:');
  } finally {
    if (client) client.release();
  }
}

/**
 * Updates an existing agent in the database
 */
export async function updateAgent(
  input: UpdateAgentInput
): Promise<UpdateAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    // Create tables if they don't exist
    await ensureTablesExist(client);
    
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
    
    if (input.agent_system_prompt !== undefined) {
      updateFields.push(`agent_system_prompt = $${paramIndex++}`);
      params.push(input.agent_system_prompt);
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
  } catch (error) {
    return handleServiceError(error, 'Error updating agent:');
  } finally {
    if (client) client.release();
  }
}

/**
 * Links an agent to a user in the database
 */
export async function linkAgentToUser(
  input: LinkAgentInput
): Promise<LinkAgentToUserResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Create tables if they don't exist
    await ensureTablesExist(client);

    // Check if the agent exists
    const agentCheck = await client.query(
      `SELECT * FROM "${AGENTS_TABLE}" WHERE agent_id = $1`,
      [input.agent_id]
    );

    if (agentCheck.rows.length === 0) {
      return {
        success: false,
        error: 'Agent not found'
      };
    }

    // Check if the link already exists
    const linkCheck = await client.query(
      `SELECT * FROM "${USER_AGENTS_TABLE}" WHERE user_id = $1 AND agent_id = $2`,
      [input.user_id, input.agent_id]
    );

    if (linkCheck.rows.length > 0) {
      return {
        success: true,
        data: linkCheck.rows[0]
      };
    }

    // Create the link
    const result = await client.query(
      `INSERT INTO "${USER_AGENTS_TABLE}" (user_id, agent_id)
       VALUES ($1, $2)
       RETURNING *`,
      [input.user_id, input.agent_id]
    );

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    return handleServiceError(error, 'Error linking agent to user:');
  } finally {
    if (client) client.release();
  }
}

/**
 * Lists all agents for a specific user
 */
export async function listUserAgents(
  input: ListUserAgentsInput
): Promise<ListUserAgentsResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Create tables if they don't exist
    await ensureTablesExist(client);

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
  } catch (error) {
    return handleServiceError(error, 'Error listing agents for user:');
  } finally {
    if (client) client.release();
  }
}

/**
 * Retrieves a specific agent if it belongs to the specified user
 */
export async function getUserAgent(
  input: GetUserAgentInput
): Promise<GetUserAgentResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();

    // Ensure tables exist (optional, but maintains pattern)
    await ensureTablesExist(client);

    // Query for the agent, joining with user_agents to verify ownership
    const result = await client.query(
      `SELECT a.* \n       FROM "${AGENTS_TABLE}" a\n       JOIN "${USER_AGENTS_TABLE}" ua ON a.agent_id = ua.agent_id\n       WHERE a.agent_id = $1 AND ua.user_id = $2`,
      [input.agent_id, input.user_id]
    );

    // Check if an agent was found for this user
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Agent not found or user does not have access' // Specific error message
      };
    }

    // Agent found and user has access
    return {
      success: true,
      data: result.rows[0] as AgentRecord // Return the agent data
    };

  } catch (error) {
    return handleServiceError(error, 'Error getting user agent:');
  } finally {
    if (client) client.release();
  }
}