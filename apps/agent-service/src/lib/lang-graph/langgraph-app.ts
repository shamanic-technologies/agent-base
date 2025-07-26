import {
  BaseMessage,
  AIMessage,
} from "@langchain/core/messages";
import { StateGraph, MessagesAnnotation, END } from "@langchain/langgraph";
import { Tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { loadLangGraphTools } from "./tool-loader.js";
import { AgentInternalCredentials } from "@agent-base/types";

// Helper function to determine if the agent should continue
function shouldContinue(state: { messages: BaseMessage[] }): "tools" | typeof END {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return END;
}

// Helper function to call the model
async function callModel(
  state: { messages: BaseMessage[] },
  config?: RunnableConfig,
) {
  const { messages } = state;
  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20240620",
    temperature: 0,
  }).bindTools(config?.configurable?.tools as Tool[]);

  const response = await model.invoke(messages, config);
  return { messages: [response] };
}


class AgentExecutor {
  private app: any;

  constructor() {
    // Define the tools for the agent to use
    const tools: Tool[] = []; // This will be populated dynamically
    const toolNode = new ToolNode(tools);

    // Define a new graph
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addConditionalEdges("agent", shouldContinue, {
        tools: "tools",
        __end__: END,
      })
      .addEdge("tools", "agent");
      
    workflow.setEntryPoint("agent");

    this.app = workflow.compile();
  }

  public async getStream(
    payload: any,
    config: RunnableConfig,
  ): Promise<any> {
    const { configurable, ...restConfig } = config;
    const { thread_id, ...credentials } = configurable as any;

    const tools = await loadLangGraphTools(
      credentials as AgentInternalCredentials,
      thread_id,
    );

    return this.app.stream(payload, {
      ...restConfig,
      configurable: {
        ...credentials,
        thread_id,
        tools,
      },
    });
  }
}

export const agentExecutor = new AgentExecutor(); 