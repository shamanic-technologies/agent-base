/**
 * Crisp Send Message Utility
 * 
 * Sends a message to an existing conversation in Crisp Chat using the user's API keys
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import {
  UtilityTool,
  SetupNeededResponse,
  UtilityErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';

// --- Local Type Definitions for this Utility ---

/**
 * Type representing the message content that can be sent to Crisp
 */
type MessageContent = string | object;

/**
 * Message types supported by Crisp API
 */
type MessageType = 'text' | 'note' | 'file' | 'animation' | 'audio' | 'picker' | 'field' | 'carousel' | 'event';

/**
 * Message origin values
 */
type MessageOrigin = 'chat' | 'email' | string; // string for 'urn:*' patterns

/**
 * Message sender values
 */
type MessageSender = 'user' | 'operator';

/**
 * Represents the parameters for sending a message to Crisp
 */
interface CrispSendMessageParams {
  website_id: string;
  session_id: string;
  type: MessageType;
  from: MessageSender;
  origin?: MessageOrigin;
  content: MessageContent;
  mentions?: string[];
  fingerprint?: string;
  user?: object;
  references?: object;
  original?: object;
  timestamp?: number;
  stealth?: boolean;
  translated?: boolean;
  automated?: boolean;
}

/**
 * Represents a successful response when sending a message to Crisp
 */
interface CrispSendMessageSuccessResponse {
  status: 'success';
  data: {
    message: string;
    message_id?: string;
  };
}

/**
 * Union type representing all possible outcomes of the Crisp send message utility
 */
type CrispSendMessageResponse = 
  SetupNeededResponse | 
  CrispSendMessageSuccessResponse | 
  UtilityErrorResponse;

// --- End Local Type Definitions ---

/**
 * Environment variables needed for Crisp Chat API
 * @returns Object containing necessary service URLs
 * @throws Error if required environment variables are not set
 */
function getCrispEnvironmentVariables(): { secretServiceUrl: string } {
  const secretServiceUrl = process.env.SECRET_SERVICE_URL;
  
  if (!secretServiceUrl) {
    throw new Error('SECRET_SERVICE_URL environment variable is not set');
  }
  
  return { secretServiceUrl };
}

/**
 * Check if the user has Crisp API keys stored
 * @param userId User ID to check
 * @param secretServiceUrl Secret service URL
 * @returns Object with exists flag
 */
async function checkCrispApiKeys(userId: string, secretServiceUrl: string): Promise<{ exists: boolean }> {
  const checkResponse = await axios.post(
    `${secretServiceUrl}/api/check-secret`,
    {
      userId,
      secretType: 'crisp_api_keys'
    }
  );
  
  return { exists: checkResponse.data.exists };
}

/**
 * Retrieve Crisp API keys for a user
 * @param userId User ID
 * @param secretServiceUrl Secret service URL
 * @returns Object containing the API keys if successful
 * @throws Error if retrieval fails or keys are invalid
 */
async function getCrispApiKeys(userId: string, secretServiceUrl: string): Promise<{ identifier: string; key: string }> {
  const getResponse = await axios.post(
    `${secretServiceUrl}/api/get-secret`,
    {
      userId,
      secretType: 'crisp_api_keys'
    }
  );
  
  if (!getResponse.data.success) {
    throw new Error(getResponse.data.error || 'Failed to retrieve Crisp API keys');
  }
  
  // Raw data retrieved from secret service
  const retrievedKeys = getResponse.data.data;
  
  // Validate the structure received from secret service
  if (!retrievedKeys || typeof retrievedKeys !== 'object') {
    throw new Error('Invalid data structure received for Crisp keys');
  }
  
  if (!retrievedKeys.identifier) {
    throw new Error('Crisp identifier is missing in the stored secret');
  }
  
  if (!retrievedKeys.key) {
    throw new Error('Crisp key is missing in the stored secret');
  }
  
  return {
    identifier: retrievedKeys.identifier,
    key: retrievedKeys.key
  };
}

/**
 * Generate the response indicating that Crisp setup is needed
 * @param userId User ID for whom the setup is needed
 * @param conversationId Conversation ID for context
 * @param logPrefix Prefix for console logs
 * @returns SetupNeededResponse object
 */
function generateCrispSetupNeededResponse(
  userId: string, 
  conversationId: string,
  logPrefix: string
): SetupNeededResponse {
  
  const secretServiceBaseUrl = process.env.SECRET_SERVICE_URL;
  
  if (!secretServiceBaseUrl) {
    console.error(`${logPrefix} Error: SECRET_SERVICE_URL is not set. Cannot generate popup URL.`);
    throw new Error('Configuration error: SECRET_SERVICE_URL is not set'); 
  }
  
  // Point to the specific /crisp endpoint and add userId
  const setupUrl = `${secretServiceBaseUrl}/crisp?userId=${encodeURIComponent(userId)}`; 
  
  console.log(`${logPrefix} Crisp keys not found, returning setup URL: ${setupUrl}`);
  
  return {
    status: 'success',
    data: {
      needs_setup: true,
      setup_url: setupUrl,
      provider: "crisp",
      message: "Crisp API keys are required.",
      title: "Connect Crisp Account",
      description: "Your API keys are needed to access your Crisp chat data",
      button_text: "Connect Crisp Account"
    }
  };
}

/**
 * Format a Crisp API error response
 * @param error Error object from caught exception
 * @returns UtilityErrorResponse object
 */
