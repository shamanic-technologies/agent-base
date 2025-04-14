// /**
//  * Stripe Search Customers Utility
//  * 
//  * Searches customers from Stripe using the user's API keys and Stripe Search Query Language
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
//   formatStripeErrorResponse
// } from '../external/oauth-utilities/clients/stripe-utils.js';

// // --- Local Type Definitions for this Utility ---

// /**
//  * Represents a single customer object returned by Stripe list/search.
//  */
// interface StripeCustomerSummary {
//   id: string;
//   email?: string | null;
//   name?: string | null;
//   phone?: string | null;
//   created: string;
//   currency?: string | null;
//   description?: string | null;
// }

// /**
//  * Represents a successful response when searching Stripe customers.
//  */
// interface StripeSearchCustomersSuccessResponse {
//   status: 'success';
//   data: {
//     count: number;
//     has_more: boolean;
//     data: StripeCustomerSummary[];
//     query_used: string; // Include the query used for the search
//   }
// }

// /**
//  * Union type representing all possible outcomes of the search customers utility.
//  */
// type StripeSearchCustomersResponse = 
//   SetupNeededResponse | 
//   StripeSearchCustomersSuccessResponse | 
//   UtilityErrorResponse;

// /**
//  * Request parameters for searching Stripe customers
//  */
// interface StripeSearchCustomersParams {
//   query: string; // Required search query (uses Stripe Query Language)
//   limit?: number;
//   page?: string; // Pagination token for search results
// }

// // --- End Local Type Definitions ---

// /**
//  * Implementation of the Stripe Search Customers utility
//  */
// const stripeSearchCustomersUtility: UtilityTool = {
//   id: 'stripe_search_customers',
//   description: 'Searches for customers in Stripe using a query string (Stripe Query Language).',
//   // Update schema to match Record<string, UtilityToolSchema>
//   schema: {
//     query: { // Parameter name
//       zod: z.string()
//             .describe(`Required search query using Stripe Query Language (e.g., "email:'test@example.com'" or "name:'Jane Doe' AND metadata['order_id']:'123'").`), // Not optional
//       examples: ["email:'customer@example.com'", "name:'Acme Corp'", "metadata['userId']:'u123'"]
//     },
//     limit: { // Parameter name
//       zod: z.number().int().positive().max(100)
//             .describe('Maximum number of customers to return (1-100, default 10).')
//             .optional(),
//       examples: [10, 50]
//     },
//     page: { // Parameter name
//       zod: z.string()
//             .describe('Pagination token for fetching the next page of results.')
//             .optional(),
//       examples: ['eyJzdGFydGluZ19hZnRlciI6ImN1c18xMjMifQ=='] // Example based on Stripe format
//     }
//   },
  
//   execute: async (userId: string, conversationId: string, params: StripeSearchCustomersParams): Promise<StripeSearchCustomersResponse> => {
//     const logPrefix = '🔍 [STRIPE_SEARCH_CUSTOMERS]';
//     try {
//       // Use raw params
//       const { 
//         query,
//         limit = 10,
//         page
//       } = params || {};
      
//       // Ensure required query param exists
//       if (!query) {
//          console.error(`${logPrefix} Missing required parameter: query`);
//          // Return standard UtilityErrorResponse
//          return {
//             status: 'error',
//             error: 'Missing required parameter: query.'
//          };
//       }
      
//       console.log(`${logPrefix} Searching customers for user: ${userId}, Query: ${query}`);
      
//       // Get environment variables and keys
//       const { secretServiceUrl } = getStripeEnvironmentVariables();
//       const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
//       if (!exists) {
//         return generateSetupNeededResponse(userId, conversationId, logPrefix);
//       }
//       const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
//       // Construct query parameters for Stripe Search API
//       const queryParams: any = { 
//         query: query,
//         limit: Math.min(limit, 100) // Ensure limit is within bounds
//       }; 
//       if (page) queryParams.page = page;
      
//       console.log(`${logPrefix} Calling Stripe API: GET /v1/customers/search with params:`, queryParams);

//       // Call the Stripe Search API
//       const stripeResponse = await axios.get(
//         `https://api.stripe.com/v1/customers/search`,
//         {
//           params: queryParams,
//           headers: {
//             'Authorization': `Bearer ${stripeKeys.apiSecret}`,
//             'Stripe-Version': '2024-04-10'
//           }
//         }
//       );
      
//       console.log(`${logPrefix} Stripe API response status: ${stripeResponse.status}`);
//       const customers = stripeResponse.data.data || [];
      
//       // Map response to summary format
//       const customerSummaries = customers.map((cust: any): StripeCustomerSummary => ({
//         id: cust.id,
//         email: cust.email,
//         name: cust.name,
//         phone: cust.phone,
//         created: new Date(cust.created * 1000).toISOString(),
//         currency: cust.currency,
//         description: cust.description
//       }));
      
//       // Construct success response
//       const successResponse: StripeSearchCustomersSuccessResponse = {
//         status: 'success',
//         data: {
//           count: customerSummaries.length,
//           has_more: stripeResponse.data.has_more,
//           query_used: stripeResponse.data.query, // Include the query from response
//           data: customerSummaries
//         }
//       };
      
//       return successResponse;
      
//     } catch (error: any) {
//       console.error("❌ [STRIPE_SEARCH_CUSTOMERS] Error:", error);
//       // Remove Zod error handling
      
//       // Handle potential query syntax errors from Stripe (often 400)
//       if (axios.isAxiosError(error) && error.response?.status === 400) {
//          // Return standard UtilityErrorResponse
//          return {
//             status: 'error',
//             error: `Stripe query error: ${error.response?.data?.error?.message || 'Invalid query syntax.'}`, 
//             details: `Query used: ${params?.query}`
//         };
//       }
//       // Use the utility function which should return UtilityErrorResponse
//       return formatStripeErrorResponse(error);
//     }
//   }
// };

// // Register and Export
// registry.register(stripeSearchCustomersUtility);
// export default stripeSearchCustomersUtility; 