// /**
//  * Stripe List Refunds Utility
//  * 
//  * Lists refunds (money returned to customers) from Stripe using the user's API keys
//  * If keys are not available, provides an API endpoint for the user to submit their keys
//  */
// import axios from 'axios';
// import { z } from 'zod'; // Import Zod
// import { 
//   UtilityTool,
//   SetupNeededResponse,
//   UtilityErrorResponse,
//   UtilityToolSchema // Import if needed
// } from '../../types/index.js';
// import { registry } from '../../registry/registry.js';
// import {
//   getStripeEnvironmentVariables,
//   checkStripeApiKeys,
//   getStripeApiKeys,
//   generateSetupNeededResponse,
//   formatStripeErrorResponse,
//   StripeTransactionsResponse,
//   StripeTransaction
// } from '../external/oauth-utilities/clients/stripe-utils.js';

// // Define the specific parameters for this utility
// interface StripeListRefundsParams {
//     limit?: number;
//     starting_after?: string; 
//     ending_before?: string; 
//     charge_id?: string; // Specific param for listing refunds by charge
// }

// // Combined response type - simplified as StripeTransactionsResponse handles the union
// // type StripeListRefundsResponse = StripeTransactionsResponse | SetupNeededResponse;

// /**
//  * Implementation of the Stripe List Refunds utility
//  */
// const stripeListRefundsUtility: UtilityTool = {
//   id: 'stripe_list_refunds',
//   description: 'List Stripe refunds, optionally filtered by charge ID.',
//   // Update schema to match Record<string, UtilityToolSchema>
//   schema: {
//     limit: { // Parameter name
//       zod: z.number().int().positive().max(100)
//             .describe('Maximum number of refunds to return (1-100, default 10)')
//             .optional(),
//       examples: [10, 50]
//     },
//     starting_after: { // Parameter name
//       zod: z.string().startsWith('re_') // Refund IDs start with re_
//             .describe('Cursor for pagination (refund ID to start after)')
//             .optional(),
//       examples: ['re_1J23456789abcdef']
//     },
//     ending_before: { // Parameter name
//       zod: z.string().startsWith('re_') // Refund IDs start with re_
//             .describe('Cursor for pagination (refund ID to end before)')
//             .optional(),
//       examples: ['re_9K87654321fedcba']
//     },
//     charge_id: { // Parameter name
//       zod: z.string().startsWith('ch_') // Charge IDs start with ch_
//             .describe('Only return refunds for a specific charge ID')
//             .optional(), // Marked optional in schema, but required in current execute logic.
//       examples: ['ch_1J23456789abcdef']
//     }
//   },
  
//   execute: async (userId: string, conversationId: string, params: StripeListRefundsParams): Promise<StripeTransactionsResponse> => {
//     const logPrefix = '💸 [STRIPE_LIST_REFUNDS]';
//     try {
//       // Use raw params
//       const { 
//         limit = 10,
//         starting_after,
//         ending_before,
//         charge_id // Use raw param
//       } = params || {};
      
//       if (!userId || !conversationId) {
//         console.error(`${logPrefix} Missing userId or conversationId`);
//         // Ensure formatStripeErrorResponse can handle this or return UtilityErrorResponse directly
//         return {
//             status: 'error',
//             error: 'Missing user or conversation context.'
//         };
//       }
      
//       // Get necessary environment variables
//       const { secretServiceUrl } = getStripeEnvironmentVariables(); // Error handled within the function

//       // Check if Stripe keys exist
//       const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
//       if (!exists) {
//           console.log(`${logPrefix} Stripe setup needed for user ${userId}`);
//           return generateSetupNeededResponse(userId, conversationId, logPrefix);
//       }
      
//       // Get Stripe keys
//       const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
//       // stripeKeys will contain { apiKey, apiSecret }
      
//       // Construct query parameters for Stripe API
//       const queryParams: any = { limit: Math.min(limit, 100) }; // Ensure limit is within 1-100
//       if (starting_after) queryParams.starting_after = starting_after;
//       if (ending_before) queryParams.ending_before = ending_before;
      
//       // Add charge filter if provided - CURRENT LOGIC REQUIRES IT
//       if (charge_id) {
//         queryParams.charge = charge_id; // Use the correct param name for Stripe API
//       } else {
//         // Keep the requirement based on current logic. If this should be optional, API call needs change.
//         console.error(`${logPrefix} Missing required parameter: charge_id`);
//         return { 
//             status: 'error',
//             error: 'Missing required parameter: charge_id is needed to list refunds.' 
//         };
//       }
      
//       console.log(`${logPrefix} Calling Stripe API: GET /v1/refunds with params:`, queryParams);
      
//       // Make the request to Stripe API
//       const stripeResponse = await axios.get(
//         `https://api.stripe.com/v1/refunds`, // Use the correct refunds endpoint
//         {
//           params: queryParams,
//           headers: {
//             Authorization: `Bearer ${stripeKeys.apiSecret}`, // Use the fetched secret key
//             'Stripe-Version': '2024-04-10' // Use a specific API version
//           }
//         }
//       );
      
//       console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
      
//       const refunds = stripeResponse.data.data || [];
      
//       // Map Stripe refunds to your StripeTransaction format and convert amount
//       const transactions = refunds.map((refund: any): StripeTransaction => ({
//         id: refund.id,
//         object: refund.object,
//         amount: refund.amount / 100, // Divide amount by 100
//         currency: refund.currency,
//         created: new Date(refund.created * 1000).toISOString(), // Convert timestamp
//         status: refund.status,
//         description: refund.reason || refund.description, // Use reason if available
//         customer: undefined, // Refund object doesn't directly link to customer
//         // Add other relevant refund fields if needed
//       }));
      
//       // Return success response matching StripeTransactionsSuccessResponse structure
//       const successResponse: StripeTransactionsResponse = {
//         status: 'success',
//         count: transactions.length,
//         has_more: stripeResponse.data.has_more,
//         data: transactions,
//       };
      
//       return successResponse;
//     } catch (error: any) {
//       console.error("❌ [STRIPE_LIST_REFUNDS] Error:", error);
//       // Remove Zod error handling
//       return formatStripeErrorResponse(error);
//     }
//   }
// };

// // Register the utility
// registry.register(stripeListRefundsUtility);

// // Export the utility
// export default stripeListRefundsUtility; 