function formatCrispErrorResponse(error: any): UtilityErrorResponse {
  let responseError: string = "Failed to process Crisp operation";
  let responseDetails: string | undefined = undefined;
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 401 || status === 403) {
      responseError = "Authentication failed with Crisp API";
      responseDetails = "Please check your API keys are valid and have sufficient permissions";
    } else if (status === 404) {
      responseError = "Resource not found on Crisp API";
      responseDetails = data?.reason || data?.error || "The requested Crisp resource could not be found";
    } else if (status === 429) {
      responseError = "Too many requests to Crisp API";
      responseDetails = "You have exceeded the rate limit for Crisp API calls";
    } else {
      responseError = `Crisp API error: ${status}`;
      responseDetails = data?.reason || data?.error || data?.message || JSON.stringify(data);
    }
  } else if (error.request) {
    // The request was made but no response was received
    responseError = "No response received from Crisp API";
    responseDetails = "Check your network connection and Crisp service status";
  } else {
    // Something happened in setting up the request that triggered an Error
    responseError = "Error setting up Crisp API request";
    responseDetails = error.message;
  }
  
  return {
    status: 'error',
    error: responseError,
    details: responseDetails
  };
}

/**
 * Implementation of the Crisp Send Message utility
 */
const crispSendMessageUtility: UtilityTool = {
  id: 'crisp_send_message',
  description: 'Sends a message to an existing conversation in Crisp Chat.',
  schema: {
    website_id: { type: 'string', description: 'The website identifier in Crisp.' },
    session_id: { type: 'string', description: 'The conversation session identifier in Crisp.' },
    type: { type: 'string', description: 'Message type (text, note, file, etc.).' },
    from: { type: 'string', description: 'Message sender (user or operator).' },
    origin: { type: 'string', optional: true, description: 'Message origin (chat, email, urn:*).' },
    content: { type: 'any', description: 'Message content (string for text/note, object for others).' },
    mentions: { type: 'array', optional: true, description: 'Mentioned user identifiers.' },
    fingerprint: { type: 'string', optional: true, description: 'Unique message fingerprint to avoid duplicates.' },
    user: { type: 'object', optional: true, description: 'Sending user information.' },
    references: { type: 'object', optional: true, description: 'References adding more context to message.' },
    original: { type: 'object', optional: true, description: 'Original message data.' },
    timestamp: { type: 'number', optional: true, description: 'Timestamp at which the message was sent (milliseconds).' },
    stealth: { type: 'boolean', optional: true, description: 'Message stealth mode (do not propagate to other party).' },
    translated: { type: 'boolean', optional: true, description: 'Whether message was auto-translated or not.' },
    automated: { type: 'boolean', optional: true, description: 'Whether message is automated or not (comes from a bot).' },
  },
  
  execute: async (userId: string, conversationId: string, params: CrispSendMessageParams): Promise<CrispSendMessageResponse> => {
    const logPrefix = '💬 [CRISP_SEND_MESSAGE]';
    try {
      // Required parameters validation
      if (!params.website_id) {
        throw new Error('website_id is required');
      }
      if (!params.session_id) {
        throw new Error('session_id is required');
      }
      if (!params.type) {
        throw new Error('type is required');
      }
      if (!params.from) {
        throw new Error('from is required');
      }
      if (params.content === undefined || params.content === null) {
        throw new Error('content is required');
      }
      
      console.log(`${logPrefix} Sending message to session ${params.session_id} for website ${params.website_id} from ${params.from}`);
      
      // Get environment variables
      const { secretServiceUrl } = getCrispEnvironmentVariables();
      
      // Check if the user has Crisp API keys
      const { exists } = await checkCrispApiKeys(userId, secretServiceUrl);
      if (!exists) {
        return generateCrispSetupNeededResponse(userId, conversationId, logPrefix);
      }
      
      // Get Crisp API keys
      const crispKeys = await getCrispApiKeys(userId, secretServiceUrl);
      
      // Prepare request payload
      const requestPayload: any = {
        type: params.type,
        from: params.from,
        content: params.content
      };
      
      // Add optional fields if provided
      if (params.origin) requestPayload.origin = params.origin;
      if (params.mentions) requestPayload.mentions = params.mentions;
      if (params.fingerprint) requestPayload.fingerprint = params.fingerprint;
      if (params.user) requestPayload.user = params.user;
      if (params.references) requestPayload.references = params.references;
      if (params.original) requestPayload.original = params.original;
      if (params.timestamp) requestPayload.timestamp = params.timestamp;
      if (params.stealth !== undefined) requestPayload.stealth = params.stealth;
      if (params.translated !== undefined) requestPayload.translated = params.translated;
      if (params.automated !== undefined) requestPayload.automated = params.automated;
      
      console.log(`${logPrefix} Calling Crisp API: POST /website/${params.website_id}/conversation/${params.session_id}/message`);
      
      // Call the Crisp API to send message
      const crispResponse = await axios.post(
        `https://api.crisp.chat/v1/website/${params.website_id}/conversation/${params.session_id}/message`,
        requestPayload,
        {
          headers: {
            'X-Crisp-Key': `${crispKeys.identifier}:${crispKeys.key}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`${logPrefix} Crisp API response status: ${crispResponse.status}`);
      
      // Construct success response
      const successResponse: CrispSendMessageSuccessResponse = {
        status: 'success',
        data: {
          message: 'Message sent successfully',
          message_id: crispResponse.data?.data?.message_id
        }
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      return formatCrispErrorResponse(error);
    }
  }
};

// Register and Export
registry.register(crispSendMessageUtility);
export default crispSendMessageUtility; 