// /**
//  * API Client for interacting with the Secret Service
//  */
// import { 
//     ServiceResponse, 
//     PlatformUserApiServiceCredentials 
//   } from '@agent-base/types';
//   import { makePlatformUserApiServiceRequest } from '../utils/service-client.js';
//   import { getApiGatewayServiceUrl } from '../utils/config.js'; // Import the centralized getter
  
//   /**
//    * Calls a specific utility tool via the API Gateway using makeAPIServiceRequest.
//    * 
//    * @param config - API client configuration (URL, credentials).
//    * @param utilityId - The ID of the utility to call.
//    * @param executeToolPayload - Input parameters for the utility.
//    * @returns The ServiceResponse from the API Gateway.
//    * @throws Throws AxiosError if the request fails (handled by makeAPIServiceRequest, returning ErrorResponse).
//    */
//   export async function getOrCreateStripeCustomerExternalApiClient(
//     externalApiServiceCredentials: PlatformUserApiServiceCredentials,
//   ): Promise<ServiceResponse<string>> {
  
//     // Use makeAPIServiceRequest, passing conversationId in data and agentId for header
//     return await makePlatformUserApiServiceRequest<string>(
//         getApiGatewayServiceUrl(),
//         'post',
//         'payment/customer', // Endpoint for getting or creating a stripe customer
//         externalApiServiceCredentials,
//         undefined, // Request body (data)
//         undefined // No query parameters (params)
//     );
//   }
  