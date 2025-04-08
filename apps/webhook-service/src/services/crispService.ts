/**
 * Crisp Service
 * 
 * Handles Crisp webhook events and communicates with Crisp API
 */
import axios from 'axios';
import { 
  WebhookProvider, 
  WebhookEvent, 
  CrispWebhookEvent, 
  CrispMessage, 
  AgentRunResponse 
} from '../types/index.js';

/**
 * Process a Crisp webhook event into a standardized webhook event
 * @param event - Raw Crisp webhook event
 * @param signature - Crisp signature header for verification
 * @returns Processed webhook event
 */
export function processCrispEvent(event: CrispWebhookEvent, signature?: string): WebhookEvent {
  console.log(`🔍 [CRISP SERVICE] Processing ${event.event} event`);
  
  // Verify signature if provided
  if (signature) {
    // In production, verify the webhook signature here
    // Skip for now, but would use HMAC-SHA256 with shared secret
  }
  
  // Extract data for different event types
  let processedData: Record<string, any> = {};
  
  switch (event.event) {
    case 'message:send':
      if (event.data.message) {
        processedData = processMessageSend(event.data.message, event.data.session_id, event.data.website_id);
      }
      break;
      
    // Add more event types as needed
    default:
      console.log(`ℹ️ [CRISP SERVICE] Unhandled event type: ${event.event}`);
      break;
  }
  
  // Return standardized webhook event
  return {
    provider: WebhookProvider.CRISP,
    event_type: event.event,
    timestamp: event.timestamp,
    raw_data: event,
    processed_data: processedData
  };
}

/**
 * Process a Crisp message:send event
 * @param message - Crisp message
 * @param sessionId - Crisp session ID
 * @param websiteId - Crisp website ID
 * @returns Processed message data
 */
function processMessageSend(message: CrispMessage, sessionId: string, websiteId: string): Record<string, any> {
  console.log(`🔍 [CRISP SERVICE] Processing message:send event`);
  
  // Only process messages from users (not from operators/bots)
  if (message.from !== 'user') {
    console.log(`ℹ️ [CRISP SERVICE] Ignoring message from ${message.from}`);
    return {};
  }
  
  // Extract message content and metadata
  return {
    text: message.content,
    sender: {
      type: message.from,
      nickname: message.user?.nickname || 'User',
      user_id: message.user?.user_id || sessionId
    },
    conversation: {
      session_id: sessionId,
      website_id: websiteId
    },
    message_type: message.type
  };
}

/**
 * Send a response back to Crisp conversation
 * @param websiteId - Crisp website ID
 * @param sessionId - Crisp session ID
 * @param message - Message to send
 * @returns Response from Crisp API
 */
export async function sendCrispResponse(
  websiteId: string,
  sessionId: string,
  message: string
): Promise<{ success: boolean, message_id?: string, error?: string }> {
  try {
    console.log(`📤 [CRISP SERVICE] Sending response to Crisp conversation ${sessionId.substring(0, 8)}...`);
    
    // Get Crisp API credentials
    const apiKey = process.env.CRISP_API_KEY;
    const apiIdentifier = process.env.CRISP_API_IDENTIFIER;
    
    if (!apiKey || !apiIdentifier) {
      throw new Error('Crisp API credentials not configured');
    }
    
    // Prepare authentication
    const auth = Buffer.from(`${apiIdentifier}:${apiKey}`).toString('base64');
    
    // Call Crisp API to send message
    const response = await axios.post(
      `https://api.crisp.chat/v1/website/${websiteId}/conversation/${sessionId}/message`,
      {
        type: 'text',
        from: 'operator',
        origin: 'chat',
        content: message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    if (response.status === 201) {
      console.log(`✅ [CRISP SERVICE] Response sent successfully to Crisp conversation`);
      return {
        success: true,
        message_id: response.data?.data?.message_id
      };
    } else {
      console.error(`❌ [CRISP SERVICE] Failed to send response to Crisp: ${response.status}`);
      return {
        success: false,
        error: `Crisp API returned status code ${response.status}`
      };
    }
  } catch (error) {
    console.error(`❌ [CRISP SERVICE] Error sending response to Crisp:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process a response from agent and send it back to Crisp
 * @param agentResponse - Response from agent
 * @param websiteId - Crisp website ID
 * @param sessionId - Crisp session ID
 * @returns Result of sending the response
 */
export async function handleAgentResponse(
  agentResponse: AgentRunResponse,
  websiteId: string,
  sessionId: string
): Promise<{ success: boolean, error?: string }> {
  try {
    console.log(`🔄 [CRISP SERVICE] Processing agent response for Crisp conversation`);
    
    if (!agentResponse.success || !agentResponse.response) {
      console.error(`❌ [CRISP SERVICE] Agent returned error or no response`);
      return {
        success: false,
        error: agentResponse.error || 'Agent provided no response'
      };
    }
    
    // Send agent's response to Crisp
    return await sendCrispResponse(
      websiteId,
      sessionId,
      agentResponse.response.content
    );
  } catch (error) {
    console.error(`❌ [CRISP SERVICE] Error handling agent response:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 