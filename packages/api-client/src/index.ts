/**
 * Entry point for the API Client package.
 * Exports all client functions for consumption by other services.
 */

// Export functions from specific database client files
// Using .js extension consistent with module resolution
export * from './internal/database-clients/agent-client.js';
export * from './internal/database-clients/platform-user.js';
export * from './internal/database-clients/conversation-client.js';
export * from './internal/database-clients/api-key-client.js';
export * from './internal/database-clients/oauth-client.js';
// export * from './database-clients/webhook-client.js';
export * from './internal/database-clients/client-user.js'; // Ensure this is present

// Export functions from web OAuth service client files
export * from './internal/web-oauth-client.js';

// Export Secret Service client functions
export * from './internal/secret-client.js';

// Export the Key Service client function
export * from './internal/key-client.js';

// Export utility functions/types if any
export * from './utils/service-client.js';
export * from './utils/header.js';
export * from './utils/config.js';

export * from './internal/external-utility-tool-client.js';
export * from './internal/utility-tool-client.js';

// Export agent service client functions
export * from './internal/agent-clients/conversation-client.js';
export * from './internal/agent-clients/run-client.js';

// Export shared utilities or functions if any
// export * from './utils';

// Re-export everything from the generated client
// export * from './generated/index.js';

// Export the new manual webhook client
export * from './internal/webhook-client.js';

// Export tool creators
export * from './internal/tools/tool-creators.js';

export * from './external/agent-clients/agent-client.js';
export * from './external/agent-clients/conversation-client.js';
