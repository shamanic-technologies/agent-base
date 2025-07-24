import { createAgentWorkflow } from "./lib/lang-graph/langgraph-agent.js";
import { loadLangGraphTools } from "./lib/lang-graph/tool-loader.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ModelName } from "./types/index.js";
import { AgentInternalCredentials } from "@agent-base/types";
import { Tool } from "@langchain/core/tools";

// This is a placeholder for how we might get credentials in a server context.
// In a real LangGraph server, this would likely be handled by middleware
// that populates the config for each request.
const getDummyCredentials = (): AgentInternalCredentials => ({
  clientUserId: "dummy-client-user-id",
  clientOrganizationId: "dummy-client-org-id",
  platformApiKey: process.env.AGENT_BASE_API_KEY || "dummy-api-key",
  platformUserId: "dummy-platform-user-id",
  agentId: "dummy-agent-id",
});

const model = new ChatAnthropic({
  model: ModelName.CLAUDE_SONNET_4_20250514,
  temperature: 0.1,
  clientOptions: {
    defaultHeaders: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
    },
  },
});

// The tool loading is async and depends on credentials.
// A real LangGraph server would handle this dynamically.
// For now, we'll create a factory function for the graph.
async function createApp() {
  const credentials = getDummyCredentials();
  let tools: Tool[] = [];
  // Bypass tool loading in development environment to avoid auth issues with other services
  if (process.env.NODE_ENV !== 'development') {
    tools = await loadLangGraphTools(credentials, "dummy-conversation-id");
  }
  const boundModel = model.bindTools(tools);
  const graph = createAgentWorkflow(boundModel as any, tools);
  return graph;
}

// The langgraph CLI will look for an exported `app` or `graph` variable.
// Since our graph creation is async, we export a promise.
export const app = createApp(); 