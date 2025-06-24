/**
 * Utility Tool Service
 * 
 * Main entry point for the utility tool service. This file initializes and exports
 * all available utilities through the registry.
 */
import { registry } from './registry/registry.js';

// Import all utilities to ensure they register themselves
import './internal/database-utilities/get-database';
import './internal/database-utilities/create-table';
import './internal/database-utilities/query-database';
import './internal/database-utilities/get-table';
// import './internal/basic-utilities/database/alter-table';
// import './internal/basic-utilities/database/delete-table';

import './internal/basic-utilities/google/search';
import './internal/basic-utilities/google/maps';
import './internal/basic-utilities/google/flights';

import './internal/basic-utilities/web/read-webpage';

import './internal/basic-utilities/get-current-datetime';
import './internal/basic-utilities/curl-command';

import './internal/dashboard-utilities/create-dashboard';
import './internal/dashboard-utilities/list-dashboards';
import './internal/dashboard-utilities/get-dashboard';
import './internal/dashboard-utilities/update-dashboard';
import './internal/dashboard-utilities/delete-dashboard';
import './internal/dashboard-utilities/list-dashboard-blocks';
import './internal/dashboard-utilities/get-dashboard-block-by-id';

// Import internal utility for managing external tools
import './internal/api-utilities/create-api-tool';
import './internal/api-utilities/rename-api-tool';
import './internal/api-utilities/delete-api-tool';
import './internal/api-utilities/update-api-tool';

import './internal/agent-utilities/update-memory';
import './internal/agent-utilities/get-actions';

// User utilities
import './internal/user-utilities/get-organizations';
import './internal/user-utilities/update-organization';
import './internal/user-utilities/delete-organization';
import './internal/user-utilities/get-active-organization';

// Import internal webhook utilities
import './internal/webhook-utilities/webhook_create_webhook';
import './internal/webhook-utilities/webhook_search_webhooks';
import './internal/webhook-utilities/webhook_link_user';
import './internal/webhook-utilities/webhook_link_agent';
import './internal/webhook-utilities/webhook_get_latest_events';
import './internal/webhook-utilities/webhook_rename_webhook';
import './internal/webhook-utilities/webhook_delete_webhook';
import './internal/webhook-utilities/webhook_update_webhook';

// Re-export everything from the registry
export * from './registry/registry.js';

// Export the registry as default
export default registry; 