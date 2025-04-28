/**
 * API Tool: Create External Tool
 * 
 * Provides a tool interface to create a new tool configuration
 * by proxying the request to the external-utility-tool-service.
 * Follows Vercel AI SDK tool format.
 */
// @ts-ignore
import { tool, Tool } from 'ai';
import { z } from 'zod';
import { 
  ExternalUtilityTool, // Type for the tool configuration object
  ServiceResponse,
  UtilityProvider,
  AuthMethod,
  UtilityInputSecret,
  ApiKeyAuthScheme,
  HttpMethod ,
  ExecuteToolResult,
  AgentServiceCredentials,
  JsonSchema // Added for JsonSchema type
} from '@agent-base/types';
import { createExternalToolFromAgent } from '@agent-base/api-client';
import { UtilityError } from '../../../types/index.js';

// Define Zod schema for the external tool configuration based on ExternalUtilityTool type
const externalToolSchema = z.object({
  // --- Core Identification ---
  id: z.string().describe('REQUIRED. Unique identifier for the new tool (e.g., \'stripe_create_charge\'). Use snake_case.'),
  provider: z.nativeEnum(UtilityProvider).describe('REQUIRED. The service provider this tool interacts with.'),
  description: z.string().describe('REQUIRED. Human-readable description of what the tool does. This is shown to users and used by LLMs.'),
  
  // --- Input Schema Definition ---
  schema: z.record(z.object({
    jsonSchema: z.any().describe('The JSON schema for this parameter.') // Keeping it simple with z.any() for now, can be refined
  })).describe('REQUIRED. Defines the input parameters the tool accepts. Key-value pairs where the key is the parameter name and the value contains its JSON Schema definition.'),

  // --- Authentication & Secrets ---
  authMethod: z.nativeEnum(AuthMethod).describe('REQUIRED. The authentication method required by the tool.'),
  requiredSecrets: z.array(z.nativeEnum(UtilityInputSecret)).describe('REQUIRED (can be empty array). List of secrets that need to be configured for this tool (e.g., API keys, webhook confirmations).').default([]),
  requiredScopes: z.array(z.string()).describe('OPTIONAL. List of OAuth scopes required. ONLY use if authMethod is OAUTH.').default([]),
  apiKeyDetails: z.object({
    secretName: z.nativeEnum(UtilityInputSecret).describe('REQUIRED if apiKeyDetails is provided. The name of the secret (from requiredSecrets) that holds the API key value.'),
    scheme: z.nativeEnum(ApiKeyAuthScheme).describe('REQUIRED if apiKeyDetails is provided. How the API key is sent (Bearer, BasicUser, BasicPass, Header.'),
    headerName: z.string().optional().describe('OPTIONAL. The name of the HTTP header if scheme is Header.')
  }).optional().describe('OPTIONAL. Details on how to use an API key. ONLY use if authMethod is API_KEY.'),

  // --- API Call Details ---
  apiDetails: z.object({
    method: z.nativeEnum(HttpMethod).describe('REQUIRED if apiDetails is provided. HTTP method for the API call.'),
    baseUrl: z.string().url().describe('REQUIRED if apiDetails is provided. Base URL of the API (e.g., \'https://api.stripe.com/v1\').'),
    pathTemplate: z.string().describe('REQUIRED if apiDetails is provided. Path template with {placeholders} for path parameters (e.g., \'/customers/{customerId}\').'),
    paramMappings: z.object({
      path: z.record(z.string()).optional().describe('Map schema keys to path placeholders. e.g., { customerIdParam: \'customerId\' }.'),
      query: z.record(z.union([z.string(), z.object({ target: z.string(), transform: z.string() })])).optional().describe('Map schema keys to query parameter names. Can use { target: \'paramName\', transform: \'joinComma\'}. e.g., { emailParam: \'customer_email\', labelsParam: {target: \'tags\', transform: \'joinComma\'} }.'),
      body: z.record(z.string()).optional().describe('Map schema keys to JSON body field names. e.g., { amountParam: \'amount_cents\' }.'),
    }).optional().describe('OPTIONAL. Maps input parameters (from the tool\'s schema) to the API request parts (path, query, body).'),
    staticHeaders: z.record(z.string()).optional().describe('OPTIONAL. Static headers to include in the API request (e.g., { \'Content-Type\': \'application/json\' }).'),
  }).optional().describe('OPTIONAL. Defines how to make the actual API call to the external service.')
}).describe('The complete configuration object for the external tool to be created.');


/**
 * Creates the create_external_tool tool using the Vercel AI SDK format.
 * 
 * @param {AgentServiceCredentials} agentServiceCredentials - Credentials required for authenticating the agent service.
 * @param {string} conversationId - The ID of the current conversation.
 * @returns {Tool} The configured tool for creating external tools.
 */
export function createCreateExternalToolTool(agentServiceCredentials: AgentServiceCredentials, conversationId: string) : Tool {

  return tool({
    description: `Create a new external tool definition that can be executed later. 
Authentication and setup might be prompted to the user later when the tool is called. 
Once the tool is created, call get_utility_info on its ID to retrieve the parameters needed to call it.`,
    name: 'create_external_tool', // Using snake_case for tool name
    parameters: z.object({
      // The main parameter is the tool configuration object itself
      tool_configuration: externalToolSchema 
    }),
    execute: async ({ tool_configuration }): Promise<ExecuteToolResult | UtilityError> => {
      const logPrefix = '🛠️ [CREATE_EXTERNAL_TOOL_TOOL]';
      try {
        // Credentials passed from the factory function closure
        const { platformUserId, clientUserId, platformApiKey, agentId } = agentServiceCredentials;

        // Basic validation (zod handles structure, check required credentials)
        if (!platformUserId || !platformApiKey) {
            const missing = [
                !platformUserId ? 'platformUserId' : null,
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

        // The tool_configuration is already validated by zod via the parameters definition
        console.log(`${logPrefix} Attempting to create external tool with ID: ${tool_configuration.id} for platformUser ${platformUserId}`);

        // Prepare credentials for the API client call
        const apiClientCredentials : AgentServiceCredentials = {
          platformUserId, 
          clientUserId, // May be null or undefined if not applicable in this context, handle appropriately
          platformApiKey, 
          agentId
        };

        // Call the API client function to perform the actual creation
        const resultResponse : ServiceResponse<ExecuteToolResult> = await createExternalToolFromAgent(
          apiClientCredentials,
          conversationId,
          tool_configuration as ExternalUtilityTool // Cast Zod validated object to the expected TS type
        );

        if (!resultResponse.success) {
          console.error(`${logPrefix} Error creating external tool via API client:`, resultResponse.error, resultResponse.details);
          return {
            error: true,
            message: resultResponse.error || 'Failed to create external tool.',
            status: 'error',
            code: 'CREATE_TOOL_FAILED',
            details: resultResponse.details
          } satisfies UtilityError;
        }
        
        console.log(`${logPrefix} External tool creation successful via API client. Result:`, resultResponse.data);
        
        // Return the successful result from the API call
        // Ensure the structure matches ExecuteToolResult
        return resultResponse.data || { result: 'Successfully created tool definition.' }; // Provide a default success message if data is empty

      } catch (error: any) {
        console.error(`${logPrefix} Error executing utility:`, error);
        // Return standard utility error response
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

// Removed the static object definition and registry registration
// Removed the default export 