import {
  AgentInternalCredentials,
  InternalUtilityInfo,
} from "@agent-base/types";
import {
  createFunctionalToolObject,
  listClientSideUtilitiesFromAgent,
} from "@agent-base/api-client";
import { Tool, DynamicTool } from "@langchain/core/tools";

/**
 * Loads and prepares LangChain-compatible tools for the agent.
 *
 * @param agentServiceCredentials - Credentials for API calls.
 * @param conversationId - The current conversation ID.
 * @returns A promise that resolves to an array of LangChain Tool objects.
 */
export async function loadLangGraphTools(
  agentServiceCredentials: AgentInternalCredentials,
  conversationId: string,
): Promise<Tool[]> {
  const startupToolIds = [
    "update_agent_memory",
    "webhook_create_webhook",
    "webhook_search_webhooks",
    "webhook_link_user",
    "webhook_link_agent",
    "webhook_get_latest_events",
    "create_api_tool",
    "utility_google_search",
    "utility_google_maps",
    "utility_get_current_datetime",
    "utility_read_webpage",
    "utility_curl_command",
    "create_dashboard",
    "delete_dashboard",
    "get_dashboard",
    "update_dashboard",
    "list_dashboards",
    "list_dashboard_blocks",
    "get_dashboard_block_by_id",
    "create_table",
    "get_database",
    "get_table",
    "query_database",
    "get_active_organization",
    "update_organization",
    "delete_organization",
  ];

  const clientSideToolsResponse = await listClientSideUtilitiesFromAgent(
    agentServiceCredentials,
  );

  if (!clientSideToolsResponse.success) {
    console.error(
      `[ToolLoader] Failed to list client-side tools: ${clientSideToolsResponse.error}`,
    );
    throw new Error(
      `[ToolLoader] Failed to list client-side tools: ${clientSideToolsResponse.error}.`,
    );
  }
  const clientSideToolIds = clientSideToolsResponse.data.map(
    (t: InternalUtilityInfo) => t.id,
  );

  const fetchedFunctionalTools = await Promise.all(
    startupToolIds.map((id) =>
      createFunctionalToolObject(
        id,
        agentServiceCredentials,
        conversationId,
        clientSideToolIds,
      ),
    ),
  );

  const allStartupTools: Tool[] = fetchedFunctionalTools
    .filter((item) => item && item.tool && item.tool.execute) // Keep only server-side tools with an execute function
    .map((item) => {
      return new DynamicTool({
        name: item.id,
        description: item.tool.description!,
        func: async (args) => {
          const result = await (item.tool.execute!(args, undefined as any));
          return JSON.stringify(result);
        },
      });
    });

  return allStartupTools;
} 