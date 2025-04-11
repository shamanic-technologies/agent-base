/**
 * MOCK Crisp Subscribe Message Send Utility
 * 
 * Simulates sending a message via the Crisp Subscribe API.
 * NOTE: This is a mock and does not perform any real API calls.
 */
import { UtilityTool } from '../types/index.js';
import { registry } from '../registry/registry.js';
import { SetupNeededResponse } from '../types/index.js';
import { 
  checkCrispWebsiteId, 
  getCrispWebsiteId, 
  getCrispEnvironmentVariables,
  generateSetupNeededResponse
} from '../clients/crisp-utils.js';

// --- Request Parameters --- 
interface CrispSubscribeMessageSendRequest {
  // No required parameters
}

// --- Response Types --- 
interface CrispSubscribeSuccessResponse {
  success: true;
  message: {
    id: string;
    status: string;
    content: string;
    snippet: string;
    session_id: string;
    created: number;
  };
}

interface CrispSubscribeErrorResponse {
  success: false;
  error: string;
  details?: string;
}

type CrispSubscribeResponse = CrispSubscribeSuccessResponse | CrispSubscribeErrorResponse | SetupNeededResponse;

// --- Utility Definition --- 
const crispSubscribeMessageSendUtility: UtilityTool = {
  id: 'utility_crisp_subscribe_message_send',
  description: 'Set up a Crisp webhook that makes the chat visitors messages to be sent to the agent calling this tool',
  schema: {
    // No required inputs
  },
  
  execute: async (
      userId: string, 
      conversationId: string, 
      params: CrispSubscribeMessageSendRequest,
      agentId?: string
  ): Promise<CrispSubscribeResponse> => {
    console.log(`🔔 [CRISP / crisp_subscribe_message_send] Executing for user: ${userId}, conversation: ${conversationId}`);
    if (agentId) {
      console.log(`🔔 [CRISP / crisp_subscribe_message_send] Request made by agent: ${agentId}`);
    }
    
    try {

      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getCrispEnvironmentVariables();
      
      // Check if user has the required website ID
      const { exists } = await checkCrispWebsiteId(userId, secretServiceUrl);
      
      // If we don't have the website ID, return setup needed response
      if (!exists) {
        console.log(`🔔 [CRISP] No website ID found for user ${userId}`);
        return generateSetupNeededResponse(userId, secretServiceUrl, "[CRISP]", agentId);
      }
      
      // Get the website ID
      const crispDetails = await getCrispWebsiteId(userId, secretServiceUrl);

      // --- Mock API Call --- 
      console.log(`🔔 [CRISP] Simulating sending message to Crisp:`);
      console.log(`  - Website ID: ${crispDetails.websiteId}`);
 
      // For now, we'll simulate success without making a real API call
      // In a real implementation, we would make a fetch to the Crisp API here
      
      // Simulate success - Format similar to Stripe response structure
      const messageId = `msg_${Math.random().toString(36).substring(2, 15)}`;
      const timestamp = Math.floor(Date.now() / 1000);
      
      const response: CrispSubscribeSuccessResponse = {
        success: true,
        message: {
          id: messageId,
          status: 'sent',
          content: 'Hello from Crisp utility!',
          snippet: 'Hello from Crisp utility!',
          session_id: 'session_123',
          created: timestamp
        }
      };
      
      return response;

    } catch (error) {
      console.error("❌ [CRISP / crisp_subscribe_message_send] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: 'Error occurred while sending message to Crisp'
      };
    }
  }
};

// Register the utility
registry.register(crispSubscribeMessageSendUtility);

// Export the utility
export default crispSubscribeMessageSendUtility; 