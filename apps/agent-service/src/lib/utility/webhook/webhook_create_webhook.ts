/**
 * Webhook Utility: Create Webhook
 *
 * A tool that calls the webhook service API via the API Gateway to create a new webhook definition.
 * Uses the dedicated api-client.
 * Follows Vercel AI SDK tool format.
 */
// @ts-ignore - Tool import from ai package
import { tool, Tool } from 'ai';
import { z } from 'zod';
// Use local types for agent-service specific structures
import { UtilityError } from '../../../types/index.js';
// Import shared types
import { 
  ServiceResponse, 
  AgentServiceCredentials, 
  Webhook, // Use this type now
  WebhookData, // Use this type now
  UtilityProvider,
  UtilityInputSecret, 
  InternalServiceCredentials // Import this for manual client
} from '@agent-base/types';

// Import the new manual API client function
import { createWebhook as createWebhookApiClient } from '@agent-base/api-client'; // Use aliased import

// Zod schema for the WebhookData input, derived from openapi.json
const webhookDataSchema = z.object({
  name: z.string().describe('Human-readable name for the webhook (e.g., \'Gmail Handler\').'),
  description: z.string().describe('Description of what the webhook does (e.g., \'Processes new emails\').'),
  webhookProviderId: z.nativeEnum(UtilityProvider).describe('Identifier for the provider (e.g., GMAIL).'),
  subscribedEventId: z.string().describe('Provider-specific event ID (e.g., \'new_email\').'),
  // Ensure UtilityInputSecret includes action confirmations if needed, or adjust type
  requiredSecrets: z.array(z.union([z.nativeEnum(UtilityInputSecret), z.string()])).describe('List of secret types needed (e.g., [\"GMAIL_API_CREDENTIALS\", \"action_confirmation\"]).'), 
  userIdentificationMapping: z.record(z.string()).describe('Mapping of required secret types to user identification field names within the payload schema (e.g., { \"GMAIL_API_CREDENTIALS\": \"userId\", \"action_confirmation\": \"WEBHOOK_URL_INPUTED\" }).'),
  eventPayloadSchema: z.record(z.any()).describe('JSON schema object defining the expected payload for this webhook event.') // Using z.any() for simplicity
}).describe('Data required to create a new webhook definition.');


/**
 * Creates the create webhook tool with the given credentials.
 * This function configures and returns a tool runnable by the Vercel AI SDK.
 * 
 * @param {AgentServiceCredentials} agentServiceCredentials - Credentials required for authenticating the agent service.
 * @param {string} conversationId - The ID of the current conversation.
 * @returns {Tool} The configured tool for creating webhooks.
 */
export function createCreateWebhookTool(agentServiceCredentials: AgentServiceCredentials, conversationId: string) : Tool {
  
  return tool({
    name: 'webhook_create_webhook',
    description: 'Registers a new type of webhook that can be linked to users. Requires platform-level authentication.',
    parameters: z.object({
      // Use the Zod schema which mirrors the WebhookData type
      webhookData: webhookDataSchema.describe('The full configuration data for the new webhook definition.') 
    }),
    // Ensure the return type matches the Webhook model or UtilityError
    execute: async ({ webhookData }): Promise<Webhook | UtilityError> => {
      const logPrefix = '[Webhook Tool: Create]';
      try {
        console.log(`${logPrefix} Attempting to create webhook: ${webhookData.name}`);

        // Credentials passed from agent service core
        const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;

        // Validate required credentials
        if (!platformUserId || !clientUserId || !platformApiKey) {
          const missing = [
            !platformUserId ? 'platformUserId' : null,
            !clientUserId ? 'clientUserId' : null,
            !platformApiKey ? 'platformApiKey' : null
          ].filter(Boolean).join(', ');
          console.error(`${logPrefix} Missing required credentials: ${missing}`);
           return {
            error: true,
            message: `Internal error: Missing required credentials: ${missing}`,
            status: 'error',
            code: 'MISSING_CREDENTIALS'
          } satisfies UtilityError;
        }
        
        if (!webhookData) {
          return {
            error: true,
            message: 'webhookData parameter is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } satisfies UtilityError;
        }
        
        // Construct credentials for the API client call
        // Note: createWebhookApiClient now expects InternalServiceCredentials
        const apiClientCredentials: InternalServiceCredentials = {
          platformApiKey,
          platformUserId,
          clientUserId, 
          agentId // Pass agentId if available/needed by internal request helper
        };

        // --- Use Manual API Client ---
        const response = await createWebhookApiClient(
          webhookData as WebhookData, // Cast Zod type to TS type
          apiClientCredentials
        );

        if (response.success) {
          console.log(`${logPrefix} Successfully created webhook: ${response.data.id}`);
          return response.data; // Return the Webhook object
        } else {
          console.error(`${logPrefix} API client failed to create webhook: ${response.error} - ${response.message}`);
          return {
            error: true,
            message: response.message || 'Failed to create webhook definition via API client.',
            status: 'error',
            code: response.error || 'CREATE_WEBHOOK_FAILED',
            details: response.details
          } satisfies UtilityError;
        }

      } catch (error: any) {
        console.error(`${logPrefix} Unexpected error executing create webhook tool:`, error);
        return {
            error: true,
            message: error instanceof Error ? error.message : 'An unexpected error occurred during tool execution.',
            status: 'error',
            code: 'TOOL_EXECUTION_ERROR'
        } satisfies UtilityError;
      }
    }
  });
} 