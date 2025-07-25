// @ts-check
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  const LANGGRAPH_CONVERSATIONS_TABLE = 'conversations_langgraph';
  const AGENTS_TABLE = 'agents';

  // Create conversations_langgraph table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${LANGGRAPH_CONVERSATIONS_TABLE}" (
      conversation_id VARCHAR(255) PRIMARY KEY,
      agent_id UUID NOT NULL,
      channel_id VARCHAR(255) NOT NULL,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES "${AGENTS_TABLE}"("id") ON DELETE CASCADE
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_conversations_langgraph_agent_id ON "${LANGGRAPH_CONVERSATIONS_TABLE}"(agent_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_conversations_langgraph_messages_gin ON "${LANGGRAPH_CONVERSATIONS_TABLE}" USING GIN (messages);`);
  
  // Reuse the existing updated_at function if it's there, or create it.
  // This is idempotent and safe to run in multiple migrations.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  pgm.sql(`
    DROP TRIGGER IF EXISTS update_conversations_langgraph_updated_at ON "${LANGGRAPH_CONVERSATIONS_TABLE}";
    CREATE TRIGGER update_conversations_langgraph_updated_at
    BEFORE UPDATE ON "${LANGGRAPH_CONVERSATIONS_TABLE}"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
  console.log(`Table "${LANGGRAPH_CONVERSATIONS_TABLE}" created or already exists, along with its trigger and indexes.`);
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  const LANGGRAPH_CONVERSATIONS_TABLE = 'conversations_langgraph';

  // Drop the trigger and function for the conversations_langgraph table
  pgm.sql(`DROP TRIGGER IF EXISTS update_conversations_langgraph_updated_at ON "${LANGGRAPH_CONVERSATIONS_TABLE}";`);
  // Note: We don't drop the function here as it might be used by other tables.
  // Migrations should be self-contained but also mindful of shared resources.
  pgm.sql(`DROP TABLE IF EXISTS "${LANGGRAPH_CONVERSATIONS_TABLE}" CASCADE;`);
  console.log(`Table "${LANGGRAPH_CONVERSATIONS_TABLE}" dropped, along with its trigger.`);
}
