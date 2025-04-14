// /**
//  * Stripe List Balance Transactions Utility
//  * 
//  * Lists all balance transactions from Stripe using the user's API keys
//  * This provides a comprehensive view of money moving in and out of the Stripe account
//  * If keys are not available, provides an API endpoint for the user to submit their keys
//  */
// import Stripe from 'stripe';
// import { z } from 'zod'; // Import Zod
// import { 
//   UtilityTool,
//   SetupNeededResponse,
//   UtilityErrorResponse,
//   UtilityToolSchema // Import if needed
// } from '../../types/index.js'; // Keep generic types
// import { registry } from '../../registry/registry.js';
// import {
//   getStripeEnvironmentVariables,
//   checkStripeApiKeys,
//   getStripeApiKeys,
//   generateSetupNeededResponse,
//   formatStripeErrorResponse,
//   // Import Stripe-specific types from stripe-utils
//   StripeTransactionsRequest, 
//   StripeTransactionsResponse,
//   StripeTransaction,
//   StripeTransactionsSuccessResponse // Also needed for constructing success response
// } from '../external/oauth-utilities/clients/stripe-utils.js';

// /**
//  * Available transaction types to filter by (as per Stripe documentation)
//  */
// const stripeTransactionTypes = [
//   'charge', 
//   'refund', 
//   'adjustment', 
//   'application_fee', 
//   'application_fee_refund', 
//   'dispute', 
//   'payment', 
//   'payout', 
//   'payout_cancel', 
//   'payout_failure', 
//   'transfer', 
//   'transfer_cancel', 
//   'transfer_failure', 
//   'transfer_refund'
// ] as const; // Use 'as const' for a literal type

// type StripeTransactionType = typeof stripeTransactionTypes[number];

// /**
//  * Implementation of the Stripe List Balance Transactions utility
//  */
// const stripeListBalanceTransactions: UtilityTool = {
//   id: 'utility_stripe_list_balance_transactions',
//   description: 'Lists balance transactions from Stripe',
//   // Update schema to match Record<string, UtilityToolSchema>
//   schema: {
//     limit: { // Parameter name
//       zod: z.number().int().positive().max(100)
//             .describe('Max number of transactions to return (1-100, default 10)')
//             .optional(),
//       examples: [10, 50]
//     },
//     starting_after: { // Parameter name
//       zod: z.string().startsWith('txn_')
//             .describe('Pagination cursor (transaction ID to start after)')
//             .optional(),
//       examples: ['txn_1J23456789abcdef']
//     },
//     ending_before: { // Parameter name
//       zod: z.string().startsWith('txn_')
//             .describe('Pagination cursor (transaction ID to end before)')
//             .optional(),
//       examples: ['txn_9K87654321fedcba']
//     },
//     type: { // Parameter name
//       zod: z.enum(stripeTransactionTypes)
//             .describe('Filter by transaction type')
//             .optional(),
//       examples: ['charge', 'refund', 'payout']
//     }
//   },
  
//   execute: async (userId: string, conversationId: string, params: StripeTransactionsRequest): Promise<StripeTransactionsResponse> => {
//     const logPrefix = '💰 [STRIPE_LIST_BALANCE_TRANSACTIONS]';
//     try {
//       // Use raw params, assuming validation happens elsewhere
//       const { limit = 10, starting_after, ending_before, type } = params || {}; // Revert to using raw params
//       console.log(`${logPrefix} Listing balance transactions for user ${userId}`);
      
//       // Check if keys exist
//       const secretServiceUrl = process.env.SECRET_SERVICE_URL; 
//       if (!secretServiceUrl) throw new Error('SECRET_SERVICE_URL not set');

//       const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
//       if (!exists) {
//         // Return standard setup needed response
//         const setupResponse: SetupNeededResponse = generateSetupNeededResponse(userId, conversationId, logPrefix);
//         return setupResponse;
//       }
      
//       // Get API keys
//       const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
//       // Initialize Stripe client
//       const stripe = new Stripe(stripeKeys.apiSecret, {
//         // Use API version required by installed Stripe library types
//         apiVersion: '2025-03-31.basil',
//       });

//       // Prepare parameters for Stripe API
//       const listParams: Stripe.BalanceTransactionListParams = {
//         limit: Math.min(limit, 100), // Ensure limit is within bounds
//         starting_after,
//         ending_before,
//         type: type as StripeTransactionType, // Cast type if needed, validation ensures it's correct
//       };

//       // Fetch transactions
//       const transactionsResponse = await stripe.balanceTransactions.list(listParams);
      
//       // Map transactions and convert amount from cents to main unit
//       const processedData = transactionsResponse.data.map(tx => ({
//         ...tx,
//         // Convert Unix timestamp (seconds) to ISO 8601 string
//         created: new Date(tx.created * 1000).toISOString(), 
//         // Divide amount by 100 to convert from cents to main currency unit
//         amount: tx.amount / 100,
//         // Ensure net amount is also converted if it exists (common in balance transactions)
//         net: tx.net ? tx.net / 100 : undefined,
//         // Ensure fee is also converted if it exists
//         fee: tx.fee ? tx.fee / 100 : undefined
//       }));
      
//       // Prepare success response with processed data, conforming to StripeTransactionsSuccessResponse
//       const successResponse: StripeTransactionsSuccessResponse = {
//         status: 'success',
//         count: processedData.length,
//         has_more: transactionsResponse.has_more,
//         // Ensure processedData conforms to StripeTransaction[] structure if necessary
//         data: processedData as unknown as StripeTransaction[], 
//       };
//       return successResponse;
      
//     } catch (error) {
//       console.error(`${logPrefix} Error:`, error);
//       // Use the standardized error formatter
//       const errorResponse: UtilityErrorResponse = formatStripeErrorResponse(error);
//       return errorResponse;
//     }
//   }
// };

// // Register the utility
// registry.register(stripeListBalanceTransactions);

// // Export the utility
// export default stripeListBalanceTransactions; 