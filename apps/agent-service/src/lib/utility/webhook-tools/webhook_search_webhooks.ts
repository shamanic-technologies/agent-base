/**
 * Webhook Utility: Search Webhooks
 *
 * A tool that calls the webhook service API via the API Gateway to search for webhook definitions.
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
  InternalServiceCredentials // Import this
} from '@agent-base/types';

// Import the new manual API client function
import { searchWebhooks as searchWebhooksApiClient } from '@agent-base/api-client'; // Use aliased import

/**
 * Creates the search webhooks tool with the given credentials.
 * This function configures and returns a tool runnable by the Vercel AI SDK.
 * 
 * @param {AgentServiceCredentials} agentServiceCredentials - Credentials required for authenticating the agent service.
 * @param {string} conversationId - The ID of the current conversation.
 * @returns {Tool} The configured tool for searching webhooks.
 */
export function createSearchWebhooksTool(agentServiceCredentials: AgentServiceCredentials, conversationId: string) : Tool {
  
  return tool({
    name: 'webhook_search_webhooks',
    description: 'Searches for existing webhook definitions using a text query. Requires platform-level authentication.',
    parameters: z.object({
      query: z.string().describe('The text query to search for (e.g., \"gmail\").'),
      limit: z.number().int().positive().optional().default(10).describe('Maximum number of results to return.')
    }),
    // Return type is Webhook array or UtilityError
    execute: async ({ query, limit }): Promise<Webhook[] | UtilityError> => {
      const logPrefix = '[Webhook Tool: Search]';
      try {
        console.log(`${logPrefix} Attempting to search webhooks with query: \"${query}\", limit: ${limit}`);
        
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

        if (!query) {
          return {
            error: true,
            message: 'query parameter is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } satisfies UtilityError;
        }

        // Construct credentials for the API client call
        // Note: searchWebhooksApiClient now expects InternalServiceCredentials
        const apiClientCredentials: InternalServiceCredentials = {
          platformApiKey,
          platformUserId,
          clientUserId,
          agentId
        };

        // --- Use Manual API Client ---
        const response = await searchWebhooksApiClient(
          { query, limit }, // Pass search params object
          apiClientCredentials
        );

        if (response.success) {
           console.log(`${logPrefix} Successfully found ${response.data.length} webhooks.`);
           return response.data; // Return the array of Webhook objects
        } else {
           console.error(`${logPrefix} API client failed to search webhooks: ${response.error} - ${response.message}`);
           return {
             error: true,
             message: response.message || 'Failed to search webhooks via API client.',
             status: 'error',
             code: response.error || 'SEARCH_WEBHOOKS_FAILED',
             details: response.details
           } satisfies UtilityError;
        }

      } catch (error: any) {
        console.error(`${logPrefix} Unexpected error executing search webhooks tool:`, error);
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