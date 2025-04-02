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
import { UtilityError } from '../../types/index.js';
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
export function createListUtilitiesTool(credentials: { 
  userId: string;
  conversationId: string;
  apiKey: string;
}) {
  const { userId, conversationId, apiKey } = credentials;
  
  return tool({
    name: 'utility_list_utilities',
    description: 'Get a list of all available utilities.',
    parameters: z.object({}),
    execute: async () => {
      try {
        console.log(`[Utility Tool] Listing utilities`);
        console.log(`[Utility Tool] API key: ${apiKey}`);
        
        const response = await axios.get(`${API_GATEWAY_URL}/utility-tool/get-list`, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          }
        });
        
        if (response.data && response.data.utilities && Array.isArray(response.data.utilities)) {
          const formattedUtilities = response.data.utilities.map((util: any) => ({
            id: util.id,
            name: util.name || util.id,
            description: util.description,
            category: util.category || 'general'
          }));
          
          return formattedUtilities;
        }
        
        return {
          error: true,
          message: 'Invalid response from API Gateway',
          status: 'error',
          code: 'INVALID_RESPONSE'
        } as UtilityError;
      } catch (error) {
        console.error('[Utility Tool] Error listing utilities:', error);
        return handleAxiosError(error, `${API_GATEWAY_URL}/utility-tool/get-list`);
      }
    }
  });
} 