import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Tool } from "@langchain/core/tools";
import { Runnable } from "@langchain/core/runnables";
import { END, StateGraph, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

/**
 * Represents the state of our LangGraph agent.
 */
interface AgentState {
  messages: BaseMessage[];
  inputTokens: number;
  outputTokens: number;
}

const shouldContinue = (state: AgentState) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return END;
  }

  const aiMessage = lastMessage as AIMessage;
  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    return "tools";
  }

  return END;
};

const callModel = async (state: AgentState, boundModel: Runnable) => {
  const { messages } = state;
  const response = await boundModel.invoke(messages);
  const usage = response.usage_metadata ?? { input_tokens: 0, output_tokens: 0 };
  return {
    messages: [response],
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  };
};

/**
 * Creates and compiles a LangGraph agent.
 * @param boundModel A model instance already bound with tools.
 * @param tools An array of tools for the agent to use.
 * @returns A compiled, runnable LangGraph.
 */
export const createAgentWorkflow = (boundModel: Runnable, tools: Tool[]) => {
  const toolNode = new ToolNode(tools);
  const graph = new StateGraph<AgentState>({
    channels: {
      messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
      },
      inputTokens: {
        value: (x: number, y: number) => x + y,
        default: () => 0,
      },
      outputTokens: {
        value: (x: number, y: number) => x + y,
        default: () => 0,
      },
    },
  })
    .addNode("agent", (state) => callModel(state, boundModel))
    .addNode("tools", (state) => toolNode.invoke(state));

  graph.addEdge(START, "agent");
  graph.addConditionalEdges("agent", shouldContinue);
  graph.addEdge("tools", "agent");

  return graph.compile();
}; 