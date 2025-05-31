/**
 * Database Table Name Constants
 *
 * This file centralizes all database table name definitions for the database-service.
 * Import these constants into service files to ensure consistency and avoid typos.
 */

export const PLATFORM_USERS_TABLE = 'platform_users';
export const CLIENT_USERS_TABLE = 'client_users';
export const CLIENT_ORGANIZATIONS_TABLE = 'client_organizations';
export const AGENTS_TABLE = 'agents';
export const CLIENT_USER_AGENTS_TABLE = 'client_user_agents';
export const CONVERSATIONS_TABLE = 'conversations';
export const CLIENT_USER_OAUTH_TABLE = 'client_user_oauth';
export const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
export const CLIENT_USER_CLIENT_ORGANIZATION_TABLE = 'client_user_client_organization';
// Add other table names here as needed, for example:
// export const WEBHOOK_TABLE = 'webhook';
// export const AGENT_WEBHOOK_TABLE = 'agent_webhook';
// export const WEBHOOK_EVENTS_TABLE = 'webhook_events'; 