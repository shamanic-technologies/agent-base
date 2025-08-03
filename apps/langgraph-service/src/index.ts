import { createAgentWorkflow } from "./lib/lang-graph/langgraph-agent.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ModelName } from "./types/index.js";

const model = new ChatAnthropic({
  model: ModelName.CLAUDE_SONNET_4_20250514,
  temperature: 0.1,
  clientOptions: {
    defaultHeaders: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
    },
  },
});

const graph = createAgentWorkflow(model as any, []);

export const app = graph; 