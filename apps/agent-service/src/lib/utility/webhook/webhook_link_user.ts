/**
 * Webhook Utility: Link User to Webhook
 *
 * A tool that calls the webhook service API via the API Gateway to link a user to a specific webhook definition.
 * It handles responses indicating success or required setup steps.
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
  UserWebhook, // Use this type now
  WebhookSetupNeeded, // Use this type now
  InternalServiceCredentials // Import this
} from '@agent-base/types';

// Import the new manual API client function
import { linkUserToWebhook as linkUserToWebhookApiClient } from '@agent-base/api-client'; // Use aliased import

// Define the expected success data type
type LinkUserSuccessData = UserWebhook | WebhookSetupNeeded;

/**
 * Creates the link user to webhook tool with the given credentials.
 * This function configures and returns a tool runnable by the Vercel AI SDK.
 * 
 * @param {AgentServiceCredentials} agentServiceCredentials - Credentials required for authenticating the agent service. Requires clientUserId.
 * @param {string} conversationId - The ID of the current conversation.
 * @returns {Tool} The configured tool for linking users to webhooks.
 */
export function createLinkUserToWebhookTool(agentServiceCredentials: AgentServiceCredentials, conversationId: string) : Tool {
  
  return tool({
    name: 'webhook_link_user',
    description: 'Links a specific webhook definition to the authenticated client user. Checks for required secrets and returns success or setup instructions. Requires client-level authentication.',
    parameters: z.object({
      webhookId: z.string().uuid().describe('The UUID of the webhook definition to link.')
    }),
    // Return type is UserWebhook, WebhookSetupNeeded, or UtilityError
    execute: async ({ webhookId }): Promise<LinkUserSuccessData | UtilityError> => {
      const logPrefix = '[Webhook Tool: Link User]';
      try {
        console.log(`${logPrefix} Attempting to link user to webhook: ${webhookId}`);
        
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
        
        if (!webhookId) {
          return {
            error: true,
            message: 'webhookId parameter is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } satisfies UtilityError;
        }

        // Construct credentials for the API client call
        const apiClientCredentials: InternalServiceCredentials = {
          platformApiKey,
          platformUserId,
          clientUserId,
          agentId
        };

        // --- Use Manual API Client ---
        const response = await linkUserToWebhookApiClient(
          webhookId,
          apiClientCredentials
        );

        if (response.success) {
            console.log(`${logPrefix} Successfully processed link request for webhook ${webhookId}.`);
            // Return the actual data (UserWebhook or WebhookSetupNeeded)
            return response.data as LinkUserSuccessData; 
        } else {
             console.error(`${logPrefix} API client failed to link user: ${response.error} - ${response.message}`);
             return {
               error: true,
               message: response.message || 'Failed to link user to webhook via API client.',
               status: 'error',
               code: response.error || 'LINK_USER_FAILED',
               details: response.details
             } satisfies UtilityError;
        }

      } catch (error: any) {
        console.error(`${logPrefix} Unexpected error executing link user tool:`, error);
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