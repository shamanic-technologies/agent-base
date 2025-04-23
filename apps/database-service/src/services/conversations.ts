import { PoolClient } from 'pg';
import { 
  CreateConversationInput, 
  AgentId,
  ConversationRecord,
  BaseResponse,
  ConversationId,
  ServiceResponse,
  Conversation,
  mapConversationFromDatabase
} from '@agent-base/types';
import { getClient } from '../db.js';
import { Message } from 'ai';

// No need for our custom interface - we'll use ConversationRecord directly

const CONVERSATIONS_TABLE = 'conversations'; // Define table name constant

/**
 * Create a new conversation record in the database.
 */
export async function createConversation(input: CreateConversationInput): Promise<ServiceResponse<ConversationId>> {
  const { conversationId, agentId, channelId } = input;

  console.log(`[DB Service] Creating conversation: ID=${conversationId}, Agent=${agentId}, Channel=${channelId}`);

  if (!conversationId || !agentId || !channelId) {
    return { success: false, error: 'Missing required fields: conversationId, agentId, channelId' };
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
      conversationId,
      agentId,
      channelId,
      '[]' // Empty JSON array for messages
    ]);
    console.log(`[DB Service] Result: ${JSON.stringify(result)}`);
    if (result.rowCount === 1 && result.rows[0]?.conversation_id) {
      console.log(`[DB Service] Conversation created with ID: ${result.rows[0].conversation_id}`);
      return { 
        success: true, 
        data: { conversationId: result.rows[0].conversation_id }
      };
    } else if (result.rowCount === 0) {
      console.log(`[DB Service] Conversation with ID ${conversationId} already exists.`);
      return { 
        success: true, 
        data: { conversationId: conversationId }
      };
    } else {
      console.error('[DB Service] Failed to insert conversation or retrieve conversationId.');
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
  conversationId: string, 
  messages: Message[]
): Promise<ServiceResponse<ConversationId>> {
  console.log(`[DB Service] Updating all messages in conversation: ${conversationId}`);

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
    
    const result = await client.query(query, [messagesJson, conversationId]);

    if (result.rowCount === 1) {
      console.log(`[DB Service] Updated messages in conversation: ${conversationId}`);
      return { success: true, data: { conversationId: conversationId } };
    } else {
      console.error(`[DB Service] Conversation ${conversationId} not found.`);
      return { success: false, error: 'Conversation not found' };
    }
  } catch (error) {
    console.error(`[DB Service] Error updating messages in conversation ${conversationId}:`, error);
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
  conversationId: string
): Promise<ServiceResponse<Conversation>> {
  console.log(`[DB Service] Getting conversation: ${conversationId}`);

  const query = `
    SELECT * FROM "${CONVERSATIONS_TABLE}"
    WHERE conversation_id = $1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const result = await client.query(query, [conversationId]);

    if (result.rowCount === 1) {
      // Parse messages from JSONB to array of UIMessage
      const conversation = result.rows[0] as any;
      
      console.log(`[DB Service] Found conversation: ${conversationId} with ${(conversation.messages || []).length} messages`);
      
      // Return the conversation with proper type structure
      return {
        success: true,
        data: mapConversationFromDatabase(conversation)
      };
    } else {
      console.error(`[DB Service] Conversation ${conversationId} not found.`);
      return { success: false, error: 'Conversation not found' };
    }
  } catch (error) {
    console.error(`[DB Service] Error getting conversation ${conversationId}:`, error);
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
export async function getConversationsByAgent(input: AgentId)
: Promise<ServiceResponse<Conversation[]>> {
  const { agentId } = input;

  console.log(`[DB Service] Getting conversations for agent: ${agentId}`);

  if (!agentId) {
    return { success: false, error: 'agentId is required' };
  }

  const query = `
    SELECT * FROM "${CONVERSATIONS_TABLE}" 
    WHERE agent_id = $1 
    ORDER BY updated_at DESC
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [agentId]);
    
    // Process each row to properly handle the messages JSONB field
    const conversations = result.rows.map(row => {
      const conversation = row as any;
      return conversation as ConversationRecord;
    });

    console.log(`[DB Service] Found ${conversations.length} conversations for agent ${agentId}`);
    return { 
      success: true, 
      data: conversations.map(mapConversationFromDatabase)
    };

  } catch (error) {
    console.error(`[DB Service] Error getting conversations for agent ${agentId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}
