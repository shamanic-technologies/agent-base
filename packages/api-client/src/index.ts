/**
 * Entry point for the API Client package.
 * Exports all client functions for consumption by other services.
 */

// Export functions from specific database client files
// Using .js extension consistent with module resolution
export * from './internal-to-internal/database-clients/agent-client.js';
export * from './internal-to-internal/database-clients/platform-user.js';
export * from './internal-to-internal/database-clients/conversation-client.js';
export * from './internal-to-internal/database-clients/api-key-client.js';
export * from './internal-to-internal/database-clients/oauth-client.js';
// export * from './database-clients/webhook-client.js';
export * from './internal-to-internal/database-clients/client-user.js'; // Ensure this is present
export * from './internal-to-internal/database-clients/action-client.js'; // Export new action client
export * from './internal-to-internal/user-client.js';

// Export functions from web OAuth service client files
// export * from './internal/web-oauth-client.js';

// Export Secret Service client functions
export * from './internal-to-internal/secret-client.js';

// Export the Key Service client function
export * from './internal-to-internal/key-client.js';

// Export API Tool Service client functions
export * from './internal-to-internal/api-tool-client.js';

// Export utility functions/types if any
export * from './utils/service-client.js';
export * from './utils/header.js';
export * from './utils/config.js';

export * from './internal-to-internal/utility-tool-client.js';

// Export agent service client functions
export * from './internal-to-internal/agent-clients/agent-client.js';
export * from './internal-to-internal/agent-clients/action-client.js';


// Export shared utilities or functions if any
// export * from './utils';

// Re-export everything from the generated client
// export * from './generated/index.js';

// Export the new manual webhook client
export * from './internal-to-internal/webhook-client.js';
export * from './internal-to-internal/payment-client.js';
export * from './internal-to-internal/tool-auth-client.js';

// Export tool creators
export * from './internal-to-internal/tools/tool-creators.js';


export * from './internal-to-external/agent-clients/agent-client.js';
export * from './internal-to-external/agent-clients/conversation-client.js';
export * from './internal-to-external/agent-clients/message-client.js';
export * from './internal-to-external/agent-clients/run-client.js';
export * from './internal-to-external/webhook-tool-client.js';
export * from './internal-to-external/api-tool-client.js';
export * from './internal-to-external/secret-client.js';

export * from './external-to-internal/tool-auth-client.js';