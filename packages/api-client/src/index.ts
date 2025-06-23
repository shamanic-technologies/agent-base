/**
 * Entry point for the API Client package.
 * Exports all client functions for consumption by other services.
 */

// Export utility functions/types if any
export * from './utils/service-client.js';
export * from './utils/header.js';
export * from './utils/config.js';


// Export functions from specific database client files
// Using .js extension consistent with module resolution
export * from './internal-to-internal/database-clients/agent-client.js';
export * from './internal-to-internal/database-clients/platform-user.js';
export * from './internal-to-internal/database-clients/conversation-client.js';
export * from './internal-to-internal/database-clients/api-key-client.js';
export * from './internal-to-internal/database-clients/oauth-client.js';
export * from './internal-to-internal/database-clients/client-user.js'; // Ensure this is present
export * from './internal-to-internal/database-clients/action-client.js'; // Export new action client
export * from './internal-to-internal/user-client.js';
export * from './internal-to-internal/secret-client.js';
export * from './internal-to-internal/key-client.js';
export * from './internal-to-internal/api-tool-client.js';
export * from './internal-to-internal/utility-tool-client.js';
export * from './internal-to-internal/agent-clients/agent-client.js';
export * from './internal-to-internal/agent-clients/action-client.js';
export * from './internal-to-internal/webhook-client.js';
export * from './internal-to-internal/payment-client.js';
export * from './internal-to-internal/tools/tool-creators.js';
export * from './internal-to-internal/dashboard-client.js';

export * from './external-to-internal/agent-clients/agent-client.js';
export * from './external-to-internal/agent-clients/conversation-client.js';
export * from './external-to-internal/agent-clients/message-client.js';
export * from './external-to-internal/agent-clients/run-client.js';
export * from './external-to-internal/tool-auth-client.js';
export * from './external-to-internal/api-tool-client.js';
export * from './external-to-internal/user-client.js';
export * from './external-to-internal/dashboard-client.js';

export * from './internal-to-external/webhook-tool-client.js';
export * from './internal-to-external/api-tool-client.js';
export * from './internal-to-external/secret-client.js';
export * from './internal-to-external/api-tool-client.js';
export * from './external-to-internal/agent-clients/agent-client.js';

