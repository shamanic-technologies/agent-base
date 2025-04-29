/**
 * Internal Utility: Create External Tool
 * 
 * Provides an internal utility interface to create a new tool configuration 
 * by proxying the request to the external-utility-tool-service.
 */
import { 
  InternalUtilityTool,
  ExternalUtilityTool, // Type for the tool configuration object
  JsonSchema,
  ServiceResponse,
  UtilityProvider,
  AuthMethod,
  UtilityInputSecret,
  ApiKeyAuthScheme,
  HttpMethod ,
  ExecuteToolResult,
  AgentServiceCredentials,
  ExternalUtilityInfo,
} from '@agent-base/types';
// Import the correct function from api-client
import { createExternalToolFromAgent } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';


/**
 * Implementation of the Create External Tool utility
 */
const createExternalToolUtility: InternalUtilityTool = {
  // Corrected ID to match agent-service expectations
  id: 'create_external_tool',
  description: `Create a new external tool, that you can execute on the go, from any API Documentation you have.
  Authentication and setup will be prompted automatically to the user after you build the tool, once you will call it.
  Once the tool is created, call get_utility_info on it to retrieve the parameters to call the tool.`,
  schema: {
    type: 'object',
    properties: {
      tool_configuration: { 
          type: 'object',
          description: 'REQUIRED. The complete configuration object for the external tool to be created. This object defines how the tool behaves, authenticates, and interacts with external APIs.',
          properties: {
            // --- Core Identification ---
            id: { 
              type: 'string', 
              description: 'REQUIRED. Unique identifier for the new tool (e.g., \'stripe_create_charge\'). Use snake_case.'
            },
            utilityProvider: { // Corrected name from provider
              type: 'string', 
              description: 'REQUIRED. The service provider this tool interacts with.',
              enum: Object.values(UtilityProvider) // Use enum values
            },
            description: { 
              type: 'string', 
              description: 'REQUIRED. Human-readable description of what the tool does. This is shown to users and used by LLMs.'
            },

            // --- Input Schema Definition ---
            schema: { // **** The nested schema definition ****
              type: 'object',
              // Make description super explicit about the required structure
              description: 'REQUIRED. Defines the input parameters for the new tool. MUST be a standard JSON Schema object containing `type: \'object\'` and a `properties` field. The `properties` field maps parameter names to their individual JSON Schema definitions (which include type, description, etc.).',
              additionalProperties: { 
                // Each property of this object should be a valid JSONSchema7 object
                // This part defines the schema for the *value* of each key in the main 'properties' object above
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Parameter type (string, number, boolean, array, object)' },
                  description: { type: 'string', description: 'Parameter description for LLM/UI.' },
                  enum: { type: 'array', items: { type: ['string', 'number', 'boolean'] }, description: 'Optional: Allowed values for the parameter.' },
                  items: { type: 'object', description: 'Optional: Schema for array items.' },
                  properties: { type: 'object', description: 'Optional: Schema for object properties.' },
                  required: { type: 'array', items: { type: 'string' }, description: 'Optional: Required properties if type is object.' },
                  examples: { type: 'array', description: 'Optional: Example values.' }
                },
                required: ['type', 'description']
              },
              examples: [{ "amount": { "type": "number", "description": "Amount in cents" }, "currency": { "type": "string", "description": "Currency code (e.g., usd)" } }]
            },

            // --- Authentication & Secrets ---
            authMethod: { 
              type: 'string', 
              description: 'REQUIRED. The authentication method required by the tool.',
              enum: Object.values(AuthMethod) // Use enum values
            },
            requiredSecrets: { 
              type: 'array',
              description: 'REQUIRED (can be empty array). List of secrets that need to be configured for this tool (e.g., API keys, webhook confirmations). These correspond to values managed by the secret service.',
              items: { 
                type: 'string',
                enum: Object.values(UtilityInputSecret) // Use enum values
              },
              default: []
            },
            requiredScopes: { 
              type: 'array',
              description: 'OPTIONAL. List of OAuth scopes required. ONLY use if authMethod is OAUTH.',
              items: { type: 'string' },
              default: []
            },
            apiKeyDetails: { 
              type: 'object',
              description: 'OPTIONAL. Details on how to use an API key. ONLY use if authMethod is API_KEY.',
              properties: {
                secretName: { 
                  type: 'string', 
                  description: 'REQUIRED if apiKeyDetails is provided. The name of the secret (from requiredSecrets) that holds the API key value.',
                  enum: Object.values(UtilityInputSecret)
                },
                scheme: { 
                  type: 'string', 
                  description: 'REQUIRED if apiKeyDetails is provided. How the API key is sent (Bearer, BasicUser, BasicPass, Header).',
                  enum: Object.values(ApiKeyAuthScheme)
                },
                headerName: { 
                  type: 'string', 
                  description: 'OPTIONAL. The name of the HTTP header if scheme is Header.'
                }
              },
              required: ['secretName', 'scheme']
            },
            
            // --- API Call Details ---
            apiDetails: { 
              type: 'object',
              description: 'OPTIONAL. Defines how to make the actual API call to the external service. Not needed for tools that only perform checks or don\'t call an external API directly.',
              properties: {
                method: { 
                  type: 'string', 
                  description: 'REQUIRED if apiDetails is provided. HTTP method for the API call.',
                  enum: Object.values(HttpMethod)
                },
                baseUrl: { 
                  type: 'string', 
                  description: 'REQUIRED if apiDetails is provided. Base URL of the API (e.g., \'https://api.stripe.com/v1\').' 
                },
                pathTemplate: { 
                  type: 'string', 
                  description: 'REQUIRED if apiDetails is provided. Path template with {placeholders} for path parameters (e.g., \'/customers/{customerId}\').'
                },
                paramMappings: {
                  type: 'object',
                  description: 'OPTIONAL. Maps input parameters (from the tool\'s schema) to the API request parts (path, query, body).',
                  properties: {
                    path: { type: 'object', additionalProperties: { type: 'string' }, description: 'Map schema keys to path placeholders. e.g., { customerIdParam: \'customerId\' }.' },
                    query: { type: 'object', additionalProperties: { type: ['string', 'object'] }, description: 'Map schema keys to query parameter names. Can use { target: \'paramName\', transform: \'joinComma\'} for array joins. e.g., { emailParam: \'customer_email\', labelsParam: {target: \'tags\', transform: \'joinComma\'} }.' },
                    body: { type: 'object', additionalProperties: { type: 'string' }, description: 'Map schema keys to JSON body field names. e.g., { amountParam: \'amount_cents\' }.' }
                  }
                },
                staticHeaders: {
                  type: 'object',
                  description: 'OPTIONAL. Static headers to include in the API request (e.g., { \'Content-Type\': \'application/json\' }). Authorization headers are usually handled by apiKeyDetails/OAuth flow.',
                  additionalProperties: { type: 'string' }
                }
              },
              required: ['method', 'baseUrl', 'pathTemplate']
            }
          },
          required: ['id', 'utilityProvider', 'description', 'schema', 'authMethod', 'requiredSecrets'],
          examples: [
            {
              "id": "stripe_create_customer",
              "utilityProvider": "stripe",
              "description": "Creates a new customer in Stripe.",
              "schema": {
                "email": { "type": "string", "description": "Customer\'s email address.", "format": "email", "examples": ["jenny.rosen@example.com"] },
                "name": { "type": "string", "description": "Customer\'s full name.", "examples": ["Jenny Rosen"] },
                "description": { "type": "string", "description": "Optional description for the customer.", "examples": ["Test customer account"] }
              },
              "authMethod": "API_KEY",
              "requiredSecrets": ["api_secret_key"],
              "apiKeyDetails": {
                "secretName": "api_secret_key",
                "scheme": "Bearer"
              },
              "apiDetails": {
                "method": "POST",
                "baseUrl": "https://api.stripe.com/v1",
                "pathTemplate": "/customers",
                "paramMappings": {
                  "body": { // Note: Stripe uses form-encoded bodies, this mapping assumes JSON body is acceptable or will be handled by the executor
                    "email": "email", 
                    "name": "name",
                    "description": "description"
                  }
                },
                "staticHeaders": {
                   "Content-Type": "application/x-www-form-urlencoded" // Example if form-encoding is needed
                }
              }
            }
          ]
      }
    },
    required: ['tool_configuration']
  },
  
  execute: async (
    clientUserId: string, 
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { tool_configuration: ExternalUtilityTool },
    agentId?: string
  // Revert return type to ExecuteToolResult as expected by createExternalToolFromAgent
  ): Promise<ServiceResponse<ExecuteToolResult>> => {
    const logPrefix = '🛠️ [CREATE_EXTERNAL_TOOL_UTILITY]';
    try {
      const toolConfiguration = params?.tool_configuration;

      if (!toolConfiguration) {
        console.error(`${logPrefix} Invalid or missing tool_configuration parameter.`);
        // Ensure error response matches ExecuteToolResult structure (or is a generic error)
        return { 
          success: false, 
          error: "Invalid input: 'tool_configuration' parameter is missing or invalid.",
          details: "The 'tool_configuration' parameter must be a valid ExternalUtilityTool object."
        };
      }

      // Restore credential validation
      if (!clientUserId) return { success: false, error: 'Internal Error: clientUserId is required.' };
      if (!platformUserId) return { success: false, error: 'Internal Error: platformUserId is required.' };
      if (!platformApiKey) return { success: false, error: 'Internal Error: platformApiKey is required.' };
            
      // Restore AgentServiceCredentials creation
      const agentServiceCredentials : AgentServiceCredentials = {
        platformUserId, 
        clientUserId, 
        platformApiKey, 
        agentId
      };

      // Call the correct client function with correct arguments
      const resultResponse : ServiceResponse<ExecuteToolResult> = await createExternalToolFromAgent(
        agentServiceCredentials, 
        conversationId,        // Pass conversationId
        toolConfiguration    // Pass the tool configuration object
      );

      if (!resultResponse.success) {
        console.error(`🟢🕥${logPrefix} Error creating external tool:`, resultResponse);
        return resultResponse;
      }
            
      // Return the ExecuteToolResult from the client call
      return resultResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error executing utility:`, error);
      // Return standard utility error response
      return {
        success: false,
        error: 'Failed to execute create external tool utility',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(createExternalToolUtility);

// Export for potential direct use or testing (optional)
// export default createExternalToolUtility; 