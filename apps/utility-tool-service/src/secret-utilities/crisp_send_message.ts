/**
 * Crisp Send Message Utility
 * 
 * Sends a message to a Crisp conversation using the user's website ID
 * If the website ID is not available, provides a setup URL for the user
 */
import axios from 'axios';
import { z } from 'zod';
import {
  UtilityTool,
  SetupNeededResponse,
  UtilityErrorResponse
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getCrispEnvironmentVariables,
  checkCrispWebsiteId,
  getCrispWebsiteId,
  generateSetupNeededResponse,
  formatCrispErrorResponse,
  CrispErrorResponse
} from '../clients/crisp-utils.js';

// --- Local Type Definitions for this Utility ---

/**
 * Types of messages that can be sent via Crisp API
 */
type CrispMessageType = 'text' | 'note' | 'file' | 'animation' | 'audio' | 'picker' | 'field' | 'carousel' | 'event';

/**
 * Message sender types
 */
type CrispMessageSender = 'user' | 'operator';

/**
 * Message origin types
 */
type CrispMessageOrigin = 'chat' | 'email' | string; // 'urn:*' patterns are allowed

/**
 * User information for sending messages
 */
interface CrispMessageUser {
  nickname?: string;
  avatar?: string;
  [key: string]: any; // Additional user properties
}

/**
 * Request parameters for sending a message to Crisp
 */
interface CrispSendMessageParams {
  session_id: string;
  type: CrispMessageType;
  from: CrispMessageSender;
  origin?: CrispMessageOrigin;
  content: string | object;
  mentions?: string[];
  fingerprint?: string;
  user?: CrispMessageUser;
  references?: object;
  original?: object;
  timestamp?: number;
  stealth?: boolean;
  translated?: boolean;
  automated?: boolean;
}

/**
 * Represents a successful response when sending a Crisp message
 */
interface CrispSendMessageSuccessResponse {
  status: 'success';
  data: {
    message_id: string;
  };
}

/**
 * Union type representing all possible outcomes of the send message utility
 */
type CrispSendMessageResponse = 
  SetupNeededResponse | 
  CrispSendMessageSuccessResponse | 
  UtilityErrorResponse;

// --- End Local Type Definitions ---

// Zod schema for the content shapes of different message types
const textNoteContentSchema = z.string().describe("Simple string content for text/note messages");

const fileContentSchema = z.object({
  name: z.string().describe("File name"),
  url: z.string().url().describe("File URL"),
  type: z.string().describe("File MIME type")
}).describe("Content structure for 'file' message type");

const animationContentSchema = z.object({
  url: z.string().url().describe("Animation URL"),
  type: z.string().describe("Animation MIME type (e.g., 'image/gif')")
}).describe("Content structure for 'animation' message type");

const audioContentSchema = z.object({
  duration: z.number().describe("Audio duration in seconds"),
  url: z.string().url().describe("Audio file URL"),
  type: z.string().describe("Audio MIME type (e.g., 'audio/mp3')")
}).describe("Content structure for 'audio' message type");

const pickerContentSchema = z.object({
  id: z.string().describe("Picker identifier"),
  text: z.string().describe("Text prompt for the picker"),
  choices: z.array(z.object({
    value: z.string().describe("Choice value"),
    icon: z.string().optional().describe("Choice icon (must be an emoji character)"),
    label: z.string().describe("Choice label"),
    selected: z.boolean().describe("Whether choice is selected by default"),
    action: z.object({
      type: z.enum(['frame', 'link']).describe("Action type"),
      target: z.string().url().describe("Action target URL")
    }).optional().describe("Action to take when choice is clicked")
  })).describe("Array of choice objects"),
  required: z.boolean().optional().describe("Whether picker must be filled before continuing")
}).describe("Content structure for 'picker' message type");

const fieldContentSchema = z.object({
  id: z.string().describe("Field identifier"),
  text: z.string().describe("Field label text"),
  explain: z.string().describe("Field explanatory text"),
  value: z.string().optional().describe("Default field value"),
  required: z.boolean().optional().describe("Whether field must be filled before continuing")
}).describe("Content structure for 'field' message type");

