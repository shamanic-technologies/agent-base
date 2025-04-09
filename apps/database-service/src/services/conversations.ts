import { PoolClient } from 'pg';
import { 
  CreateConversationInput, 
  CreateConversationResponse, 
  GetConversationsFromAgentInput,
  GetConversationsResponse,
  ConversationRecord,
  BaseResponse,
  GetConversationResponse,
} from '@agent-base/agents';
import { getClient } from '../db.js';
import { Message } from 'ai';

// No need for our custom interface - we'll use ConversationRecord directly

const CONVERSATIONS_TABLE = 'conversations'; // Define table name constant

/**
 * Create a new conversation record in the database.
 */
export async function createConversation(input: CreateConversationInput): Promise<CreateConversationResponse> {
  const { conversation_id, agent_id, channel_id } = input;

  console.log(`[DB Service] Creating conversation: ID=${conversation_id}, Agent=${agent_id}, Channel=${channel_id}`);

  if (!conversation_id || !agent_id || !channel_id) {
    return { success: false, error: 'Missing required fields: conversation_id, agent_id, channel_id' };
  }

  const query = `
    INSERT INTO "${CONVERSATIONS_TABLE}" (conversation_id, agent_id, channel_id, messages)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (conversation_id) DO NOTHING
    RETURNING conversation_id;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [
      conversation_id,
      agent_id,
      channel_id,
      '[]' // Empty JSON array for messages
    ]);

    if (result.rowCount === 1 && result.rows[0]?.conversation_id) {
      console.log(`[DB Service] Conversation created with ID: ${result.rows[0].conversation_id}`);
      return { 
        success: true, 
        data: { conversation_id: result.rows[0].conversation_id }
      };
    } else if (result.rowCount === 0) {
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
 * Update all messages in a conversation
 */
export async function updateConversationMessages(
  conversation_id: string, 
  messages: Message[]
): Promise<BaseResponse> {
  console.log(`[DB Service] Updating all messages in conversation: ${conversation_id}`);

  const query = `
    UPDATE "${CONVERSATIONS_TABLE}"
    SET messages = $1::jsonb
    WHERE conversation_id = $2
    RETURNING conversation_id;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const messagesJson = JSON.stringify(messages);
    
    const result = await client.query(query, [messagesJson, conversation_id]);

    if (result.rowCount === 1) {
      console.log(`[DB Service] Updated messages in conversation: ${conversation_id}`);
      return { success: true };
    } else {
      console.error(`[DB Service] Conversation ${conversation_id} not found.`);
      return { success: false, error: 'Conversation not found' };
    }
  } catch (error) {
    console.error(`[DB Service] Error updating messages in conversation ${conversation_id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Get a specific conversation by ID with all messages
 */
export async function getConversation(
  conversation_id: string
): Promise<GetConversationResponse> {
  console.log(`[DB Service] Getting conversation: ${conversation_id}`);

  const query = `
    SELECT * FROM "${CONVERSATIONS_TABLE}"
    WHERE conversation_id = $1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const result = await client.query(query, [conversation_id]);

    if (result.rowCount === 1) {
      // Parse messages from JSONB to array of UIMessage
      const conversation = result.rows[0] as any;
      
      console.log(`[DB Service] Found conversation: ${conversation_id} with ${(conversation.messages || []).length} messages`);
      
      // Return the conversation with proper type structure
      return {
        success: true,
        data: conversation as ConversationRecord
      };
    } else {
      console.error(`[DB Service] Conversation ${conversation_id} not found.`);
      return { success: false, error: 'Conversation not found' };
    }
  } catch (error) {
    console.error(`[DB Service] Error getting conversation ${conversation_id}:`, error);
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
export async function getConversationsByAgent(input: GetConversationsFromAgentInput): Promise<GetConversationsResponse> {
  const { agent_id } = input;

  console.log(`[DB Service] Getting conversations for agent: ${agent_id}`);

  if (!agent_id) {
    return { success: false, error: 'agent_id is required' };
  }

  const query = `
    SELECT * FROM "${CONVERSATIONS_TABLE}" 
    WHERE agent_id = $1 
    ORDER BY updated_at DESC
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [agent_id]);
    
    // Process each row to properly handle the messages JSONB field
    const conversations = result.rows.map(row => {
      const conversation = row as any;
      return conversation as ConversationRecord;
    });

    console.log(`[DB Service] Found ${conversations.length} conversations for agent ${agent_id}`);
    return { 
      success: true, 
      data: conversations
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
