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
  ExternalUtilityInfo,
  UtilityProvider,
  AuthMethod,
  UtilityInputSecret,
  ApiKeyAuthScheme,
  HttpMethod 
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';
import { createExternalTool } from '../../clients/externalToolServiceClient.js'; // Import the client function

// --- Local Type Definitions ---
// Define the input structure expected by this internal utility's execute function
interface CreateExternalToolParams {
    tool_configuration: ExternalUtilityTool; // The main parameter is the tool config object
}

// --- End Local Definitions ---

/**
 * Implementation of the Create External Tool utility
 */
const createExternalToolUtility: InternalUtilityTool = {
  id: 'utility_create_external_tool',
  description: `Create a new external tool, that you can execute on the go, from any API Documentation you have.
  Authentication and setup will be prompted automatically to the user after you build the tool, once you will call it.
  Once the tool is created, call get_utility_info on it to retrieve the parameters to call the tool.`,
  // Define the schema for the input parameters of this utility
  schema: {
    tool_configuration: { 
      jsonSchema: {
        type: 'object',
        description: 'The complete configuration object for the external tool to be created. This object defines how the tool behaves, authenticates, and interacts with external APIs.',
        properties: {
          // --- Core Identification ---
          id: { 
            type: 'string', 
            description: 'REQUIRED. Unique identifier for the new tool (e.g., \'stripe_create_charge\'). Use snake_case.'
          },
          provider: { 
            type: 'string', 
            description: 'REQUIRED. The service provider this tool interacts with.',
            enum: Object.values(UtilityProvider) // Use enum values
          },
          description: { 
            type: 'string', 
            description: 'REQUIRED. Human-readable description of what the tool does. This is shown to users and used by LLMs.'
          },

          // --- Input Schema Definition ---
          schema: { 
            type: 'object',
            description: 'REQUIRED. Defines the input parameters the tool accepts. Key-value pairs where the key is the parameter name and the value is its JSON Schema definition (including type, description, examples, etc.).',
            additionalProperties: { 
              // Each property of this object should be a valid JsonSchema
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
        // List all REQUIRED fields for the ExternalUtilityTool configuration object itself
        required: ['id', 'provider', 'description', 'schema', 'authMethod', 'requiredSecrets'],
        // Add a more comprehensive example 
        examples: [
          {
            "id": "stripe_create_customer",
            "provider": "stripe",
            "description": "Creates a new customer in Stripe.",
            "schema": {
              "email": { "jsonSchema": { "type": "string", "description": "Customer\'s email address.", "format": "email", "examples": ["jenny.rosen@example.com"] } },
              "name": { "jsonSchema": { "type": "string", "description": "Customer\'s full name.", "examples": ["Jenny Rosen"] } },
              "description": { "jsonSchema": { "type": "string", "description": "Optional description for the customer.", "examples": ["Test customer account"] } }
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
      } satisfies JsonSchema,
    }
  },
  
  execute: async (userId: string, conversationId: string, params: CreateExternalToolParams): Promise<ServiceResponse<ExternalUtilityInfo>> => {
    const logPrefix = '🛠️ [CREATE_EXTERNAL_TOOL_UTILITY]';
    try {
      // Extract the tool configuration from the parameters
      const { tool_configuration } = params || {}; 
      
      // Basic validation
      if (!tool_configuration || typeof tool_configuration !== 'object' || !tool_configuration.id) {
        console.error(`${logPrefix} Invalid or missing tool_configuration parameter.`);
        return { 
          success: false, 
          error: "Invalid input: 'tool_configuration' parameter is missing or invalid.",
          details: "The 'tool_configuration' parameter must be a valid ExternalUtilityTool object."
        };
      }
      
      console.log(`${logPrefix} Attempting to create external tool with ID: ${tool_configuration.id}`);
      
      // Call the client function to forward the request to the external service
      const result = await createExternalTool(tool_configuration);
      
      console.log(`${logPrefix} External service response received: success=${result.success}`);
      
      // Return the result from the external service directly
      // This will include success:true/false and data/error from the external service
      return result;

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

// Export the utility (optional, registration is the main goal)
export default createExternalToolUtility; 