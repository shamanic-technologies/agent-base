// /**
//  * Crisp Subscribe Message Send Utility
//  * 
//  * Sets up a Crisp webhook subscription to forward messages.
//  */
// // Remove Zod import if not needed
// // import { z } from 'zod'; 
// import { UtilityTool, SetupNeededResponse, UtilityErrorResponse } from '../../types/index.js';
// import { registry } from '../../registry/registry.js';
// import { 
//   checkCrispWebsiteId, 
//   getCrispWebsiteId, 
//   getCrispEnvironmentVariables,
//   generateSetupNeededResponse,
//   CrispWebsiteDetails
// } from '../external/oauth-utilities/clients/crisp-utils.js';

// // --- Request Parameters --- 
// // No parameters for this utility

// // --- Response Types --- 
// interface CrispSubscribeSuccessResponse {
//   status: 'success'; // Standard success status
//   data: {
//     webhook_id: string;
//     message: string;
//   };
// }

// // Update the combined response type
// type CrispSubscribeResponse = CrispSubscribeSuccessResponse | SetupNeededResponse | UtilityErrorResponse;

// // --- Utility Definition --- 
// const crispSubscribeMessageSendUtility: UtilityTool = {
//   id: 'utility_crisp_subscribe_message_send',
//   description: 'Sets up a Crisp webhook to forward visitor messages to the agent.',
//   schema: {}, 
  
//   execute: async (
//       userId: string, 
//       conversationId: string, 
//       params: any, // Params are expected but not used
//       agentId?: string
//   ): Promise<CrispSubscribeResponse> => {
//     const logPrefix = '🔔 [CRISP_SUBSCRIBE]';
//     console.log(`${logPrefix} Executing for user: ${userId}, conversation: ${conversationId}`);
//     if (agentId) {
//       console.log(`${logPrefix} Request made by agent: ${agentId}`);
//     }
    
//     try {
//       // No validation needed for empty schema

//       // Get environment variables
//       const { secretServiceUrl, apiGatewayUrl } = getCrispEnvironmentVariables();
      
//       // Check if user has the required website ID
//       const { exists } = await checkCrispWebsiteId(userId, secretServiceUrl);
      
//       // If we don't have the website ID, return setup needed response
//       if (!exists) {
//         console.log(`${logPrefix} No website ID found for user ${userId}`);
//         return generateSetupNeededResponse(userId, secretServiceUrl, logPrefix, agentId);
//       }
      
//       // Get the website ID
//       const crispDetails: CrispWebsiteDetails = await getCrispWebsiteId(userId, secretServiceUrl);
      
//       const response: CrispSubscribeSuccessResponse = {
//         status: 'success', 
//         data: {
//           webhook_id: crispDetails.websiteId,
//           message: `Successfully simulated webhook setup for message:send event.`
//         }
//       }; 
      
//       return response;

//     } catch (error) {
//       console.error(`${logPrefix} Error:`, error);
      
//       // Handle other errors - return standard UtilityErrorResponse
//       return {
//         status: 'error', 
//         error: 'Failed to set up Crisp webhook subscription',
//         details: error instanceof Error ? error.message : String(error)
//       };
//     }
//   }
// };

// // Register the utility
// registry.register(crispSubscribeMessageSendUtility);

// // Export the utility
// export default crispSubscribeMessageSendUtility; 