import { PoolClient } from 'pg';
import { 
  CreateConversationInput, 
  CreateConversationResponse, 
  GetConversationsInput,
  GetConversationsResponse,
  ConversationRecord,
  GetAgentCurrentConversationInput,
  GetAgentCurrentConversationResponse
} from '@agent-base/agents';
import { getClient } from '../db.js';

const CONVERSATIONS_TABLE = 'conversations'; // Define table name constant

// SQL definition for conversations table creation
const CONVERSATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${CONVERSATIONS_TABLE}" (
    conversation_id VARCHAR(255) PRIMARY KEY,
    agent_id UUID NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
    -- Add other constraints or indices as needed
  );

  -- Optional: Add index on agent_id for faster lookups
  CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON "${CONVERSATIONS_TABLE}"(agent_id);
  -- Optional: Add trigger to update updated_at timestamp automatically
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ language 'plpgsql';

  DROP TRIGGER IF EXISTS update_conversations_updated_at ON "${CONVERSATIONS_TABLE}";
  CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON "${CONVERSATIONS_TABLE}"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Ensures the conversations table exists in the database.
 */
export async function ensureConversationsTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(CONVERSATIONS_TABLE_SQL);
    console.log(`[DB Service] Table check/creation for '${CONVERSATIONS_TABLE}' completed.`);
  } catch (error) {
    console.error(`[DB Service] Error ensuring '${CONVERSATIONS_TABLE}' table exists:`, error);
    throw error; // Re-throw the error to be caught by the calling function
  }
}

/**
 * Create a new conversation record in the database.
 */
export async function createConversation(input: CreateConversationInput): Promise<CreateConversationResponse> {
  const { conversation_id, agent_id, channel_id } = input;

  console.log(`[DB Service] Creating conversation: ID=${conversation_id}, Agent=${agent_id}, Channel=${channel_id}`);

  // Basic validation (ensure IDs are not empty strings, etc.)
  if (!conversation_id || !agent_id || !channel_id) {
    return { success: false, error: 'Missing required fields: conversation_id, agent_id, channel_id' };
  }

  const query = `
    INSERT INTO "${CONVERSATIONS_TABLE}" (conversation_id, agent_id, channel_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (conversation_id) DO NOTHING
    RETURNING conversation_id;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    // Ensure table exists before inserting
    await ensureConversationsTableExists(client);

    const result = await client.query(query, [
      conversation_id,
      agent_id,
      channel_id
    ]);

    // Check if insert happened or if it existed (ON CONFLICT DO NOTHING)
    if (result.rowCount === 1 && result.rows[0]?.conversation_id) {
      console.log(`[DB Service] Conversation created with ID: ${result.rows[0].conversation_id}`);
      return { 
        success: true, 
        data: { conversation_id: result.rows[0].conversation_id }
      };
    } else if (result.rowCount === 0) {
      // This means the conversation_id likely already existed due to ON CONFLICT DO NOTHING
      // Decide if this is an error or success. Let's treat it as success (idempotent).
      console.log(`[DB Service] Conversation with ID ${conversation_id} already exists.`);
      return { 
        success: true, 
        data: { conversation_id: conversation_id }
      };
    } else {
      console.error('[DB Service] Failed to insert conversation or retrieve conversation_id.');
      return { success: false, error: 'Failed to save conversation to database' };
    }
  } catch (error) {
    console.error('[DB Service] Database error creating conversation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
      if (client) client.release(); 
  }
}

/**
 * Get all conversations associated with a specific agent.
 */
export async function getConversationsByAgent(input: GetConversationsInput): Promise<GetConversationsResponse> {
  const { agent_id } = input;

  console.log(`[DB Service] Getting conversations for agent: ${agent_id}`);

  if (!agent_id) {
    return { success: false, error: 'agent_id is required' };
  }

  const query = `
    SELECT * FROM conversations 
    WHERE agent_id = $1 
    ORDER BY created_at DESC -- Or another preferred order
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    // Ensure table exists before selecting
    await ensureConversationsTableExists(client);

    const result = await client.query(query, [agent_id]);

    console.log(`[DB Service] Found ${result.rowCount} conversations for agent ${agent_id}`);
    return { 
      success: true, 
      data: result.rows as ConversationRecord[]
    };

  } catch (error) {
    console.error(`[DB Service] Error getting conversations for agent ${agent_id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Get the most recent conversation associated with a specific agent.
 */
export async function getAgentCurrentConversation(input: GetAgentCurrentConversationInput): Promise<GetAgentCurrentConversationResponse> {
  const { agent_id } = input;

  console.log(`[DB Service] Getting current conversation for agent: ${agent_id}`);

  if (!agent_id) {
    return { success: false, error: 'agent_id is required' };
  }

  const query = `
    SELECT * FROM conversations 
    WHERE agent_id = $1 
    ORDER BY updated_at DESC 
    LIMIT 1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    // Ensure table exists before selecting
    await ensureConversationsTableExists(client);
    
    const result = await client.query(query, [agent_id]);

    if (result.rowCount === 0) {
      console.log(`[DB Service] No conversation found for agent ${agent_id}`);
      return { 
        success: true, 
        data: null
      };
    } else {
      console.log(`[DB Service] Found current conversation ${result.rows[0].conversation_id} for agent ${agent_id}`);
      return { 
        success: true, 
        data: result.rows[0] as ConversationRecord 
      };
    }

  } catch (error) {
    console.error(`[DB Service] Error getting current conversation for agent ${agent_id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
} 