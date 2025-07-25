import { PoolClient } from 'pg';
import { 
  CreateConversationInput, 
  AgentId,
  ConversationRecord,
  ConversationId,
  ServiceResponse,
  Conversation,
  mapConversationFromDatabase
} from '@agent-base/types';
import { getClient } from '../db.js';
import { BaseMessage } from '@langchain/core/messages';

const CONVERSATIONS_TABLE = 'conversations_langgraph';

/**
 * Create a new LangGraph conversation record in the database.
 */
export async function createConversationLangGraph(
  input: CreateConversationInput,
): Promise<ServiceResponse<Conversation>> {
  const { conversationId, agentId, channelId } = input;

  if (!conversationId || !agentId || !channelId) {
    return {
      success: false,
      error: "Missing required fields: conversationId, agentId, channelId",
    };
  }

  const query = `
    INSERT INTO "${CONVERSATIONS_TABLE}" (conversation_id, agent_id, channel_id, messages)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (conversation_id) DO NOTHING
    RETURNING *;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();

    const result = await client.query(query, [
      conversationId,
      agentId,
      channelId,
      "[]", // Empty JSON array for messages
    ]);
    if (result.rowCount === 1 && result.rows[0]) {
      return {
        success: true,
        data: mapConversationFromDatabase(result.rows[0]),
      };
    } else {
      const existingConversation = await getConversationLangGraph(conversationId);
      if (existingConversation.success && existingConversation.data) {
        return { success: true, data: existingConversation.data };
      } else {
        console.error(
          `[DB Service] Failed to retrieve existing conversation ${conversationId} after conflict.`,
        );
        return {
          success: false,
          error: "Failed to retrieve conversation after conflict",
        };
      }
    }
  } catch (error) {
    console.error("[DB Service] Database error creating conversation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Database error occurred",
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Update all messages in a LangGraph conversation
 */
export async function updateConversationMessagesLangGraph(
  conversationId: string, 
  messages: BaseMessage[]
): Promise<ServiceResponse<ConversationId>> {

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
 * Get a specific LangGraph conversation by ID with all messages
 */
export async function getConversationLangGraph(
  conversationId: string
): Promise<ServiceResponse<Conversation | null>> {

  const query = `
    SELECT * FROM "${CONVERSATIONS_TABLE}"
    WHERE conversation_id = $1
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    const result = await client.query(query, [conversationId]);

    if (result.rowCount === 1) {
      const conversation = result.rows[0] as any;
      return {
        success: true,
        data: mapConversationFromDatabase(conversation)
      };
    } else {
      console.warn(`[DB Service] Conversation ${conversationId} not found.`);
      return { success: true, data: null };
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
 * Get all LangGraph conversations associated with a specific agent.
 */
export async function getConversationsByAgentLangGraph(input: AgentId)
: Promise<ServiceResponse<Conversation[]>> {
  const { agentId } = input;

  if (!agentId) {
    console.error('[DB Service/getConversationsByAgent] agentId is required');
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
    
    const conversations = result.rows.map(row => {
      const conversation = row as any;
      return conversation as ConversationRecord;
    });

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

/**
 * Get all LangGraph conversations associated with a specific client_user_id.
 */
export async function getConversationsByClientUserIdLangGraph(clientUserId: string, clientOrganizationId: string): Promise<ServiceResponse<Conversation[]>> {
  if (!clientUserId) {
    console.error('[DB Service/getConversationsByClientUserId] clientUserId is required');
    return { success: false, error: 'clientUserId is required' };
  }
  if (!clientOrganizationId) {
    console.error('[DB Service/getConversationsByClientUserId] clientOrganizationId is required');
    return { success: false, error: 'clientOrganizationId is required' };
  }

  const query = `
    SELECT c.* 
    FROM "${CONVERSATIONS_TABLE}" c
    JOIN "client_user_agents" cua ON c.agent_id = cua.agent_id
    WHERE cua.client_user_id = $1 AND cua.client_organization_id = $2
    ORDER BY c.updated_at DESC;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const result = await client.query(query, [clientUserId, clientOrganizationId]);

    const conversations = result.rows.map(row => {
      return mapConversationFromDatabase(row as any);
    });

    return {
      success: true,
      data: conversations
    };
  } catch (error) {
    console.error(`[DB Service] Error getting conversations for client_user_id ${clientUserId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Get all LangGraph conversations associated with a specific platform_user_id.
 */
export async function getConversationsByPlatformUserIdLangGraph(platformUserId: string): Promise<ServiceResponse<Conversation[]>> {
  if (!platformUserId) {
    console.error('[DB Service/getConversationsByPlatformUserId] platformUserId is required');
    return { success: false, error: 'platformUserId is required' };
  }

  const query = `
    SELECT c.*
    FROM "conversations_langgraph" c
    JOIN "client_user_agents" cua ON c.agent_id = cua.agent_id
    JOIN "client_users" cu ON cua.client_user_id = cu.id
    WHERE cu.platform_user_id = $1
    ORDER BY c.updated_at DESC;
  `;

  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const result = await client.query(query, [platformUserId]);

    const conversations = result.rows.map(row => {
      return mapConversationFromDatabase(row as any);
    });

    return {
      success: true,
      data: conversations
    };
  } catch (error) {
    console.error(`[DB Service] Error getting conversations for platform_user_id ${platformUserId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
    if (client) client.release();
  }
} 