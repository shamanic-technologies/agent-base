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
    ServiceResponse,
    UtilityInfo,
    ListUtilities,
    ExecuteToolResult,
    ExecuteToolPayload,
    AgentInternalCredentials,

} from '@agent-base/types';
import {
    listUtilitiesFromAgent,
    getUtilityInfoFromAgent,
    callUtilityFromAgent,
    listClientSideUtilitiesFromAgent
} from '../utility-tool-client.js'; // Adjust path if needed

/**
 * Creates the Vercel AI Tool object for listing available utilities.
 * 
 * @param agentServiceCredentials - Credentials required for the API call.
 * @param conversationId - The current conversation context.
 * @returns A Vercel AI Tool object.
 */
export function createListUtilitiesTool(
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Lists the IDs and descriptions of available functional utility tools that can be executed.',
        parameters: z.object({}), // No parameters needed for listing
        execute: async (args: {}): Promise<ServiceResponse<ListUtilities>> => { // Return type often expected to be JSON serializable by AI SDK
            console.log('[createListUtilitiesTool] Executing utility_list_utilities');
            const listResponse: ServiceResponse<ListUtilities> = await listUtilitiesFromAgent(agentInternalCredentials, conversationId);
            if (!listResponse.success) {
                console.error(`[createListUtilitiesTool] Error executing tool via listUtilitiesFromAgent:`, listResponse);
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
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Gets detailed information (description, parameters schema) for a specific functional utility tool by its ID.',
        parameters: z.object({
            toolId: z.string().describe('The unique ID of the functional utility tool to get information for.')
        }),
        execute: async (args: { toolId: string }): Promise<ServiceResponse<UtilityInfo>> => { // Return type often expected to be JSON serializable
            const getResponse: ServiceResponse<UtilityInfo> = await getUtilityInfoFromAgent(agentInternalCredentials, conversationId, args.toolId);
            if (!getResponse.success) {
                console.error(`[createGetUtilityInfoTool] Error executing tool ${args.toolId} via getUtilityInfoFromAgent:`, getResponse);
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
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string
): Tool {
    return {
        description: 'Executes a specific functional utility tool by its ID, providing the necessary input parameters.',
        parameters: z.object({
            toolId: z.string().describe('The unique ID of the functional utility tool to execute.'),
            params: z.any().describe('An object containing the parameters required by the specific functional utility tool being called.')
        }),
        execute: async (args: { toolId: string, params: any }): Promise<ServiceResponse<ExecuteToolResult>> => { // Argument key is params
            console.log(`[createCallUtilityTool] Executing utility_call_utility for tool: ${args.toolId}`);
            const payload: ExecuteToolPayload = {
                params: args.params,
                conversationId: conversationId 
            };
            const callResponse: ServiceResponse<ExecuteToolResult> = await callUtilityFromAgent(agentInternalCredentials, args.toolId, payload);
            if (!callResponse.success) {
                console.error(`[createCallUtilityTool] Error executing tool ${args.toolId} via callUtilityFromAgent:`, callResponse);
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
 * @param clientSideToolIds - List of client-side tool IDs
 * @returns A Promise resolving to { id: string, tool: Tool }.
 * @throws Throws an error if the tool info cannot be fetched.
 */
export async function createFunctionalToolObject(
    toolId: string,
    agentInternalCredentials: AgentInternalCredentials,
    conversationId: string,
    clientSideToolIds: string[]
): Promise<{ id: string, tool: Tool }> { 
    
    // 1. Fetch tool info (description, JSON schema)
    const infoResponse: ServiceResponse<UtilityInfo> = await getUtilityInfoFromAgent(agentInternalCredentials, conversationId, toolId);

    if (!infoResponse.success || !infoResponse.data) {
        console.error(`[createFunctionalToolObject] Failed to get info for tool ${toolId}:`, infoResponse);
        throw new Error(`Could not fetch tool definition for '${toolId}'.`);
    }

    // Explicitly type the fetched data to ensure schema property is recognized
    const toolInfo = infoResponse.data as UtilityInfo; 
    const { description, schema: fetchedJsonSchema } = toolInfo;

    // Validate if schema exists and is an object
    if (!fetchedJsonSchema || typeof fetchedJsonSchema !== 'object') {
        console.warn(`[createFunctionalToolObject] No valid parameters schema found for tool ${toolId}. Using empty schema.`);
    }

    const isClientSide = clientSideToolIds.includes(toolId);

    // 2. Create the Tool object using the fetched JSON schema
    return {
        id: toolId,
        tool: {
            description: description,
            parameters: jsonSchema(fetchedJsonSchema || {}), // Provide empty object if schema is missing/invalid
            ...(!isClientSide && {
                execute: async (args: any): Promise<ServiceResponse<ExecuteToolResult>> => { 
                    const payload: ExecuteToolPayload = {
                        params: args,
                        conversationId: conversationId 
                    };
                    const callResponse: ServiceResponse<ExecuteToolResult> = await callUtilityFromAgent(agentInternalCredentials, toolId, payload);

                    if (!callResponse.success) {
                        console.error(`[createFunctionalToolObject] Error executing tool ${toolId} via callUtilityFromAgent:`, callResponse);
                        return callResponse; 
                    }
                    return callResponse;
                }
            })
        }
    };
} 