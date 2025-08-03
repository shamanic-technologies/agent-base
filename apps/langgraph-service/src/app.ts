import { BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, END, START } from "@langchain/langgraph";
import { Tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { loadLangGraphTools } from "./lib/lang-graph/tool-loader.js";
import { AgentInternalCredentials } from "@agent-base/types";

interface AgentState {
  messages: BaseMessage[];
  tools: Tool[];
}

const setupTools = async (state: AgentState, config: RunnableConfig): Promise<Partial<AgentState>> => {
  // Return an empty array of tools to bypass tool loading for now.
  return { tools: [] };
};

const callModel = async (state: AgentState, config?: RunnableConfig): Promise<Partial<AgentState>> => {
  const { messages, tools } = state;
  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20240620",
    temperature: 0,
  }).bindTools(tools);

  const response = await model.invoke(messages, config);
  return { messages: [response] };
};

const executeTools = async (state: AgentState): Promise<Partial<AgentState>> => {
    const { messages, tools } = state;
    const toolNode = new ToolNode(tools);
    const toolMessages = await toolNode.invoke(messages);
    return { messages: Array.isArray(toolMessages) ? toolMessages : [toolMessages] };
}

const shouldContinue = (state: AgentState): "action" | typeof END => {
  const { messages } = state;
  if (!messages || messages.length === 0) {
      return END;
  }
  const lastMessage = messages[messages.length - 1];
  if (lastMessage._getType() !== "ai") {
    return END;
  }

  const aiMessage = lastMessage as AIMessage;
  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    return "action";
  }

  return END;
};

const workflow = new StateGraph<AgentState>({
  channels: {
    messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
    },
    tools: {
      value: (x: Tool[], y: Tool[]) => y ?? x,
      default: () => [],
    },
  },
})
  .addNode("setup", setupTools)
  .addNode("agent", callModel)
  .addNode("action", executeTools)
  .addEdge(START, "setup")
  .addEdge("setup", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("action", "agent");

export const app = workflow.compile();
