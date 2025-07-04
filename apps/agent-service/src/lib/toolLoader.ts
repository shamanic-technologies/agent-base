/**
 * @fileoverview
 * This file contains the logic for dynamically loading and preparing all the tools
 * that the agent will have available at the start of a conversation.
 */
import {
    AgentInternalCredentials,
    InternalUtilityInfo,
    SuccessResponse
} from '@agent-base/types';
import {
    createListUtilitiesTool,
    createGetUtilityInfoTool,
    createCallUtilityTool,
    createFunctionalToolObject,
    listClientSideUtilitiesFromAgent
} from '@agent-base/api-client';
import { Tool } from 'ai';

/**
 * Loads and prepares all startup tools for the agent.
 * This includes a static list of essential server-side tools, client-side tools,
 * and the core utility functions for listing, getting info, and calling other tools.
 *
 * @param agentServiceCredentials - The credentials required to make API calls.
 * @param conversationId - The ID of the current conversation.
 * @returns A promise that resolves to a record of tool objects ready for the AI.
 */
export async function loadAndPrepareTools(
    agentServiceCredentials: AgentInternalCredentials,
    conversationId: string
): Promise<Record<string, Tool>> {

    const startupToolIds = [
        // Server-side tools
        //// Agent utilities
        'update_agent_memory',
        //// Webhook utilities
        // 'webhook_create_webhook',
        // 'webhook_search_webhooks',
        // 'webhook_link_user',
        // 'webhook_link_agent',
        // 'webhook_get_latest_events',
        //// API tool utilities
        // 'create_api_tool',
        //// Basic utilities
        // 'utility_google_search',
        // 'utility_google_maps',
        // 'utility_get_current_datetime',
        // 'utility_read_webpage',
        // 'utility_curl_command',
        //// Dashboard utilities
        // 'create_dashboard',
        // 'delete_dashboard',
        // 'get_dashboard',
        // 'update_dashboard',
        // 'list_dashboards',
        // 'list_dashboard_blocks',
        // 'get_dashboard_block_by_id',
        //// Database utilities
        // 'create_table',
        // 'get_database',
        // 'get_table',
        // 'query_database',
        // // client-side tools
        // 'get_active_organization',
        // 'update_organization',
        // 'delete_organization'
    ];

    const clientSideToolsResponse = await listClientSideUtilitiesFromAgent(agentServiceCredentials);

    if (!clientSideToolsResponse.success) {
        console.error(`[ToolLoader] Failed to list client-side tools: ${clientSideToolsResponse.error}`);
        throw new Error(`[ToolLoader] Failed to list client-side tools: ${clientSideToolsResponse.error}.`);
    }
    const clientSideToolIds = clientSideToolsResponse.data.map((t: InternalUtilityInfo) => t.id);
    
    const fetchedFunctionalTools = await Promise.all(
        startupToolIds.map(id => createFunctionalToolObject(id, agentServiceCredentials, conversationId, clientSideToolIds))
    );
    
    const allStartupTools: Record<string, Tool> = {
        utility_list_utilities: createListUtilitiesTool(agentServiceCredentials, conversationId),
        utility_get_utility_info: createGetUtilityInfoTool(agentServiceCredentials, conversationId),
        utility_call_utility: createCallUtilityTool(agentServiceCredentials, conversationId),
    };

    fetchedFunctionalTools.forEach(item => {
        if (item) { // Ensure the item is not null/undefined
            allStartupTools[item.id] = item.tool;
        }
    });

    return allStartupTools;
} 