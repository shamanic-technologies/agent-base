/**
 * Message routes within Agent Service
 * 
 * Handles retrieving messages, potentially based on agent context.
 */
import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import {
    // Import necessary types
    ConversationRecord,
    GetAgentCurrentConversationResponse,
    GetMessagesResponse,
    GetAgentCurrentConversationMessagesResponse,
    MessageRecord
} from '@agent-base/agents';

const router = Router();
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Get messages for the current conversation of a specific agent.
 * GET /get-agent-current-conversation-messages?agent_id=...
 */
router.get('/get-agent-current-conversation-messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const agentId = req.query.agent_id as string;
        const userId = (req as any).user?.id as string; // For potential auth

        if (!userId) {
            res.status(401).json({ success: false, error: 'User authentication required' });
            return;
        }
        if (!agentId) {
            res.status(400).json({ success: false, error: 'agent_id query parameter is required' });
            return;
        }

        console.log(`[Agent Service /msg] Getting current conversation messages for agent ${agentId}`);

        // Step 1: Find the current conversation for the agent
        let currentConversation: ConversationRecord | null | undefined = null;
        try {
            console.log(`[Agent Service /msg] Calling DB to find current conv for agent ${agentId}`);
            const convResponse = await axios.get<GetAgentCurrentConversationResponse>(
                `${DATABASE_SERVICE_URL}/conversations/get_agent_current_conversation`, {
                    params: { agent_id: agentId }
                    // Add auth headers if needed
                }
            );
            if (convResponse.data.success && convResponse.data.data) {
                currentConversation = convResponse.data.data;
                console.log(`[Agent Service /msg] Found current conversation: ${currentConversation?.conversation_id}`);
            } else {
                console.log(`[Agent Service /msg] No current conversation found for agent ${agentId}.`);
            }
        } catch (convError) {
            // Log error finding conversation, but proceed to return empty messages
            console.error(`[Agent Service /msg] Error finding current conversation for agent ${agentId}:`, convError);
        }

        // Step 2: If a conversation was found, get its messages
        let messages: MessageRecord[] = [];
        if (currentConversation) {
            try {
                const conversationId = currentConversation.conversation_id;
                console.log(`[Agent Service /msg] Calling DB to get messages for conv ${conversationId}`);
                const msgResponse = await axios.get<GetMessagesResponse>(
                    `${DATABASE_SERVICE_URL}/messages/get_conversation_messages`, {
                        params: { conversation_id: conversationId }
                        // Add auth headers if needed
                    }
                );
                if (msgResponse.data.success && msgResponse.data.data) {
                    messages = msgResponse.data.data;
                    console.log(`[Agent Service /msg] Retrieved ${messages.length} messages for conv ${conversationId}`);
                } else {
                    console.warn(`[Agent Service /msg] DB service failed to get messages for conv ${conversationId}:`, msgResponse.data.error);
                }
            } catch (msgError) {
                 console.error(`[Agent Service /msg] Error getting messages for conv ${currentConversation.conversation_id}:`, msgError);
                 // Proceed with empty messages array
            }
        }

        // Return the messages (empty array if no conversation or error fetching messages)
        res.status(200).json({
            success: true,
            data: messages
        } as GetAgentCurrentConversationMessagesResponse);

    } catch (error) {
        console.error('[Agent Service /msg] Error in get-agent-current-conversation-messages:', error);
        next(error);
    }
});

export default router; 