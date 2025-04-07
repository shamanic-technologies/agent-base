/**
 * MOCK Crisp Subscribe Message Send Utility
 * 
 * Simulates sending a message via the Crisp Subscribe API.
 * NOTE: This is a mock and does not perform any real API calls.
 */
import { UtilityTool } from '../types/index.js';
import { registry } from '../registry/registry.js';
import { 
  checkCrispWebhookSecret, 
  getCrispWebhookSecret, 
  getCrispEnvironmentVariables,
  generateAuthNeededResponse
} from './crisp-utils.js';

// --- Request Parameters --- 
interface CrispSubscribeMessageSendRequest {
  website_id: string;
  session_id: string;
  message_content: string;
  message_type?: 'text' | 'note'; // Example types
}

// --- Response Types --- 
interface CrispSubscribeSuccessResponse {
  success: true;
  data: {
    status: string;
    message_snippet: string;
    session_id: string;
  };
}

interface CrispSubscribeErrorResponse {
  success: false;
  error: {
    message: string;
  };
}

// Auth needed response type
interface CrispSubscribeAuthNeededResponse {
  needs_auth: true;
  auth_instructions: string;
  secret_type: string;
  message: string;
}

type CrispSubscribeResponse = CrispSubscribeSuccessResponse | CrispSubscribeErrorResponse | CrispSubscribeAuthNeededResponse;

// --- Utility Definition --- 
const crispSubscribeMessageSendUtility: UtilityTool = {
  id: 'utility_crisp_subscribe_message_send',
  description: 'Sends a message to a Crisp session using the Crisp API.',
  schema: {
    website_id: {
      type: 'string',
      optional: false,
      description: 'The Crisp Website ID.'
    },
    session_id: {
      type: 'string',
      optional: false,
      description: 'The Crisp Session ID to send the message to.'
    },
    message_content: {
      type: 'string',
      optional: false,
      description: 'The content of the message to send.'
    },
    message_type: {
      type: 'string',
      optional: true,
      description: 'Type of message (e.g., \'text\', \'note\'). Defaults to \'text\'.'
    }
  },
  
  execute: async (
      userId: string, 
      conversationId: string, 
      params: CrispSubscribeMessageSendRequest
  ): Promise<CrispSubscribeResponse> => {
    console.log(`🔔 [CRISP / crisp_subscribe_message_send] Executing for user: ${userId}, conversation: ${conversationId}`);
    
    try {
      const { 
          website_id, 
          session_id, 
          message_content, 
          message_type = 'text' // Default to text
      } = params;

      // --- Basic Validation --- 
      if (!website_id || !session_id || !message_content) {
        console.error('[CRISP] Missing required parameters.');
        return {
          success: false,
          error: {
            message: 'Missing required parameters: website_id, session_id, message_content.'
          }
        };
      }

      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getCrispEnvironmentVariables();
      
      // Check if user has the required webhook secret
      const { exists } = await checkCrispWebhookSecret(userId, secretServiceUrl);
      
      // If we don't have the webhook secret, return auth needed response
      if (!exists) {
        console.log(`🔔 [CRISP] No webhook secret found for user ${userId}`);
        return generateAuthNeededResponse(apiGatewayUrl, "[CRISP]") as CrispSubscribeAuthNeededResponse;
      }
      
      // Get the webhook secret
      const crispSecret = await getCrispWebhookSecret(userId, secretServiceUrl);

      // --- Mock API Call --- 
      console.log(`🔔 [CRISP] Simulating sending message to Crisp:`);
      console.log(`  - Website ID: ${website_id}`);
      console.log(`  - Session ID: ${session_id}`);
      console.log(`  - Type: ${message_type}`);
      console.log(`  - Content: \"${message_content.substring(0, 50)}...\"`);
      console.log(`  - Using webhook secret: ${crispSecret.webhookSecret.substring(0, 3)}...`);

      // For now, we'll simulate success without making a real API call
      // In a real implementation, we would make a fetch to the Crisp API here
      
      // Simulate success
      const response: CrispSubscribeSuccessResponse = {
        success: true,
        data: {
          status: 'sent',
          message_snippet: `${message_content.substring(0, 20)}...`,
          session_id: session_id
        }
      };
      
      return response;

    } catch (error) {
      console.error("❌ [CRISP / crisp_subscribe_message_send] Error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred'
        }
      };
    }
  }
};

// Register the utility
registry.register(crispSubscribeMessageSendUtility);

// Export the utility
export default crispSubscribeMessageSendUtility; 