/**
 * Internal Utility: Create External Tool
 * 
 * Provides an internal utility interface to create a new tool configuration 
 * by proxying the request to the external-utility-tool-service.
 */
import { 
  InternalUtilityTool,
  ApiTool, // Type for the tool configuration object
  ServiceResponse,
  UtilityInputSecret,
  AgentInternalCredentials,
} from '@agent-base/types';
// Import the correct function from api-client
import { createApiToolInternal } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';


/**
 * Implementation of the Create External Tool utility
 */
const createExternalToolUtility: InternalUtilityTool = {
  // Corrected ID to match agent-service expectations
  id: 'create_api_tool',
  description: `Create a new external tool, that you can execute on the go, from an OpenAPI Specification Fragment.
  Authentication and setup will be prompted automatically to the user after you build the tool, once you call it.
  Once the tool is created, call get_utility_info on it to retrieve the parameters to call the tool.`,
  schema: {
    type: 'object',
    properties: {
      tool_configuration: { 
          type: 'object',
          description: 'REQUIRED. The complete configuration object for the external tool to be created. This object must conform to the ApiTool type, including a full OpenAPI specification.',
          properties: {
            // --- Core Identification ---
            name: {
              type: 'string',
              description: 'REQUIRED. A human-readable name for the tool.'
            },
            description: {
              type: 'string',
              description: 'REQUIRED. A detailed description of what the tool does.'
            },
            id: { 
              type: 'string', 
              description: 'REQUIRED. Unique identifier for the new tool (e.g., \'stripe_create_charge\'). Use snake_case. This will also be used as the operationId in the OpenAPI spec if not otherwise specified.'
            },
            utilityProvider: {
              type: 'string', 
              description: 'REQUIRED. The service provider this tool interacts with.',
              examples: ["stripe", "google", "hubspot"]
            },
            
            // --- OpenAPI Specification ---
            openapiSpecification: {
              type: 'object',
              description: "REQUIRED. A valid OpenAPI 3.0.x specification object for the tool. It must define exactly one path and one operation (e.g., one HTTP method under that path). It MUST include a 'servers' array defining the base URL. The 'info' object should contain 'title' and 'version'. The tool's parameters and request/response bodies are defined here. Security schemes should be defined in 'components.securitySchemes'.",
              properties: {
                openapi: { type: 'string', description: "REQUIRED. OpenAPI version string (e.g., '3.0.0')." },
                info: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: "REQUIRED. The title of the API." },
                    version: { type: 'string', description: "REQUIRED. The version of the API." },
                    description: { type: 'string', description: "OPTIONAL. A verbose description of the API." }
                  },
                  required: ["title", "version"]
                },
                servers: { 
                  type: 'array',
                  description: "REQUIRED. An array of Server Objects, each defining a base URL for the API. Exactly one server object must be provided with a non-relative URL for the tool to be usable.",
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', description: "REQUIRED. A URL to the target host. This URL supports Server Variables. Should be an absolute URL for external APIs." },
                      description: { type: 'string', description: "OPTIONAL. An optional string describing the host designated by the URL." },
                      variables: { type: 'object', description: "OPTIONAL. A map between a variable name and its value. The value is used for substitution in the server's URL template." }
                    },
                    required: ["url"]
                  },
                  minItems: 1,
                  maxItems: 1 
                },
                paths: {
                  type: 'object',
                  description: "REQUIRED. Defines the paths and operations for the API. Must contain exactly one path, and that path must contain exactly one HTTP method."
                  // Further detailed schema for paths can be added but can become very complex.
                  // For now, we rely on the description and backend validation.
                },
                components: {
                  type: 'object',
                  description: "OPTIONAL. An object to hold reusable data structures for different aspects of the OAS. Includes 'schemas' and 'securitySchemes'.",
                  properties: {
                    schemas: { type: 'object', description: "Reusable schemas for request bodies, responses, etc." },
                    securitySchemes: { 
                      type: 'object', 
                      description: "Reusable security scheme definitions (e.g., API key, HTTP basic/bearer). The 'securityOption' field must refer to a key defined here." 
                    }
                  }
                }
                // Other OpenAPI fields like tags, externalDocs can be added if needed.
              },
              required: ["openapi", "info", "paths", "servers"]
            },

            // --- Security Configuration ---
            securityOption: {
              type: 'string',
              description: "REQUIRED. The key of the security scheme to use from 'openapiSpecification.components.securitySchemes'. This scheme will be applied to the operation."
            },
            securitySecrets: {
              type: 'object',
              description: "REQUIRED. An object mapping predefined secret placeholders (like 'x-secret-name', 'x-secret-username', 'x-secret-password') to the specific UtilitySecretType names that hold the actual credential values. These UtilitySecretType names are references to secrets stored in the secret service. The required placeholders depend on the chosen 'securityOption' and its type (e.g., 'x-secret-name' for apiKey or bearerToken, 'x-secret-username' and 'x-secret-password' for http basic).",
              properties: {
                "x-secret-name": { 
                  type: "string", 
                  description: "The UtilitySecretType name for the API key or bearer token.",
                  examples: Object.values(UtilityInputSecret)
                },
                "x-secret-username": { 
                  type: "string", 
                  description: "The UtilitySecretType name for the username in HTTP basic auth.",
                  examples: Object.values(UtilityInputSecret)
                },
                "x-secret-password": { 
                  type: "string", 
                  description: "The UtilitySecretType name for the password in HTTP basic auth.",
                  examples: Object.values(UtilityInputSecret)
                }
              },
              additionalProperties: false // Only allow defined x-prefixed properties
              // Example: { "x-secret-name": "my_stripe_api_key_secret_name" }
              // Example: { "x-secret-username": "my_service_username_secret", "x-secret-password": "my_service_password_secret" }
            }
          },
          required: ['name', 'description', 'id', 'utilityProvider', 'openapiSpecification', 'securityOption', 'securitySecrets'],
          examples: [
            {
              name: "Stripe Get Balance",
              description: "Retrieves the current account balance in Stripe.",
              id: "stripe_get_balance",
              utilityProvider: "stripe",
              openapiSpecification: {
                openapi: "3.0.0",
                info: {
                  title: "Stripe Get Balance",
                  version: "v1",
                  description: "Retrieves the current account balance in Stripe."
                },
                servers: [
                  {
                    "url": "https://api.stripe.com"
                  }
                ],
                paths: {
                  "/v1/balance": {
                    get: {
                      summary: "Get Stripe Balance",
                      operationId: "stripeGetBalance",
                      responses: {
                        "200": {
                          description: "Successful balance retrieval",
                          content: {
                            "application/json": {
                              schema: {
                                type: "object",
                                properties: {
                                  available: { type: "array" },
                                  pending: { type: "array" }
                                }
                              }
                            }
                          }
                        }
                      },
                      security: [
                        { "stripeBasicAuth": [] }
                      ]
                    }
                  }
                },
                components: {
                  securitySchemes: {
                    stripeBasicAuth: {
                      type: "http",
                      scheme: "basic",
                      description: "HTTP Basic Authentication with Stripe API key as username and empty password."
                    }
                  }
                }
              },
              securityOption: "stripeBasicAuth",
              securitySecrets: {
                "x-secret-username": "api_secret_key"
              }
            }
          ]
      }
    },
    required: ['tool_configuration']
  },
  
  execute: async (
    clientUserId: string, 
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { tool_configuration: ApiTool },
    agentId?: string
  // Adjust return type to ServiceResponse<ApiTool>
  ): Promise<ServiceResponse<ApiTool>> => {
    const logPrefix = '🛠️ [CREATE_EXTERNAL_TOOL_UTILITY]';
    try {
      const toolConfiguration = params?.tool_configuration;

      if (!toolConfiguration) {
        console.error(`${logPrefix} Invalid or missing tool_configuration parameter.`);
        // Ensure error response matches ApiTool structure for consistency (or a generic error)
        return { 
          success: false, 
          error: "Invalid input: 'tool_configuration' parameter is missing or invalid.",
          details: "The 'tool_configuration' parameter must be a valid ApiTool object.",
          hint: 'Review the tool configuration and try again.'
        };
      }

      // Restore credential validation
      if (!clientUserId) return { success: false, error: 'Internal Error: clientUserId is required.' };
      if (!platformUserId) return { success: false, error: 'Internal Error: platformUserId is required.' };
      if (!platformApiKey) return { success: false, error: 'Internal Error: platformApiKey is required.' };
            
      // Restore AgentServiceCredentials creation
      const agentInternalCredentials : AgentInternalCredentials = {
        platformUserId, 
        clientUserId,
        clientOrganizationId,
        platformApiKey, 
        agentId
      };

      // Call the correct client function with correct arguments
      // createApiTool does not take conversationId
      const resultResponse: ServiceResponse<ApiTool> = await createApiToolInternal(
        agentInternalCredentials, 
        toolConfiguration    // Pass the tool configuration object
      );

      if (!resultResponse.success) {
        console.error(`🟢🕥${logPrefix} Error creating external tool:`, resultResponse);
        return resultResponse;
      }
            
      // Return the ApiTool from the client call
      return resultResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error executing utility:`, error);
      // Return standard utility error response
      return {
        success: false,
        error: 'Failed to execute create external tool utility',
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      };
    }
  }
};

// Register the utility
registry.register(createExternalToolUtility);

// Export for potential direct use or testing (optional)
// export default createExternalToolUtility; 