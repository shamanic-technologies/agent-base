/**
 * Utility Tool Service
 * 
 * Main entry point for the utility tool service. This file initializes and exports
 * all available utilities through the registry.
 */
import { registry } from './registry/registry.js';

// Import all utilities to ensure they register themselves
import './internal/basic-utilities/database/get-database.js';
import './internal/basic-utilities/database/create-table.js';
import './internal/basic-utilities/database/get-table.js';
import './internal/basic-utilities/database/query-table.js';
import './internal/basic-utilities/database/alter-table.js';
import './internal/basic-utilities/database/delete-table.js';

import './internal/basic-utilities/google/search.js';
import './internal/basic-utilities/google/maps.js';
import './internal/basic-utilities/google/flights.js';

import './internal/basic-utilities/web/read-webpage.js';

import './internal/basic-utilities/get-current-datetime.js';
import './internal/basic-utilities/curl-command.js';

// Import internal utility for managing external tools
import './internal/api-utilities/create-api-tool.js';
import './internal/agent-utilities/update-memory.js';
import './internal/agent-utilities/get-actions.js';

// Import internal webhook utilities
import './internal/webhook-utilities/webhook_create_webhook.js';
import './internal/webhook-utilities/webhook_search_webhooks.js';
import './internal/webhook-utilities/webhook_link_user.js';
import './internal/webhook-utilities/webhook_link_agent.js';
import './internal/webhook-utilities/webhook_get_latest_events.js';

// Re-export everything from the registry
export * from './registry/registry.js';

// Export the registry as default
export default registry; 