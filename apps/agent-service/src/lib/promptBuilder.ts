/**
 * Prompt Builder for AI Agent
 * 
 * Contains constants and functions to construct system prompts.
 */

import { User } from '../types/index.js';
import { AgentRecord } from '@agent-base/agents';

/**
 * Default system prompt prefix for the AI agent.
 */
export const available_tools_prompt = `
### Available tools: 
- utility_list_utilities: List all utilities available for you to call. 
- utility_get_utility_info: Get information about a specific utility you may want to call. 
- utility_call_utility: Call a specific utility with the utility id and provided arguments. 
Don't call utility_id directly. Instead call the utility_call_utility tool with the utility_id you wan to be called.
`;
export const purpose_prompt = `
### Purpose: 
Your purpose is to support the user within the scope defined in your memory.
Update your memory as often as you get more information about your purpose.
`;


/**
 * Builds the complete system prompt by combining the default prompt,
 * agent memory, and user profile information.
 * 
 * @param {AgentRecord} agent - The agent record containing memory and potentially other details.
 * @param {User} userProfile - The fetched user profile data.
 * @returns {string} The fully constructed system prompt.
 */
export function buildSystemPrompt(
    agent: AgentRecord,
    userProfile: User
): string {
    console.log('[Prompt Builder] User Profile:', JSON.stringify(userProfile, null, 2));
    let prompt = purpose_prompt;
    // Append agent identity
    prompt += `
    ### Your identity
    Your name: ${agent.agent_first_name} ${agent.agent_last_name}
    Your job title: ${agent.agent_job_title}
    Your profile picture: ${agent.agent_profile_picture}
    `;
    // Append agent memory
    prompt += `
    ### Your memory
    ${agent.agent_memory}
    `;
    // Append available tools
    prompt += available_tools_prompt;

    // Append user profile information if available
    prompt += `
    ### User Profile Information
    Name: ${userProfile.data.name}
    Email: ${userProfile.data.email}
    Picture: ${userProfile.data.picture}
    Last Login: ${userProfile.data.last_login}
    Created At: ${userProfile.created_at}
    Updated At: ${userProfile.updated_at}
    `;

    return prompt;
} 