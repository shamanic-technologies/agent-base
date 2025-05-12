/**
 * Vercel AI SDK Tool Creators for Agent Service
 * 
 * Provides functions to create Vercel AI SDK Tool objects 
 * for interacting with the Utility Tool Service.
 */
import { z } from 'zod';
import type { Tool } from 'ai'; // Use type import for clarity
// @ts-ignore
import { jsonSchema } from 'ai'; // Import the jsonSchema helper
import {
    AgentServiceCredentials,
    ServiceResponse,
    UtilityInfo,
    ListUtilities,
    ExecuteToolResult,
    ExecuteToolPayload,
    WebhookData,           // For webhook_create_webhook schema
    InternalServiceCredentials, // For webhook client calls within execute
    Webhook,               // For webhook_create_webhook result
    CreateAgentUserWebhookRequest,      // For webhook_link_agent result
    UserWebhook,           // For webhook_link_user result
    SetupNeeded,           // For webhook_link_user result
    UtilityProvider,       // For create_external_tool schema
    AuthMethod,
    UtilityInputSecret,
    ApiKeyAuthScheme,
    HttpMethod,
    ExternalUtilityTool    // For create_external_tool schema
} from '@agent-base/types';
import {
    listUtilitiesFromAgent,
    getUtilityInfoFromAgent,
    callUtilityFromAgent
} from '../utility-tool-client.js'; // Adjust path if needed

/**
 * Creates the Vercel AI Tool object for listing available utilities.
 * 
 * @param agentServiceCredentials - Credentials required for the API call.
 * @param conversationId - The current conversation context.
 * @returns A Vercel AI Tool object.
 */
export function createListUtilitiesTool(
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Lists the IDs and descriptions of available functional utility tools that can be executed.',
        parameters: z.object({}), // No parameters needed for listing
        execute: async (args: {}): Promise<ServiceResponse<ListUtilities>> => { // Return type often expected to be JSON serializable by AI SDK
            console.log('[tool-creators] Executing utility_list_utilities');
            const listResponse: ServiceResponse<ListUtilities> = await listUtilitiesFromAgent(agentServiceCredentials, conversationId);
            if (!listResponse.success) {
                console.error(`[tool-creators] Error executing tool via listUtilitiesFromAgent:`, listResponse);
                return listResponse;
            }
            return listResponse;
        }
    };
}

/**
 * Creates the Vercel AI Tool object for getting detailed info about a utility.
 * 
 * @param agentServiceCredentials - Credentials required for the API call.
 * @param conversationId - The current conversation context.
 * @returns A Vercel AI Tool object.
 */
export function createGetUtilityInfoTool(
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Gets detailed information (description, parameters schema) for a specific functional utility tool by its ID.',
        parameters: z.object({
            toolId: z.string().describe('The unique ID of the functional utility tool to get information for.')
        }),
        execute: async (args: { toolId: string }): Promise<ServiceResponse<UtilityInfo>> => { // Return type often expected to be JSON serializable
            console.log(`[tool-creators] Executing utility_get_utility_info for tool: ${args.toolId}`);
            const getResponse: ServiceResponse<UtilityInfo> = await getUtilityInfoFromAgent(agentServiceCredentials, conversationId, args.toolId);
            if (!getResponse.success) {
                console.error(`[tool-creators] Error executing tool ${args.toolId} via getUtilityInfoFromAgent:`, getResponse);
                return getResponse;
            }
            return getResponse;
        }
    };
}

/**
 * Creates the Vercel AI Tool object for executing any functional utility.
 * 
 * @param agentServiceCredentials - Credentials required for the API call.
 * @param conversationId - The current conversation context.
 * @returns A Vercel AI Tool object.
 */
export function createCallUtilityTool(
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Executes a specific functional utility tool by its ID, providing the necessary input parameters.',
        parameters: z.object({
            toolId: z.string().describe('The unique ID of the functional utility tool to execute.'),
            params: z.any().describe('An object containing the parameters required by the specific functional utility tool being called.')
        }),
        execute: async (args: { toolId: string, params: any }): Promise<ServiceResponse<ExecuteToolResult>> => { // Argument key is params
            console.log(`[tool-creators] Executing utility_call_utility for tool: ${args.toolId}`);
            const payload: ExecuteToolPayload = {
                params: args.params,
                conversationId: conversationId 
            };
            const callResponse: ServiceResponse<ExecuteToolResult> = await callUtilityFromAgent(agentServiceCredentials, args.toolId, payload);
            if (!callResponse.success) {
                console.error(`[tool-creators] Error executing tool ${args.toolId} via callUtilityFromAgent:`, callResponse);
                return callResponse; 
            }
            return callResponse;
        }
    };
}

/**
 * Fetches the definition of a functional tool (including its JSON schema) 
 * from the utility service and creates a Vercel AI Tool object for it.
 * The 'execute' method internally uses the 'utility_call_utility' mechanism.
 *
 * @param toolId - The ID of the functional tool.
 * @param agentServiceCredentials - Credentials required for API calls.
 * @param conversationId - The current conversation context.
 * @returns A Promise resolving to { id: string, tool: Tool }.
 * @throws Throws an error if the tool info cannot be fetched.
 */
export async function createFunctionalToolObject(
    toolId: string,
    agentServiceCredentials: AgentServiceCredentials,
    conversationId: string
): Promise<{ id: string, tool: Tool }> { 
    console.log(`[tool-creators] Fetching functional tool object info for: ${toolId}`);
    
    // 1. Fetch tool info (description, JSON schema)
    const infoResponse = await getUtilityInfoFromAgent(agentServiceCredentials, conversationId, toolId);

    if (!infoResponse.success || !infoResponse.data) {
        console.error(`[tool-creators] Failed to get info for tool ${toolId}:`, infoResponse.error);
        throw new Error(`Could not fetch tool definition for '${toolId}'.`);
    }

    // Explicitly type the fetched data to ensure schema property is recognized
    const toolInfo = infoResponse.data as UtilityInfo; 
    const { description, schema: fetchedJsonSchema } = toolInfo;

    // Validate if schema exists and is an object
    if (!fetchedJsonSchema || typeof fetchedJsonSchema !== 'object') {
        console.warn(`[tool-creators] No valid parameters schema found for tool ${toolId}. Using empty schema.`);
        // Potentially throw error or use a default empty schema depending on requirements
        // For now, let's proceed but the AI might not be able to use parameters
    }

    // 2. Create the Tool object using the fetched JSON schema
    // Wrap the fetched schema with the jsonSchema helper for compatibility
    return {
        id: toolId,
        tool: {
            description: description,
            // Use the jsonSchema helper with the fetched schema object
            parameters: jsonSchema(fetchedJsonSchema || {}), // Provide empty object if schema is missing/invalid
            execute: async (args: any): Promise<ServiceResponse<ExecuteToolResult>> => { 
                
                const payload: ExecuteToolPayload = {
                    params: args,
                    conversationId: conversationId 
                };
                const callResponse: ServiceResponse<ExecuteToolResult> = await callUtilityFromAgent(agentServiceCredentials, toolId, payload);

                if (!callResponse.success) {
                    console.error(`🟢🕥[tool-creators] Error executing tool ${toolId} via callUtilityFromAgent:`, callResponse);
                    return callResponse; 
                }
                return callResponse;
            }
        }
    };
} 