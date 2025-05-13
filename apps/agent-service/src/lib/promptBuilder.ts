/**
 * Prompt Builder for AI Agent
 * 
 * Contains constants and functions to construct system prompts.
 */

import { Agent, ClientUser, GetClientUserAgentInput } from '@agent-base/types';

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
- Create external tool: Create a new external tool. Everytime the user wants you to do an action,
and you can't find the right tool to do it, use this tool to create a new external tool based on an API Documentation from your knowledge or found online.
- Google search: Search the web using Google Search API to find up-to-date information.
- Read webpage: Read the content of any webpage.

### Procedure when you are not 100% sure about something:
- Search the web using Google Search API to find up-to-date information.
- Read the content of any webpage.
- Never stay with uncertainty. Be proactive in your assertiveness by searching the web or reading a webpage.

### Procedure to create a new external tool:
0- Search if the user has already created a tool for the use case you need. if not, do the following:
1- Search online for the API Documentation of the tool you want to create. Ensure you have a clear understanding of the authentication requirements.
2- Create a new external tool using the utility_create_external_tool tool, to be called with utility_call_utility.
3- Call the new external tool using the utility_call_utility tool in order to test it, until it works as expected.

### Procedure to create a new webhook:
0- Search if the user has already created a webhook for the provider you want to create. if not, do the following:
1- Search online for the Webhook Documentation of the webhook provider you want to create. 
2- Ensure you have a clear understanding of:
- the specific webhook event you want to subscribe to
- the webhook event payload schema
- the field of the payload that will be used to identify the conversation ID
3- Create a new webhook using the webhook_create_webhook tool directly.
4- Link the new webhook to the user using the webhook_link_user tool.
It will return a webhook endpoint that you will ask the user to input in the webhook provider dashboard.
Once done, the user will see that webhook in its Agent Base dashboard.
5- Link the new webhook to an agent using the webhook_link_agent tool.
Once done, the agent will automatically start receiving the webhook events and use it.
To respond to the webhook event, the agent needs to have the proper external tool created and tested upfront.
6- Test the webhook with curl (utility_curl_command) or any other tool that can make HTTP requests.
Ask the user if he sees the webhook event in the Agent Base dashboard.

### General rules:
- All the links you provide to the user must be clickable and open a new tab.
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
 * @param {GetClientUserAgentInput} agent - The agent record containing memory and potentially other details.
 * @returns {string} The fully constructed system prompt.
 */
export function buildSystemPrompt(
    agent: Agent
): string {
    let prompt = purpose_prompt;
    // Append agent identity
    prompt += `
    ### Your Agent identity
    id: ${agent.id}
    name: ${agent.firstName} ${agent.lastName}
    job title: ${agent.jobTitle}
    profile picture: ${agent.profilePicture}
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
    No information for now.
    `;

    return prompt;
} 