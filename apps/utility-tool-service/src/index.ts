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

// Import utility tools
// import './oauth-utilities/gmail_read.js';
// import './external/secret-utilities/stripe_list_charges.js';
// import './external/secret-utilities/stripe_list_refunds.js';
// import './external/secret-utilities/stripe_list_balance_transactions.js';
// import './external/secret-utilities/stripe_refund.js';
// import './external/secret-utilities/stripe_list_customers.js';
// import './external/secret-utilities/stripe_search_customers.js';
// import './external/secret-utilities/stripe_get_customer.js';
// import './external/secret-utilities/crisp_send_message.js';

// import './external/webhook-utilities/crisp_subscribe_message_send.js';

// Re-export everything from the registry
export * from './registry/registry.js';

// /**
//  * Get information about all available utilities
//  * @returns Array of utility information objects
//  */
// export function getAvailableUtilities() {
//   return registry.listUtilities();
// }

// /**
//  * Execute a utility with the given parameters
//  * @param utilityId The ID of the utility to execute
//  * @param userId The ID of the user making the request
//  * @param conversationId The ID of the conversation context
//  * @param params The parameters to pass to the utility
//  * @returns The result of the utility execution
//  */
// export async function executeUtility(
//   utilityId: string,
//   userId: string,
//   conversationId: string,
//   params: any
// ) {
//   return await registry.execute(utilityId, userId, conversationId, params);
// }

// Export the registry as default
export default registry; 