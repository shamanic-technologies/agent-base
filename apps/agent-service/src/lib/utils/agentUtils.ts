/**
 * Agent Utilities
 * 
 * Utility functions related to agent data and operations within the agent-service.
 */

import { CreateClientUserAgentInput, Gender } from "@agent-base/types";
import { ModelName } from "../../types/agent-config.js";

/**
 * Creates the payload object for a default agent.
 * 
 * @param userId - The ID of the user for whom the default agent is being created.
 * @returns The CreateUserAgentInput object for the default agent.
 */
export function createDefaultAgentPayload(clientUserId: string): CreateClientUserAgentInput {
    // Define default agent data (ensure it matches CreateUserAgentInput)
    const defaultAgentPayload: CreateClientUserAgentInput = {
        clientUserId: clientUserId,
        firstName: 'Alex',
        lastName: 'Sinnek',
        profilePicture: 'AS', 
        gender: 'man', // Ensure 'other' is valid in your @agent-base/types Gender definition
        modelId: ModelName.CLAUDE_3_7_SONNET_20250219, // Ensure this is a valid model ID
        memory: `{
            objective: 'to be completed',
            kpis: [
                {
                    name: 'to be completed',
                    description: 'to be completed',
                    target: 'to be completed',
                    advancement: 'to be completed',
                    deadline: 'to be completed',
                    priority: 'to be completed',
                },
                {
                    name: 'to be completed',
                    description: 'to be completed',
                    target: 'to be completed',
                    advancement: 'to be completed',
                    deadline: 'to be completed',
                    priority: 'to be completed',
                }
            ],
            context: 'to be completed',
            budget: [
                {
                    total: 'to be completed',
                    spent: 'to be completed',
                    currency: 'to be completed',
                    time_period: 'to be completed',
                }
            ],
            actions_planned: [
                {
                    name: 'to be completed',
                    description: 'to be completed',
                    deadline: 'to be completed',
                }
            ],
            actions_in_progress: [
                {
                    name: 'to be completed',
                    description: 'to be completed',
                    since: 'to be completed',
                    progress: 'to be completed',
                    deadline: 'to be completed',
                }
            ],
            actions_completed: [
                {
                    name: 'to be completed',
                    description: 'to be completed',
                    date: 'to be completed',
                }
            ],
            reviews_received: [
                {
                    from: 'to be completed',
                    rating: 'to be completed',
                    content: 'to be completed',
                    date: 'to be completed',
                }
            ]
        }`,
        jobTitle: 'Assistant',
    };
    return defaultAgentPayload;
} 