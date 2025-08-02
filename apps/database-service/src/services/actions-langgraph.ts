/**
 * Actions Service
 *
 * Handles business logic related to retrieving Actions from conversation messages.
 */
import {
  ServiceResponse,
  Action,
  ToolCall as AppToolCall,
  ToolResult as AppToolResult,
  ConversationLanggraph,
  ErrorResponse,
} from '@agent-base/types';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { getConversationsByClientUserIdLangGraph } from './conversations-langgraph.js';

/**
 * Retrieves all actions for a given client user by processing their conversations.
 * Actions are derived from tool calls and tool results within conversation messages.
 *
 * @param clientUserId - The ID of the client user.
 * @param clientOrganizationId - The ID of the client organization.
 * @param limit - Optional limit for the number of actions to return.
 * @returns A promise that resolves to a service response containing an array of Actions.
 */
export async function getActionsForClientUserLangGraph(
  clientUserId: string,
  clientOrganizationId: string,
  limit?: number
): Promise<ServiceResponse<Action[]>> {
  if (!clientUserId || !clientOrganizationId) {
    console.error('[ActionsService] Client User ID and Client Organization ID are required.');
    return {
      success: false,
      error: 'Client User ID and Client Organization ID are required.',
      hint: 'This error should not happen. Please contact support if you see this error.'
    };
  }

  const actions: Action[] = [];

  try {
    const conversationsResponse = await getConversationsByClientUserIdLangGraph(
      clientUserId,
      clientOrganizationId
    );

    if (!conversationsResponse.success) {
      const errorResponse = conversationsResponse as ErrorResponse;
      console.error('[ActionsService] Failed to retrieve conversations for the user.');
      return {
        success: false,
        error: errorResponse.error || 'Failed to retrieve conversations for the user.',
        hint: 'This error should not happen. Please contact support if you see this error.'
      };
    }

    const conversations: ConversationLanggraph[] = conversationsResponse.data || [];

    for (const conversation of conversations) {
      const messages = conversation.messages;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg._getType() === 'ai') {
          const aiMessage = msg as AIMessage;
          if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            for (const toolCall of aiMessage.tool_calls) {
              const toolMessage = messages.find(m => m._getType() === 'tool' && (m as ToolMessage).tool_call_id === toolCall.id) as ToolMessage | undefined;

              const toolResult: AppToolResult = {
                toolCallId: toolCall.id || '',
                toolName: toolCall.name || '',
                result: toolMessage ? toolMessage.content : 'No result found',
                isError: toolMessage ? (toolMessage.content as any)?.error !== undefined : true,
              };

              const pseudoAction: Action = {
                conversationId: conversation.conversationId,
                toolCall: {
                  id: toolCall.id || '',
                  toolName: toolCall.name || '',
                  args: toolCall.args as any,
                },
                toolResult: toolResult,
                id: `${conversation.conversationId}-${toolCall.id}-${toolCall.name}`.slice(0, 255),
                createdAt: (aiMessage as any).createdAt || new Date().toISOString(),
                updatedAt: (aiMessage as any).createdAt || new Date().toISOString(),
              };
              actions.push(pseudoAction);
            }
          }
        }
      }
    }

    console.log(`[ActionsService] Total actions collected before limit: ${actions.length}`);

    // Apply the limit to return only the last N actions
    const resolvedLimit = (typeof limit === 'number' && limit > 0) ? limit : 10; // Default to 10
    const limitedActions = actions.slice(-resolvedLimit);
    console.log(`[ActionsService] Total actions returned after limit (${resolvedLimit}): ${limitedActions.length}`);

    return { success: true, data: limitedActions };
  } catch (error: any) {
    console.error(
      '[ActionsService] Error retrieving actions for client user:',
      error
    );
    return {
      success: false,
      error:
        error.message || 'An unexpected error occurred while retrieving actions.',
      hint: 'This error should not happen. Please contact support if you see this error.'
    };
  }
} 
