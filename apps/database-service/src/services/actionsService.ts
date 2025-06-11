/**
 * Actions Service
 *
 * Handles business logic related to retrieving Actions from conversation messages.
 */
import {
  ServiceResponse,
  Action,
  ToolCall as AppToolCall, // Renaming to avoid conflict with Vercel's
  ToolResult as AppToolResult, // Renaming to avoid conflict with Vercel's
  Conversation,
  ErrorResponse,
} from '@agent-base/types';
import { Message as VercelMessage, ToolCallPart, ToolResultPart } from 'ai'; // Assuming Message from 'ai' is CoreMessage or compatible
import { getConversationsByClientUserId } from './conversations.js';

/**
 * Retrieves all actions for a given client user by processing their conversations.
 * Actions are derived from tool calls and tool results within conversation messages.
 *
 * @param clientUserId - The ID of the client user.
 * @param clientOrganizationId - The ID of the client organization.
 * @param limit - Optional limit for the number of actions to return.
 * @returns A promise that resolves to a service response containing an array of Actions.
 */
export async function getActionsForClientUser(
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
    const conversationsResponse = await getConversationsByClientUserId(
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

    const conversations: Conversation[] = conversationsResponse.data || [];

    for (const conversation of conversations) {
      const pendingToolCalls = new Map<string, AppToolCall>();

      for (const msg of conversation.messages) {
        const message = msg as VercelMessage; 

        // if (message.role === 'assistant') { // Keep this log for now to see the full structure
        //   console.log('[ActionsService] Processing ASSISTANT message:', JSON.stringify(message, null, 2));
        // }

        // Revised logic: Extract actions directly from assistant messages if they contain toolInvocations
        if (message.role === 'assistant' && message.toolInvocations && Array.isArray(message.toolInvocations)) {
          console.log(`[ActionsService] Found ${message.toolInvocations.length} toolInvocations in assistant message id: ${message.id}`);

          for (const invocation of message.toolInvocations) {
            if (invocation.state === 'result') { // Only process if the invocation has a result
              const toolCall: AppToolCall = {
                id: invocation.toolCallId,
                toolName: invocation.toolName,
                args: invocation.args,
              };

              let isError = false;
              // Check if the result structure indicates an error, e.g., by a common 'success' field
              if (typeof invocation.result === 'object' && invocation.result !== null && 'success' in invocation.result) {
                isError = !(invocation.result as any).success;
              }
              // Add other checks if error can be represented differently, e.g. result is an Error instance
              else if (invocation.result instanceof Error) {
                  isError = true;
              }

              const toolResult: AppToolResult = {
                toolCallId: invocation.toolCallId,
                toolName: invocation.toolName,
                result: invocation.result, // Store the actual result payload
                isError: isError,
              };

              if (!toolCall.id) {
                console.warn("[ActionsService] Skipping tool invocation due to missing toolCallId (from message.toolInvocations):", invocation);
                continue;
              }

              const pseudoAction: Action = {
                conversationId: conversation.conversationId,
                toolCall: toolCall,
                toolResult: toolResult,
                id: `${conversation.conversationId}-${toolCall.id}-${toolCall.toolName}`.slice(0, 255),
                createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
                updatedAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
              };
              actions.push(pseudoAction);
              console.log(`[ActionsService] Created Action for tool: ${toolCall.toolName} with callId: ${toolCall.id}`);
            }
          }
        } else if (message.role === 'assistant' && Array.isArray(message.parts)) {
            for (const part of message.parts) {
                if (part.type === 'tool-invocation' && part.toolInvocation) {
                    const invocation = part.toolInvocation;
                    if (invocation.state === 'result') { // Only process if the invocation part has a result
                        console.log(`[ActionsService] Found tool-invocation part with result in message id: ${message.id}`);

                        const toolCall: AppToolCall = {
                            id: invocation.toolCallId,
                            toolName: invocation.toolName,
                            args: invocation.args,
                        };

                        let isError = false;
                        if (typeof invocation.result === 'object' && invocation.result !== null && 'success' in invocation.result) {
                            isError = !(invocation.result as any).success;
                        }
                        else if (invocation.result instanceof Error) {
                            isError = true;
                        }

                        const toolResult: AppToolResult = {
                            toolCallId: invocation.toolCallId,
                            toolName: invocation.toolName,
                            result: invocation.result,
                            isError: isError,
                        };

                        if (!toolCall.id) {
                            console.warn("[ActionsService] Skipping tool-invocation part due to missing toolCallId:", invocation);
                            continue;
                        }

                        const pseudoAction: Action = {
                            conversationId: conversation.conversationId,
                            toolCall: toolCall,
                            toolResult: toolResult,
                            id: `${conversation.conversationId}-${toolCall.id}-${toolCall.toolName}`.slice(0, 255),
                            createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
                            updatedAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
                        };
                        actions.push(pseudoAction);
                        console.log(`[ActionsService] Created Action (from part) for tool: ${toolCall.toolName} with callId: ${toolCall.id}`);
                    }
                }
            }
        }

        // The old switch statement based on message.role === 'tool' can be removed or commented out
        // as it seems tool results are not in separate 'tool' messages in your current data.

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