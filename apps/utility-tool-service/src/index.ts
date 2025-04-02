/**
 * Utility Tool Service
 * 
 * Main entry point for the utility tool service. This file initializes and exports
 * all available utilities through the registry.
 */
import { registry } from './registry/registry.js';

// Import all utilities to ensure they register themselves
import './api-utilities/database/get-database.js';
import './api-utilities/database/create-table.js';
import './api-utilities/database/get-table.js';
import './api-utilities/database/query-table.js';
import './api-utilities/database/alter-table.js';
import './api-utilities/database/delete-table.js';

import './api-utilities/google/search.js';
import './api-utilities/google/maps.js';
import './api-utilities/google/flights.js';

import './api-utilities/web/read-webpage.js';

import './basic-utilities/get-current-datetime.js';

// Import utility tools
import './oauth-utilities/gmail_read.js';
import './secret-utilities/stripe_list_transactions.js';
import './secret-utilities/stripe_refund.js';

// Re-export everything from the registry
export * from './registry/index.js';

/**
 * Get information about all available utilities
 * @returns Array of utility information objects
 */
export function getAvailableUtilities() {
  return registry.listUtilities();
}

/**
 * Execute a utility with the given parameters
 * @param utilityId The ID of the utility to execute
 * @param userId The ID of the user making the request
 * @param conversationId The ID of the conversation context
 * @param params The parameters to pass to the utility
 * @returns The result of the utility execution
 */
export async function executeUtility(
  utilityId: string,
  userId: string,
  conversationId: string,
  params: any
) {
  return await registry.execute(utilityId, userId, conversationId, params);
}

// Export the registry as default
export default registry; 