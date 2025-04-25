/**
 * Webhook Utility: Link Agent to User Webhook
 *
 * A tool that calls the webhook service API via the API Gateway to link an agent 
 * to an active webhook configuration already linked to the authenticated client user.
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
  WebhookAgentLink, // Use this type now
  InternalServiceCredentials // Import this
} from '@agent-base/types';

// Import the new manual API client function
import { linkAgentToWebhook as linkAgentToWebhookApiClient } from '@agent-base/api-client'; // Use aliased import

/**
 * Creates the link agent to webhook tool with the given credentials.
 * This function configures and returns a tool runnable by the Vercel AI SDK.
 * 
 * @param {AgentServiceCredentials} agentServiceCredentials - Credentials required for authenticating the agent service. Requires clientUserId.
 * @param {string} conversationId - The ID of the current conversation.
 * @returns {Tool} The configured tool for linking agents to webhooks.
 */
export function createLinkAgentToWebhookTool(agentServiceCredentials: AgentServiceCredentials, conversationId: string) : Tool {
  
  return tool({
    name: 'webhook_link_agent',
    description: 'Links an agent to an active webhook configuration already linked to the authenticated client user. Requires client-level authentication.',
    parameters: z.object({
      webhookId: z.string().uuid().describe('The UUID of the webhook definition.'),
      agentId: z.string().uuid().describe('The ID of the agent to link.') // Agent ID now comes from params
    }),
    // Return type is WebhookAgentLink or UtilityError
    execute: async ({ webhookId, agentId }): Promise<WebhookAgentLink | UtilityError> => {
      const logPrefix = '[Webhook Tool: Link Agent]';
      try {
        console.log(`${logPrefix} Attempting to link agent ${agentId} to webhook: ${webhookId}`);
        
        // Credentials passed from agent service core
        const { platformUserId, clientUserId, platformApiKey, agentId: credentialsAgentId } = agentServiceCredentials;

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

        if (!webhookId || !agentId) {
          return {
            error: true,
            message: 'webhookId and agentId parameters are required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } satisfies UtilityError;
        }

        // Construct credentials for the API client call
        const apiClientCredentials: InternalServiceCredentials = {
          platformApiKey,
          platformUserId,
          clientUserId,
          // Use agentId from credentials if available, otherwise maybe null/undefined?
          // The client function expects agentId in the credentials used for the *request headers/auth*
          agentId: credentialsAgentId 
        };

        // --- Use Manual API Client ---
        // Pass the agentId from the tool parameters *to* the API client function,
        // which will put it in the request body.
        const response = await linkAgentToWebhookApiClient(
          webhookId,
          agentId, // Pass agentId from parameters here
          apiClientCredentials
        );

        if (response.success) {
          console.log(`${logPrefix} Successfully linked agent ${response.data.agentId} to webhook ${webhookId}.`);
          return response.data; // Return the WebhookAgentLink object
        } else {
           console.error(`${logPrefix} API client failed to link agent: ${response.error} - ${response.message}`);
           return {
             error: true,
             message: response.message || 'Failed to link agent to webhook via API client.',
             status: 'error',
             code: response.error || 'LINK_AGENT_FAILED',
             details: response.details
           } satisfies UtilityError;
        }

      } catch (error: any) {
        console.error(`${logPrefix} Unexpected error executing link agent tool:`, error);
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