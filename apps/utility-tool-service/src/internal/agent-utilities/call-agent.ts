/**
 * Internal Utility: Call Agent
 * 
 * Provides an internal utility to call another agent with a message and get a complete response back.
 * It handles the streaming SDK call and resolves the entire response before returning.
 */
import {
  InternalUtilityTool,
  ServiceResponse,
  AgentInternalCredentials,
} from '@agent-base/types';
import { triggerAgentRunInternalServiceStream, getOrCreateConversationsInternalApiService } from '@agent-base/api-client';
import { registry } from '../../registry/registry.js';
import { Message } from 'ai';
import { nanoid } from 'nanoid';


/**
 * Reads a ReadableStream of Uint8Array chunks (like those from a `fetch` response)
 * and decodes it into a single string.
 * @param stream The body of a streaming response.
 * @returns A promise that resolves to the full string content of the stream.
 */
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value);
    }
    return result;
}

/**
 * Implementation of the Call Agent utility
 */
const callAgentUtility: InternalUtilityTool = {
  id: 'call_agent',
  description: 'Calls another agent with a specific question or message and returns its full response. Use this to collaborate with other agents on complex tasks.',
  schema: {
    type: 'object',
    properties: {
      agent_id_to_call: {
        type: 'string',
        description: "REQUIRED. The unique ID of the agent you want to call for assistance.",
      },
      message: {
        type: 'string',
        description: "REQUIRED. The message, question, or task for the agent you are calling.",
      },
    },
    required: ['agent_id_to_call', 'message'],
    examples: [
      {
        agent_id_to_call: 'agt-12345abc',
        message: 'Can you please analyze the Q3 financial report and provide a summary of the key findings?',
      },
    ]
  },

  execute: async (
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: { agent_id_to_call: string; message: string },
    // agentId of the executor is not needed here, as we use agent_id_to_call from params
    agentId?: string,
  ): Promise<ServiceResponse<{ response: string }>> => {
    const logPrefix = '📞 [CALL_AGENT_UTILITY]';
    try {
      const { agent_id_to_call, message } = params;

      if (!clientUserId || !clientOrganizationId || !platformUserId || !platformApiKey) {
        console.error(`${logPrefix} Authentication details are missing.`);
        return {
          success: false,
          error: 'Internal Error: Authentication details are required to execute this utility.',
        };
      }

      if (!agent_id_to_call || !message) {
        return { success: false, error: "Invalid input: 'agent_id_to_call' and 'message' parameters are required." };
      }

      // 1. Get or create conversation
      const convResponse = await getOrCreateConversationsInternalApiService(
        { agentId: agent_id_to_call },
        clientUserId,
        clientOrganizationId,
        platformUserId,
        platformApiKey
      );

      if (!convResponse.success) {
        console.error(`${logPrefix} Could not get or create a conversation for agent ${agent_id_to_call}. Error: ${convResponse.error}`);
        return { success: false, error: `Failed to start conversation with agent ${agent_id_to_call}.`, details: convResponse.error };
      }

      if (!convResponse.data || convResponse.data.length === 0) {
        console.error(`${logPrefix} No conversations found for agent ${agent_id_to_call}.`);
        return { success: false, error: `No conversations available for agent ${agent_id_to_call}.` };
      }

      const conversation = convResponse.data[0];
      let messages = conversation.messages || [];

      // 2. Append new user message
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: message,
      };
      messages.push(userMessage);

      // 3. Send full conversation to the /run endpoint
      const credentials: AgentInternalCredentials = {
        platformUserId,
        clientUserId,
        clientOrganizationId,
        platformApiKey,
        agentId: agent_id_to_call, // To confirm that the agentId is the one being called, not the one calling.
      };

      const response: Response = await triggerAgentRunInternalServiceStream(
        conversation.conversationId,
        messages,
        credentials
      );

      if (!response.ok || !response.body) {
        const errorText = response.body ? await response.text() : 'No response body';
        console.error(`${logPrefix} Failed to call agent. Status: ${response.status}. Body: ${errorText}`);
        return {
          success: false,
          error: `Failed to get a valid response from agent ${agent_id_to_call}.`,
          details: `Status ${response.status}: ${errorText}`,
        };
      }

      const responseText = await streamToString(response.body);

      return {
        success: true,
        data: {
          response: responseText,
        }
      };

    } catch (error: any) {
      console.error(`${logPrefix} Unexpected error executing utility:`, error);
      return {
        success: false,
        error: 'Failed to execute call agent utility due to an unexpected error.',
        details: error instanceof Error ? error.message : String(error),
        hint: 'This may be due to a network issue or an problem with the agent being called. Check the agent ID and try again.'
      };
    }
  },
};

// Register the utility
registry.register(callAgentUtility); 