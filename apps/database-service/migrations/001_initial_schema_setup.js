// @ts-check
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  // Constants for table names, ensuring consistency
  const PLATFORM_USERS_TABLE = 'platform_users';
  const CLIENT_USERS_TABLE = 'client_users';
  const CLIENT_ORGANIZATIONS_TABLE = 'client_organizations';
  const AGENTS_TABLE = 'agents';
  const CLIENT_USER_AGENTS_TABLE = 'client_user_agents';
  const CONVERSATIONS_TABLE = 'conversations';
  const CLIENT_USER_OAUTH_TABLE = 'client_user_oauth';
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const CLIENT_USER_CLIENT_ORGANIZATION_TABLE = 'client_user_client_organization';

  // Create platform_users table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${PLATFORM_USERS_TABLE}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255),
      display_name VARCHAR(255),
      profile_image TEXT,
      last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log(`Table "${PLATFORM_USERS_TABLE}" created or already exists.`);

  // Create client_users table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CLIENT_USERS_TABLE}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform_user_id UUID NOT NULL,
      auth_user_id VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (platform_user_id) REFERENCES "${PLATFORM_USERS_TABLE}"("id") ON DELETE CASCADE
    )
  `);
  console.log(`Table "${CLIENT_USERS_TABLE}" created or already exists.`);
  
  // Create client_organizations table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CLIENT_ORGANIZATIONS_TABLE}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      profile_image TEXT,
      creator_client_user_id UUID NOT NULL,
      client_auth_organization_id VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_client_user_id) REFERENCES "${CLIENT_USERS_TABLE}"("id") ON DELETE CASCADE
    )
  `);
  console.log(`Table "${CLIENT_ORGANIZATIONS_TABLE}" created or already exists.`);

  // Create agents table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${AGENTS_TABLE}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      profile_picture TEXT NOT NULL,
      gender VARCHAR(50) NOT NULL,
      model_id VARCHAR(255) NOT NULL,
      memory TEXT,
      job_title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log(`Table "${AGENTS_TABLE}" created or already exists.`);

  // Create client_user_agents table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CLIENT_USER_AGENTS_TABLE}" (
      client_user_id UUID NOT NULL,
      client_organization_id UUID NOT NULL,
      agent_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_user_id, client_organization_id, agent_id),
      FOREIGN KEY (agent_id) REFERENCES "${AGENTS_TABLE}"("id") ON DELETE CASCADE,
      FOREIGN KEY (client_user_id) REFERENCES "${CLIENT_USERS_TABLE}"("id") ON DELETE CASCADE,
      FOREIGN KEY (client_organization_id) REFERENCES "${CLIENT_ORGANIZATIONS_TABLE}"("id") ON DELETE CASCADE
    )
  `);
  console.log(`Table "${CLIENT_USER_AGENTS_TABLE}" created or already exists.`);
  
  // Create conversations table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CONVERSATIONS_TABLE}" (
      conversation_id VARCHAR(255) PRIMARY KEY,
      agent_id UUID NOT NULL,
      channel_id VARCHAR(255) NOT NULL,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES "${AGENTS_TABLE}"("id") ON DELETE CASCADE
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON "${CONVERSATIONS_TABLE}"(agent_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_conversations_messages_gin ON "${CONVERSATIONS_TABLE}" USING GIN (messages);`);
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
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON "${CONVERSATIONS_TABLE}";
    CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON "${CONVERSATIONS_TABLE}"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
  console.log(`Table "${CONVERSATIONS_TABLE}" created or already exists, along with its trigger and indexes.`);

  // Create client_user_oauth table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CLIENT_USER_OAUTH_TABLE}" (
      client_user_id UUID NOT NULL,
      client_organization_id UUID NOT NULL,
      oauth_provider VARCHAR(50) NOT NULL,
      scope TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_user_id, client_organization_id, oauth_provider, scope),
      FOREIGN KEY (client_user_id) REFERENCES "${CLIENT_USERS_TABLE}"("id") ON DELETE CASCADE,
      FOREIGN KEY (client_organization_id) REFERENCES "${CLIENT_ORGANIZATIONS_TABLE}"("id") ON DELETE CASCADE
    )
  `);
  console.log(`Table "${CLIENT_USER_OAUTH_TABLE}" created or already exists.`);
  
  // Create platform_user_api_keys table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${PLATFORM_USER_API_KEY_TABLE}" (
      key_id UUID PRIMARY KEY,
      platform_user_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(64) NOT NULL,
      hashed_key TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_used TIMESTAMP WITH TIME ZONE,
      FOREIGN KEY (platform_user_id) REFERENCES "${PLATFORM_USERS_TABLE}"("id") ON DELETE CASCADE,
      UNIQUE(platform_user_id, name)
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_api_keys_platform_user_id ON "${PLATFORM_USER_API_KEY_TABLE}"(platform_user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON "${PLATFORM_USER_API_KEY_TABLE}"(hashed_key);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON "${PLATFORM_USER_API_KEY_TABLE}"(key_prefix);`);
  console.log(`Table "${PLATFORM_USER_API_KEY_TABLE}" created or already exists, along with its indexes.`);

  // Create client_user_client_organization table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "${CLIENT_USER_CLIENT_ORGANIZATION_TABLE}" (
      client_user_id UUID NOT NULL,
      client_organization_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_user_id, client_organization_id),
      FOREIGN KEY (client_user_id) REFERENCES "${CLIENT_USERS_TABLE}"("id") ON DELETE CASCADE,
      FOREIGN KEY (client_organization_id) REFERENCES "${CLIENT_ORGANIZATIONS_TABLE}"("id") ON DELETE CASCADE
    )
  `);
  console.log(`Table "${CLIENT_USER_CLIENT_ORGANIZATION_TABLE}" created or already exists.`);
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  // Constants for table names, ensuring consistency
  const PLATFORM_USERS_TABLE = 'platform_users';
  const CLIENT_USERS_TABLE = 'client_users';
  const CLIENT_ORGANIZATIONS_TABLE = 'client_organizations';
  const AGENTS_TABLE = 'agents';
  const CLIENT_USER_AGENTS_TABLE = 'client_user_agents';
  const CONVERSATIONS_TABLE = 'conversations';
  const CLIENT_USER_OAUTH_TABLE = 'client_user_oauth';
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const CLIENT_USER_CLIENT_ORGANIZATION_TABLE = 'client_user_client_organization';

  // Drop tables in reverse order of creation to respect foreign key constraints
  
  pgm.sql(`DROP TABLE IF EXISTS "${CLIENT_USER_CLIENT_ORGANIZATION_TABLE}" CASCADE;`);
  console.log(`Table "${CLIENT_USER_CLIENT_ORGANIZATION_TABLE}" dropped.`);
  
  pgm.sql(`DROP TABLE IF EXISTS "${PLATFORM_USER_API_KEY_TABLE}" CASCADE;`);
  console.log(`Table "${PLATFORM_USER_API_KEY_TABLE}" dropped.`);
  
  pgm.sql(`DROP TABLE IF EXISTS "${CLIENT_USER_OAUTH_TABLE}" CASCADE;`);
  console.log(`Table "${CLIENT_USER_OAUTH_TABLE}" dropped.`);
  
  // Drop the trigger and function for conversations table
  pgm.sql(`DROP TRIGGER IF EXISTS update_conversations_updated_at ON "${CONVERSATIONS_TABLE}";`);
  pgm.sql(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
  pgm.sql(`DROP TABLE IF EXISTS "${CONVERSATIONS_TABLE}" CASCADE;`);
  console.log(`Table "${CONVERSATIONS_TABLE}" dropped, along with its trigger and function.`);

  pgm.sql(`DROP TABLE IF EXISTS "${CLIENT_USER_AGENTS_TABLE}" CASCADE;`);
  console.log(`Table "${CLIENT_USER_AGENTS_TABLE}" dropped.`);
  
  pgm.sql(`DROP TABLE IF EXISTS "${AGENTS_TABLE}" CASCADE;`);
  console.log(`Table "${AGENTS_TABLE}" dropped.`);

  pgm.sql(`DROP TABLE IF EXISTS "${CLIENT_ORGANIZATIONS_TABLE}" CASCADE;`);
  console.log(`Table "${CLIENT_ORGANIZATIONS_TABLE}" dropped.`);
  
  pgm.sql(`DROP TABLE IF EXISTS "${CLIENT_USERS_TABLE}" CASCADE;`);
  console.log(`Table "${CLIENT_USERS_TABLE}" dropped.`);
  
  pgm.sql(`DROP TABLE IF EXISTS "${PLATFORM_USERS_TABLE}" CASCADE;`);
  console.log(`Table "${PLATFORM_USERS_TABLE}" dropped.`);
} 