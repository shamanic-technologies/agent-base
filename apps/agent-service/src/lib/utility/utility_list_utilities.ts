/**
 * Utility List Utilities
 * 
 * A tool that calls the utility service API to get a list of available utilities.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';
// Use local types for agent-service specific structures
import { UtilityError, UtilityToolCredentials } from '../../types/index.js';
// Import shared types from agents package
import { ServiceResponse, UtilitiesList } from '@agent-base/agents';
import { handleAxiosError } from '../utils/errorHandlers.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// Get API Gateway URL from environment variables
const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

/**
 * Creates the list utilities tool with the given credentials
 */
export function createListUtilitiesTool(credentials: UtilityToolCredentials) {
  const { userId, conversationId, apiKey, agent_id } = credentials;
  
  return tool({
    name: 'utility_list_utilities',
    description: 'Get a list of all available utilities.',
    parameters: z.object({}),
    execute: async () => {
      try {
        console.log(`[Utility Tool] Listing utilities`);
        console.log(`[Utility Tool] API key: ${apiKey}`);
        
        // Define the expected structure for the nested data
        type ListResponseData = {
            count: number;
            utilities: UtilitiesList;
        };

        const response = await axios.get<ServiceResponse<ListResponseData>>(
          `${API_GATEWAY_URL}/utility-tool/get-list`, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'x-agent-id': agent_id
            }
          }
        );
        
        if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.utilities)) {
            console.log(`[Utility Tool] List utilities successful. Count: ${response.data.data.count}`);
            // Map to only ID and Description
            const formattedUtilities = response.data.data.utilities.map((util: any) => ({
                id: util.id,
                description: util.description,
            }));
          
            return formattedUtilities;
        } else {
            // Handle failure case from utility service
            const errorMessage = response.data?.error || 'Failed to list utilities.';
            const errorDetails = response.data?.details;
            console.error(`[Utility Tool] Utility service failed to list utilities: ${errorMessage}`, errorDetails);
            return {
                error: true,
                message: errorMessage,
                details: errorDetails,
                status: 'error',
                code: 'LIST_FAILED' // Add default error code
            } as UtilityError;
        }

      } catch (error) {
        console.error('[Utility Tool] Error listing utilities:', error);
        // handleAxiosError should format the error correctly
        return handleAxiosError(error, `${API_GATEWAY_URL}/utility-tool/get-list`);
      }
    }
  });
} 