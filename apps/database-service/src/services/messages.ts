/**
 * Messages Service
 *
 * Handles database operations related to conversation messages
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import {
  CreateMessageInput,
  CreateMessageResponse,
  GetMessagesInput,
  GetMessagesResponse,
  MessageRecord
} from '@agent-base/agents';

const MESSAGES_TABLE = 'messages';

// Updated SQL definition for messages table creation
const MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${MESSAGES_TABLE}" (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT,
    tool_calls JSONB,
    tool_call_id VARCHAR(255),
    tool_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add foreign key constraint to conversations table
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
  );

  -- Optional: Add index on conversation_id
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON "${MESSAGES_TABLE}"(conversation_id);
`;

/**
 * Ensures the messages table exists in the database.
 */
async function ensureMessagesTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(MESSAGES_TABLE_SQL);
    console.log(`[DB Service] Table check/creation for '${MESSAGES_TABLE}' completed.`);
  } catch (error) {
    console.error(`[DB Service] Error ensuring '${MESSAGES_TABLE}' table exists:`, error);
    throw error; // Re-throw the error
  }
}

/**
 * Save a new message to the database.
 * Renamed from createUserAgentMessage.
 * user_id and agent_id are now omitted from insertion.
 */
export async function createMessage(input: CreateMessageInput): Promise<CreateMessageResponse> {
  // Exclude user_id and agent_id from input
  const { conversation_id, role, content, tool_calls, tool_call_id, tool_result } = input;
  
  // Role validation
  if (!['user', 'assistant', 'system', 'tool'].includes(role)) {
      console.error(`[DB Service] Invalid role provided to createMessage: ${role}`);
      return { success: false, error: 'Invalid message role provided' };
  }

  console.log(`[DB Service] Saving message: Conv=${conversation_id}, Role=${role}`);

  const query = `
    INSERT INTO "${MESSAGES_TABLE}" (conversation_id, role, content, tool_calls, tool_call_id, tool_result)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING message_id;
  `;

  let client: PoolClient | null = null; 
  try {
    client = await getClient(); 
    // Ensure table exists before inserting
    await ensureMessagesTableExists(client);

    const result = await client.query(query, [
      conversation_id,
      role,
      content ?? null,
      tool_calls ? JSON.stringify(tool_calls) : null,
      tool_call_id ?? null,
      tool_result ? JSON.stringify(tool_result) : null
    ]);

    // Check if insert was successful
    if (result.rowCount === 1 && result.rows[0]?.message_id) {
      console.log(`[DB Service] Message saved with ID: ${result.rows[0].message_id}`);
      return { 
        success: true, 
        data: { message_id: result.rows[0].message_id }
      };
    } else {
      console.error('[DB Service] Failed to insert message or retrieve message_id.');
      return { success: false, error: 'Failed to save message to database' };
    }
  } catch (error) {
    console.error('[DB Service] Database error saving message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error occurred'
    };
  } finally {
      if (client) client.release(); 
  }
}

/**
 * Get all messages for a conversation.
 * Updated to remove user_id filtering.
 */
export async function getMessages(input: GetMessagesInput): Promise<GetMessagesResponse> {
   const { conversation_id } = input; // Only conversation_id is needed
   let client: PoolClient | null = null;

   console.log(`[DB Service] Getting messages for conversation: ${conversation_id}`);

   // Updated query: Removed user_id from WHERE clause
   const query = `
       SELECT * FROM "${MESSAGES_TABLE}" 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC
   `;
   
   try {
       client = await getClient();
       await ensureMessagesTableExists(client);

       // Execute query with only conversation_id
       const result = await client.query(query, [conversation_id]);
       
       console.log(`[DB Service] Found ${result.rowCount} messages for conversation ${conversation_id}`);
       return { 
           success: true, 
           // Map rows to MessageRecord, ensuring correct types (e.g., for JSON fields if needed)
           data: result.rows.map((row: any) => ({ 
               ...row, 
               tool_calls: typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls,
               tool_result: typeof row.tool_result === 'string' ? JSON.parse(row.tool_result) : row.tool_result,
            })) as MessageRecord[] 
       };

   } catch (error) {
       console.error(`[DB Service] Error getting messages for conversation ${conversation_id}:`, error);
       return { 
         success: false, 
         error: error instanceof Error ? error.message : 'Error getting messages'
       };
   } finally {
       if (client) client.release();
   }
}