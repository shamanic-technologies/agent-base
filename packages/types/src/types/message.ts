/**
 * Types related to Conversations.
 */
// Use Message from 'ai' instead of UIMessage
import { ClientUser } from './user.js';
import { Agent } from './agent.js';
import { AgentBaseDeductCreditResponse } from './credit.js';

// --- Conversation Records and Inputs ---
export interface MessageMetadata {
    type: 'user' | 'agent_to_agent' | 'agent_to_user';
    started_at: string;
    ended_at?: string;
    credit_consumption?: AgentBaseDeductCreditResponse;
}
export interface UserMessageMetadata extends MessageMetadata {
    type: 'user';
    from_client_user: Partial<ClientUser>;
    to_agent: Partial<Agent>; // We exclude memory
}

export interface AgentToAgentMessageMetadata extends MessageMetadata {
    type: 'agent_to_agent';
    from_agent: Partial<Agent>; // We exclude memory
    to_agent: Partial<Agent>; // We exclude memory
}

export interface AgentToUserMessageMetadata extends MessageMetadata {
    type: 'agent_to_user';
    from_agent: Partial<Agent>; // We exclude memory
    to_client_user: Partial<ClientUser>; 
}

