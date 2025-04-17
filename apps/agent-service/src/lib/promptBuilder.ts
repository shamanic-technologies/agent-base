/**
 * Prompt Builder for AI Agent
 * 
 * Contains constants and functions to construct system prompts.
 */

import { ClientUser, Agent } from '@agent-base/types';

/**
 * Default system prompt prefix for the AI agent.
 */
export const available_tools_prompt = `
### Available tools: 
1- utility_list_utilities: List all utilities available for you to call. 
2- utility_get_utility_info: Get information about a specific utility you may want to call. 
3- utility_call_utility: Call a specific utility with the utility id and provided arguments.
Don't call utility_id directly. Instead call the utility_call_utility tool with the utility_id you wan to be called.

### Important internal tools to use as often as you need (to be executed with utility_call_utility):
- utility_create_external_tool: Create a new external tool. Everytime the user wants you to do an action,
and you can't find the right tool to do it, use this tool to create a new external tool based on an API Documentation from your knowledge or found online.
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
 * @param {Agent} agent - The agent record containing memory and potentially other details.
 * @param {ClientUser} userProfile - The fetched user profile data.
 * @returns {string} The fully constructed system prompt.
 */
export function buildSystemPrompt(
    agent: Agent,
    userProfile: ClientUser
): string {
    console.log('[Prompt Builder] User Profile:', JSON.stringify(userProfile, null, 2));
    let prompt = purpose_prompt;
    // Append agent identity
    prompt += `
    ### Your identity
    Your name: ${agent.firstName} ${agent.lastName}
    Your job title: ${agent.jobTitle}
    Your profile picture: ${agent.profilePicture}
    `;
    // Append agent memory
    prompt += `
    ### Your memory
    ${agent.memory}
    `;
    // Append available tools
    prompt += available_tools_prompt;

    // Append user profile information if available
    prompt += `
    ### User Profile Information
    Created At: ${userProfile.createdAt}
    Updated At: ${userProfile.updatedAt}
    `;

    return prompt;
} 