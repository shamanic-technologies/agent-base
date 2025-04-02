/**
 * Messages Service
 *
 * Handles database operations related to conversation messages
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';
import {
  MessageRecord,
  SaveMessageInput,
  GetMessagesInput,
  SaveMessageResponse,
  GetMessagesResponse
} from '@agent-base/agents';

const MESSAGES_TABLE = 'conversation_messages';

// SQL definition for messages table creation
const MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${MESSAGES_TABLE}" (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    agent_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT,
    tool_calls JSONB,
    tool_call_id VARCHAR(255),
    tool_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
  )
`;

/**
 * Ensures that the required messages table exists in the database
 */
async function ensureMessagesTableExists(client: PoolClient): Promise<void> {
  // Check if relation exists before creating
  const checkTableExists = await client.query(`SELECT to_regclass('public."${MESSAGES_TABLE}"')`);
  if (!checkTableExists.rows[0].to_regclass) {
      console.log(`Table ${MESSAGES_TABLE} does not exist. Creating table...`);
      await client.query(MESSAGES_TABLE_SQL);
      console.log(`Table ${MESSAGES_TABLE} created.`);
      
      // Create index separately after table creation
      const indexSql = `CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON "${MESSAGES_TABLE}" (conversation_id);`;
      console.log(`Creating index idx_conversation_messages_conversation_id...`);
      await client.query(indexSql);
      console.log(`Index idx_conversation_messages_conversation_id created.`);
      
  } else {
      // console.log(`Table ${MESSAGES_TABLE} already exists.`);
  }
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
 * Saves a new message to the database
 */
export async function saveMessage(
  input: SaveMessageInput
): Promise<SaveMessageResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    await ensureMessagesTableExists(client);

    // Convert tool_calls and tool_result to JSON strings if they are objects
    const toolCallsJson = input.tool_calls ? JSON.stringify(input.tool_calls) : null;
    const toolResultJson = input.tool_result ? JSON.stringify(input.tool_result) : null;

    const result = await client.query(
      `INSERT INTO "${MESSAGES_TABLE}" 
       (conversation_id, user_id, agent_id, role, content, tool_calls, tool_call_id, tool_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.conversation_id,
        input.user_id,
        input.agent_id,
        input.role,
        input.content,
        toolCallsJson, // Use JSON string
        input.tool_call_id,
        toolResultJson // Use JSON string
      ]
    );

    return {
      success: true,
      data: result.rows[0] as MessageRecord
    };
  } catch (error) {
    return handleServiceError(error, 'Error saving message:');
  } finally {
    if (client) client.release();
  }
}

/**
 * Retrieves all messages for a specific conversation belonging to a user
 */
export async function getMessages(
  input: GetMessagesInput
): Promise<GetMessagesResponse> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    await ensureMessagesTableExists(client); // Ensure table exists before query

    const result = await client.query(
      `SELECT * FROM "${MESSAGES_TABLE}" 
       WHERE conversation_id = $1 AND user_id = $2 
       ORDER BY created_at ASC`, // Order by creation time
      [input.conversation_id, input.user_id]
    );

    // Return the array of messages
    // Parse JSONB fields back to objects if needed
    const messages = result.rows.map(row => ({
        ...row,
        // Parse only if the value is a non-null string
        tool_calls: typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls,
        tool_result: typeof row.tool_result === 'string' ? JSON.parse(row.tool_result) : row.tool_result,
    }));


    return {
      success: true,
      data: messages as MessageRecord[]
    };
  } catch (error) {
    // If the table doesn't exist yet (e.g., first run), return empty success
    // Note: ensureMessagesTableExists should prevent this, but handle just in case
    if (error instanceof Error && (error as any).code === '42P01') { // 42P01: undefined_table
      console.warn(`Messages table check failed or table not found for conversation ${input.conversation_id}, returning empty list.`);
      return { success: true, data: [] };
    } 
    return handleServiceError(error, 'Error getting messages:');
  } finally {
    if (client) client.release();
  }
}