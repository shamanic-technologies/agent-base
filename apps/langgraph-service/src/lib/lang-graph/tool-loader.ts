import {
  AgentInternalCredentials,
  InternalUtilityInfo,
} from "@agent-base/types";
import {
  createFunctionalToolObject,
  listClientSideUtilitiesFromAgent,
} from "@agent-base/api-client";
import { Tool, DynamicStructuredTool } from "@langchain/core/tools";

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
  console.log("[ToolLoader] Loading LangGraph tools...");
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
  console.log(`[ToolLoader] Defined ${startupToolIds.length} startup tool IDs.`);

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
  console.log(`[ToolLoader] Fetched ${clientSideToolIds.length} client-side tool IDs.`);

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
  console.log(`[ToolLoader] Fetched ${fetchedFunctionalTools.filter(t => t).length} functional tools.`);

  const allStartupTools: Tool[] = fetchedFunctionalTools
    .filter((item) => item) // Keep only server-side tools
    .map((item) => {
      return new DynamicStructuredTool({
        name: item!.id,
        description: item!.tool.description!,
        schema: item!.tool.parameters,
        func: async (input) => {
          console.log(`[ToolExecution] Attempting to run tool: ${item!.id}`);
          console.log(`[ToolExecution] Input:`, JSON.stringify(input, null, 2));
          try {
            const result = await item!.tool.execute!(input, undefined as any);
            const stringifiedResult = JSON.stringify(result);
            console.log(`[ToolExecution] Result for ${item!.id}:`, stringifiedResult);
            return stringifiedResult;
          } catch (error) {
            const errorMessage = (error as Error).message;
            console.error(`[ToolExecution] Error executing tool ${item!.id}:`, errorMessage);
            return JSON.stringify({ success: false, error: errorMessage });
          }
        },
      });
    });
  
  console.log(`[ToolLoader] Prepared ${allStartupTools.length} LangGraph tools.`);
  return allStartupTools;
} 