const carouselContentSchema = z.object({
  text: z.string().describe("Carousel text"),
  targets: z.array(z.object({
    title: z.string().describe("Target title"),
    description: z.string().describe("Target description"),
    image: z.string().url().optional().describe("Target banner image URL"),
    actions: z.array(z.object({
      label: z.string().describe("Action label"),
      url: z.string().url().describe("Action link URL")
    })).describe("Target action buttons")
  })).describe("Array of carousel target objects")
}).describe("Content structure for 'carousel' message type");

const eventContentSchema = z.object({
  namespace: z.enum([
    'state:resolved',
    'user:blocked',
    'reminder:scheduled',
    'thread:started',
    'thread:ended',
    'participant:added',
    'participant:removed',
    'call:started',
    'call:ended'
  ]).describe("Event namespace"),
  text: z.string().describe("Event text description")
}).describe("Content structure for 'event' message type");

/**
 * Implementation of the Crisp Send Message utility
 */
const crispSendMessageUtility: UtilityTool = {
  id: 'crisp_send_message',
  description: 'Sends a message to a Crisp conversation.',
  schema: {
    session_id: { 
      zod: z.string().describe('The conversation session identifier.') 
    },
    type: { 
      zod: z.enum(['text', 'note', 'file', 'animation', 'audio', 'picker', 'field', 'carousel', 'event'])
            .describe('Message type. Valid values: text, note, file, animation, audio, picker, field, carousel, event.') 
    },
    from: { 
      zod: z.enum(['user', 'operator'])
            .describe('Message sender. Valid values: user, operator.') 
    },
    origin: { 
      zod: z.string()
            .describe('Message origin. Valid values: chat, email, urn:*.')
            .optional() 
    },
    content: { 
      zod: z.union([
              textNoteContentSchema,
              fileContentSchema,
              animationContentSchema,
              audioContentSchema,
              pickerContentSchema,
              fieldContentSchema,
              carouselContentSchema,
              eventContentSchema,
              z.object({}).passthrough() // Allow other content structures
            ])
            .describe(`Message content. Format depends on the message type:
              - For 'text' or 'note': Simple string value
              - For other types: Object with specific structure based on message type (see examples)`),
      examples: [
        "Hello, how can I help you?", // Text message
        { // Picker example
          id: "option_picker",
          text: "Choose an option:",
          choices: [
            {
              value: "option1",
              icon: "🔴",
              label: "Option 1",
              selected: false
            },
            {
              value: "option2",
              label: "Option 2",
              selected: true
            }
          ]
        },
        { // File example
          name: "document.pdf",
          url: "https://example.com/document.pdf",
          type: "application/pdf"
        },
        { // Event example
          namespace: "state:resolved",
          text: "Conversation marked as resolved"
        }
      ]
    },
    mentions: { 
      zod: z.array(z.string())
            .describe('Mentioned user identifiers. Array of strings.')
            .optional()
    },
    fingerprint: { 
      zod: z.string()
            .describe('Unique message fingerprint to avoid duplicates when using the API as per with the real-time sockets.')
            .optional()
    },
    user: { 
      zod: z.object({
              type: z.enum(['website', 'participant']).describe("User type").optional(),
              nickname: z.string().describe("User nickname").optional(),
              avatar: z.string().url().describe("User avatar URL").optional()
            })
            .passthrough()
            .describe('Sending user information with properties: type, nickname, avatar.')
            .optional(),
      examples: [{
        type: "website",
        nickname: "John Doe",
        avatar: "https://example.com/avatar.jpg"
      }]
    },
    references: { 
      zod: z.object({
              type: z.string().describe("Reference type, usually 'link'"),
              name: z.string().describe("Reference name"),
              target: z.string().url().describe("Reference target URL")
            })
            .passthrough()
            .describe('References adding more context to message.')
            .optional(),
      examples: [{
        type: "link",
        name: "Documentation",
        target: "https://docs.example.com"
      }]
    },
    original: { 
      zod: z.object({
              type: z.string().describe("Original data MIME type"),
              content: z.string().describe("Original message data content")
            })
            .passthrough()
            .describe('Original message data (available on a separate route).')
            .optional(),
      examples: [{
        type: "text/html",
        content: "<p>Original HTML content</p>"
      }]
    },
    timestamp: { 
      zod: z.number()
            .describe('Timestamp at which the message was sent, in milliseconds (if different than current timestamp).')
            .optional(),
      examples: [1650000000000]
    },
    stealth: { 
      zod: z.boolean()
            .describe('Message stealth mode (do not propagate message to the other party).')
            .optional(),
      examples: [true, false]
    },
    translated: { 
      zod: z.boolean()
            .describe('Whether message was auto-translated or not.')
            .optional(),
      examples: [true, false]
    },
    automated: { 
      zod: z.boolean()
            .describe('Whether message is automated or not (comes from a bot).')
            .optional(),
      examples: [true, false]
    },
  },
  
  execute: async (userId: string, conversationId: string, params: CrispSendMessageParams, agentId?: string): Promise<CrispSendMessageResponse> => {
    const logPrefix = '💬 [CRISP_SEND_MESSAGE]';
    try {
      // Validate required parameters
      if (!params.session_id) {
        return {
          status: 'error',
          error: 'Missing required parameter: session_id',
          details: 'The Crisp conversation session identifier is required'
        };
      }
      
      if (!params.type) {
        return {
          status: 'error',
          error: 'Missing required parameter: type',
          details: 'The message type is required'
        };
      }
      
      if (!params.from) {
        return {
          status: 'error',
          error: 'Missing required parameter: from',
          details: 'The message sender is required'
        };
      }
      
      if (params.content === undefined) {
        return {
          status: 'error',
          error: 'Missing required parameter: content',
          details: 'The message content is required'
        };
      }
      
      console.log(`${logPrefix} Sending message to session: ${params.session_id} for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl } = getCrispEnvironmentVariables();
      
      // Check if Crisp website ID is available
      const { exists } = await checkCrispWebsiteId(userId, secretServiceUrl);
      if (!exists) {
        return generateSetupNeededResponse(userId, secretServiceUrl, logPrefix, agentId);
      }
      
      // Get the website ID
      const { websiteId } = await getCrispWebsiteId(userId, secretServiceUrl);
      
      // Prepare the request payload
      const payload = {
        type: params.type,
        from: params.from,
        origin: params.origin || 'chat',
        content: params.content,
        ...(params.mentions && { mentions: params.mentions }),
        ...(params.fingerprint && { fingerprint: params.fingerprint }),
        ...(params.user && { user: params.user }),
        ...(params.references && { references: params.references }),
        ...(params.original && { original: params.original }),
        ...(params.timestamp && { timestamp: params.timestamp }),
        ...(params.stealth !== undefined && { stealth: params.stealth }),
        ...(params.translated !== undefined && { translated: params.translated }),
        ...(params.automated !== undefined && { automated: params.automated })
      };
      
      console.log(`${logPrefix} Calling Crisp API: POST /v1/website/${websiteId}/conversation/${params.session_id}/message`);
      
      // Call the Crisp API
      const crispResponse = await axios.post(
        `https://api.crisp.chat/v1/website/${websiteId}/conversation/${params.session_id}/message`,
        payload,
        {
          headers: {
            'X-Crisp-Tier': 'plugin',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`${logPrefix} Crisp API response status: ${crispResponse.status}`);
      
      // Extract message ID from response if available
      const messageId = crispResponse.data?.data?.message_id || 'unknown';
      
      // Construct success response
      const successResponse: CrispSendMessageSuccessResponse = {
        status: 'success',
        data: {
          message_id: messageId
        }
      };
      
      return successResponse;
      
    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      // Convert CrispErrorResponse to UtilityErrorResponse format
      const crispError = formatCrispErrorResponse(error);
      return {
        status: 'error',
        error: crispError.error,
        details: crispError.details
      };
    }
  }
};

// Register and Export
registry.register(crispSendMessageUtility);
export default crispSendMessageUtility; 