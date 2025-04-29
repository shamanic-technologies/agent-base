/**
 * Entry point for the API Client package.
 * Exports all client functions for consumption by other services.
 */

// Export functions from specific database client files
// Using .js extension consistent with module resolution
export * from './database-clients/agent-client.js';
export * from './database-clients/platform-user.js';
export * from './database-clients/conversation-client.js';
export * from './database-clients/api-key-client.js';
export * from './database-clients/oauth-client.js';
// export * from './database-clients/webhook-client.js';
export * from './database-clients/client-user.js'; // Ensure this is present

// Export functions from web OAuth service client files
export * from './web-oauth-client.js';

// Export Secret Service client functions
export * from './secret-client.js';

// Export the Key Service client function
export * from './key-client.js';

// Export utility functions/types if any
export * from './utils/service-client.js';
export * from './utils/header.js';
export * from './utils/config.js';

export * from './external-utility-tool-client.js';
export * from './utility-tool-client.js';

// Export agent service client functions
export * from './agent-clients/conversation-client.js';
export * from './agent-clients/run-client.js';

// Export shared utilities or functions if any
// export * from './utils';

// Re-export everything from the generated client
// export * from './generated/index.js';

// Export the new manual webhook client
export * from './webhook-client.js';

// Export tool creators
export * from './tools/tool-creators.js';
