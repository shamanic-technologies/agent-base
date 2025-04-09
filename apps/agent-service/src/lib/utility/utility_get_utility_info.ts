/**
 * Utility Get Utility Info
 * 
 * A tool that calls the utility service API to get information about a specific utility.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import { UtilityError, UtilityToolCredentials } from '../../types/index.js';
import { handleAxiosError } from '../utils/errorHandlers.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// API Gateway URL from environment variables
const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

/**
 * Creates the get utility info tool with the given credentials
 */
export function createGetUtilityInfoTool(credentials: UtilityToolCredentials) {
  const { userId, conversationId, apiKey, agent_id } = credentials;
  
  return tool({
    name: 'utility_get_utility_info',
    description: 'Get detailed information about a specific utility.',
    parameters: z.object({
      utility_id: z.string().describe('The ID of the utility to get information about')
    }),
    execute: async ({ utility_id }) => {
      try {
        console.log(`[Utility Tool] Getting info for utility: ${utility_id}`);
        
        if (!utility_id) {
          return {
            error: true,
            message: 'utility_id is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } as UtilityError;
        }
        
        const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-details/${utility_id}`, {
          params: {
            user_id: userId,
            conversation_id: conversationId
          },
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'x-agent-id': agent_id
          }
        });
        
        if (response.data) {
          return response.data;
        }
        
        return {
          error: true,
          message: 'Invalid response from API Gateway',
          status: 'error',
          code: 'INVALID_RESPONSE'
        } as UtilityError;
      } catch (error) {
        console.error(`[Utility Tool] Error getting info for utility ${utility_id}:`, error);
        return handleAxiosError(error, `${API_GATEWAY_URL}/utility-tool/get-details/${utility_id}`);
      }
    }
  });
} 