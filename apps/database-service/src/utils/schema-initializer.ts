/**
 * Database Schema Initializer
 * 
 * This module provides functions to initialize and ensure all database tables exist.
 * It consolidates schema definitions from various service modules into one place.
 */
import { PoolClient } from 'pg';
import { getClient } from '../db.js';

// Table name constants
const AGENTS_TABLE = 'agents';
const USER_AGENTS_TABLE = 'user_agents';
const CONVERSATIONS_TABLE = 'conversations';
const WEBHOOK_TABLE = 'webhook';
const AGENT_WEBHOOK_TABLE = 'agent_webhook';
const WEBHOOK_EVENTS_TABLE = 'webhook_events';
const USERS_TABLE = 'users';
const USER_CREDENTIALS_TABLE = 'user_credentials';
const API_KEYS_TABLE = 'api_keys';

// SQL definitions for table creation
const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${USERS_TABLE}" (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_user_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    display_name VARCHAR(255),
    profile_image TEXT,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

const AGENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${AGENTS_TABLE}" (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_first_name VARCHAR(255) NOT NULL,
    agent_last_name VARCHAR(255) NOT NULL,
    agent_profile_picture TEXT NOT NULL,
    agent_gender VARCHAR(50) NOT NULL,
    agent_model_id VARCHAR(255) NOT NULL,
    agent_memory TEXT,
    agent_job_title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )
`;

const USER_AGENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${USER_AGENTS_TABLE}" (
    user_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, agent_id),
    FOREIGN KEY (agent_id) REFERENCES ${AGENTS_TABLE}(agent_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE
  )
`;

const CONVERSATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${CONVERSATIONS_TABLE}" (
    conversation_id VARCHAR(255) PRIMARY KEY,
    agent_id UUID NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
  );

  -- Index on agent_id for faster lookups
  CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON "${CONVERSATIONS_TABLE}"(agent_id);
  
  -- Index on JSONB messages array for potential queries
  CREATE INDEX IF NOT EXISTS idx_conversations_messages_gin ON "${CONVERSATIONS_TABLE}" USING GIN (messages);
  
  -- Updated trigger for timestamp
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

const WEBHOOK_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${WEBHOOK_TABLE}" (
    webhook_provider_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    webhook_credentials JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (webhook_provider_id, user_id),
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE
  )
`;

const AGENT_WEBHOOK_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${AGENT_WEBHOOK_TABLE}" (
    agent_id UUID NOT NULL,
    webhook_provider_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_provider_id, user_id) REFERENCES "${WEBHOOK_TABLE}" (webhook_provider_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES "${AGENTS_TABLE}" (agent_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id,webhook_provider_id, user_id)
  )
`;

const USER_CREDENTIALS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${USER_CREDENTIALS_TABLE}" (
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    scope TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, provider, scope),
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE
  )
`;

const WEBHOOK_EVENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${WEBHOOK_EVENTS_TABLE}" (
    webhook_provider_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    webhook_event_payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (webhook_provider_id, user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE,
    FOREIGN KEY (webhook_provider_id, user_id) REFERENCES "${WEBHOOK_TABLE}" (webhook_provider_id, user_id) ON DELETE CASCADE
  )
`;

const API_KEYS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "${API_KEYS_TABLE}" (
    key_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(64) NOT NULL,
    hashed_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES "${USERS_TABLE}" (user_id) ON DELETE CASCADE
  );

  -- Now create the index with the correct definition
  CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON "${API_KEYS_TABLE}"(user_id);
  
  -- Create index on hashed_key for efficient lookups
  CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON "${API_KEYS_TABLE}"(hashed_key);
  
  -- Create index on key_prefix for filtering
  CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON "${API_KEYS_TABLE}"(key_prefix);
`;

/**
 * Ensures the users table exists
 */
async function ensureUsersTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(USERS_TABLE_SQL);
    console.log(`Table "${USERS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
    throw error;
  }
}

/**
 * Ensures the agents tables exist
 */
async function ensureAgentsTablesExist(client: PoolClient): Promise<void> {
  try {
    await client.query(AGENTS_TABLE_SQL);
    console.log(`Table "${AGENTS_TABLE}" ensured.`);
    
    await client.query(USER_AGENTS_TABLE_SQL);
    console.log(`Table "${USER_AGENTS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring agents tables exist:', error);
    throw error;
  }
}

/**
 * Ensures the conversations table exists
 */
async function ensureConversationsTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(CONVERSATIONS_TABLE_SQL);
    console.log(`Table "${CONVERSATIONS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring conversations table exists:', error);
    throw error;
  }
}

/**
 * Ensures the webhook tables exist
 */
async function ensureWebhookTablesExist(client: PoolClient): Promise<void> {
  try {
    await client.query(WEBHOOK_TABLE_SQL);
    console.log(`Table "${WEBHOOK_TABLE}" ensured.`);
    
    await client.query(AGENT_WEBHOOK_TABLE_SQL);
    console.log(`Table "${AGENT_WEBHOOK_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring webhook tables exist:', error);
    throw error;
  }
}

/**
 * Ensures the user credentials table exists
 */
async function ensureUserCredentialsTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(USER_CREDENTIALS_TABLE_SQL);
    console.log(`Table "${USER_CREDENTIALS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring user credentials table exists:', error);
    throw error;
  }
}

/**
 * Ensures the webhook events table exists
 */
async function ensureWebhookEventsTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(WEBHOOK_EVENTS_TABLE_SQL);
    console.log(`Table "${WEBHOOK_EVENTS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring webhook events table exists:', error);
    throw error;
  }
}

/**
 * Ensures the API keys table exists
 */
async function ensureApiKeysTableExists(client: PoolClient): Promise<void> {
  try {
    await client.query(API_KEYS_TABLE_SQL);
    console.log(`Table "${API_KEYS_TABLE}" ensured.`);
  } catch (error) {
    console.error('Error ensuring API keys table exists:', error);
    throw error;
  }
}

/**
 * Initialize all database schemas
 * This function ensures all tables required by the application exist
 * Call this at server startup
 */
export async function initializeAllSchemas(): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    
    console.log('Initializing database schemas...');
    
    // Create tables in order of dependencies
    await ensureUsersTableExists(client);
    await ensureAgentsTablesExist(client);
    await ensureConversationsTableExists(client);
    await ensureWebhookTablesExist(client);
    await ensureUserCredentialsTableExists(client);
    await ensureWebhookEventsTableExists(client);
    await ensureApiKeysTableExists(client);
    
    console.log('All database schemas initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schemas:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Export individual functions for service files to use if needed
export {
  ensureUsersTableExists,
  ensureAgentsTablesExist,
  ensureConversationsTableExists,
  ensureWebhookTablesExist,
  ensureUserCredentialsTableExists,
  ensureWebhookEventsTableExists,
  ensureApiKeysTableExists
}; 