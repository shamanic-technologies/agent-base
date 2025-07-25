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
  const maxRetries = 5;
  let attempt = 0;
  let delay = 1000; // Start with a 1-second delay

  while (attempt < maxRetries) {
    try {
      const response = await boundModel.invoke(messages);
      const usage = response.usage_metadata ?? { input_tokens: 0, output_tokens: 0 };
      return {
        messages: [response],
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      };
    } catch (error: any) {
      if (error.error?.type === 'overloaded_error' && attempt < maxRetries - 1) {
        console.warn(`[callModel] Anthropic API overloaded. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        delay *= 2; // Double the delay for the next retry
      } else {
        console.error(`[callModel] Unrecoverable error after ${attempt} retries or non-retryable error:`, error);
        throw error; // Re-throw the error if it's not an overload or if we've exhausted retries
      }
    }
  }

  throw new Error(`[callModel] Failed to get a response from Anthropic API after ${maxRetries} attempts.`);
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