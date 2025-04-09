/**
 * Utility Call Utility
 * 
 * A tool that calls any other utility function by its ID through the utility service.
 * Follows Vercel AI SDK tool format for Claude integration.
 */

// @ts-ignore - Tool import from ai package
import { tool } from 'ai';
import { z } from "zod";
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
 * Creates the call utility tool with the given credentials
 */
export function createCallUtilityTool(credentials: UtilityToolCredentials) {
  const { userId, conversationId, apiKey, agent_id } = credentials;
  
  return tool({
    name: 'utility_call_utility',
    description: 'Execute a specific utility function by its ID.',
    parameters: z.object({
      utility_id: z.string().describe('The ID of the utility to call'),
      parameters: z.record(z.any()).optional().describe('The parameters to pass to the utility')
    }),
    execute: async ({ utility_id, parameters }) => {
      try {
        console.log(`[Utility Tool] Calling utility ${utility_id} with parameters:`, parameters);
        
        if (!utility_id) {
          return {
            error: true,
            message: 'utility_id is required',
            status: 'error',
            code: 'MISSING_PARAMETER'
          } as UtilityError;
        }
        
        const response = await axios.post(
          `${API_GATEWAY_URL}/utility-tool/call-tool/${utility_id}`, 
          {
            input: parameters || {},
            conversation_id: conversationId,
            user_id: userId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'x-agent-id': agent_id
            }
          }
        );
        
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
        console.error(`[Utility Tool] Error calling utility ${utility_id}:`, error);
        return handleAxiosError(error, `${API_GATEWAY_URL}/utility-tool/call-tool/${utility_id}`);
      }
    }
  });
} 