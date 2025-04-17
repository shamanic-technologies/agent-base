/**
 * Entry point for the API Client package.
 * Exports all client functions for consumption by other services.
 */

// Export functions from specific database client files
export * from './database-clients/agent-client';
export * from './database-clients/platform-user';
export * from './database-clients/conversation-client';
export * from './database-clients/api-key-client';
export * from './database-clients/oauth-client';
export * from './database-clients/webhook-client';
export * from './database-clients/client-user';

// Export functions from web OAuth service client files
export * from './web-oauth-client';

// Export Secret Service client functions
export * from './secret-client';

// Export the Key Service client function
export * from './key-client';

// Export utility functions/types if any
export * from './utils/service-client';