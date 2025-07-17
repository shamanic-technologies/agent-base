/**
 * Types related to Conversations.
 */
// Use Message from 'ai' instead of UIMessage
import { Message } from 'ai';
import { ClientUser } from './user.js';
import { Agent } from './agent.js';
import { AgentBaseDeductCreditResponse } from './credit.js';

// --- Conversation Records and Inputs ---

export interface UserMessageMetadata {
    from_client_user: Partial<ClientUser>;
    to_agent: Partial<Agent>; // We exclude memory
    started_at: Date;
    ended_at?: Date;
    credit_consumption?: AgentBaseDeductCreditResponse;
}

export interface AgentToAgentMessageMetadata {
    from_agent: Partial<Agent>; // We exclude memory
    to_agent: Partial<Agent>; // We exclude memory
    started_at: Date;
    ended_at?: Date;
    credit_consumption?: AgentBaseDeductCreditResponse;
}

export interface AgentToUserMessageMetadata {
    from_agent: Partial<Agent>; // We exclude memory
    to_client_user: Partial<ClientUser>; 
    started_at: Date;
    ended_at?: Date;
    credit_consumption?: AgentBaseDeductCreditResponse;
}

