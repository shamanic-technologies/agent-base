/**
 * Utility Tool Service
 * 
 * Main entry point for the utility tool service. This file initializes and exports
 * all available utilities through the registry.
 */
import { registry } from './registry/registry.js';

// Import all utilities to ensure they register themselves
import './internal/api-utilities/database/get-database.js';
import './internal/api-utilities/database/create-table.js';
import './internal/api-utilities/database/get-table.js';
import './internal/api-utilities/database/query-table.js';
import './internal/api-utilities/database/alter-table.js';
import './internal/api-utilities/database/delete-table.js';

import './internal/api-utilities/google/search.js';
import './internal/api-utilities/google/maps.js';
import './internal/api-utilities/google/flights.js';

import './internal/api-utilities/web/read-webpage.js';

import './internal/basic-utilities/get-current-datetime.js';

// Import internal utility for managing external tools
import './internal/internal-utilities/create-external-tool.js';

// Re-export everything from the registry
export * from './registry/registry.js';

// Export the registry as default
export default registry; 