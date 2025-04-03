/**
 * Agents Routes
 * 
 * API endpoints for managing agents
 */
import express, { Request, Response, RequestHandler } from 'express';
import { createAgent, updateAgent, linkAgentToUser, listUserAgents, getUserAgent } from '../services/agents.js';
import { 
  CreateUserAgentInput, // Import from shared package
  UpdateUserAgentInput, 
  UpdateUserAgentResponse, 
  ListUserAgentsInput, 
  GetUserAgentInput, 
  AgentRecord, // Keep other needed types
  CreateUserAgentResponse, // <-- Add import for the renamed response type
  ListUserAgentsResponse // <-- Add import for the new response type
} from '@agent-base/agents';

const router = express.Router();

/**
 * Create a new agent and link it to the specified user
 */
router.post('/create-user-agent', (async (req, res) => {
  try {
    const input: CreateUserAgentInput = req.body;
    const { user_id, ...agentData } = input; // Separate user_id from agent creation data

    // --- Validation ---
    // 1. Validate user_id presence
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required in the request body' });
    }

    // 2. Validate required agent fields (copied from original /create)
    if (!agentData.agent_first_name || !agentData.agent_last_name || !agentData.agent_profile_picture || 
        !agentData.agent_gender || !agentData.agent_system_prompt || !agentData.agent_model_id || 
        !agentData.agent_memory || !agentData.agent_job_title) {
      return res.status(400).json({ success: false, error: 'Missing required agent fields' });
    }
    // --- End Validation ---

    // --- Step 1: Create Agent ---
    console.log(`[DB Service /create-user-agent] Attempting to create agent for user ${user_id}`);
    const createResult = await createAgent(agentData);
    
    if (!createResult.success || !createResult.data) {
      console.error('[DB Service /create-user-agent] Agent creation failed:', createResult.error);
      // Use CreateUserAgentResponse type for consistency if needed, though error shape is generic
      return res.status(400).json({ success: false, error: `Agent creation failed: ${createResult.error || 'Unknown error'}` } as CreateUserAgentResponse);
    }
    
    const newAgentId = createResult.data.agent_id;
    console.log(`[DB Service /create-user-agent] Agent ${newAgentId} created successfully.`);
    // --- End Step 1 ---

    // --- Step 2: Link Agent to User ---
    console.log(`[DB Service /create-user-agent] Attempting to link agent ${newAgentId} to user ${user_id}`);
    const linkInput = { user_id, agent_id: newAgentId };
    const linkResult = await linkAgentToUser(linkInput);

    if (!linkResult.success) {
      console.error(`[DB Service /create-user-agent] Failed to link agent ${newAgentId} to user ${user_id}:`, linkResult.error);
      // If linking fails, we might consider this a partial success or a full failure.
      // For atomicity, let's treat linking failure as an overall failure for this endpoint.
      // TODO: Consider if cleanup (deleting the created agent) is needed on link failure.
      return res.status(500).json({ 
        success: false, 
        error: `Agent created (${newAgentId}), but failed to link to user ${user_id}: ${linkResult.error || 'Unknown error'}` 
      } as CreateUserAgentResponse);
    }
    console.log(`[DB Service /create-user-agent] Successfully linked agent ${newAgentId} to user ${user_id}.`);
    // --- End Step 2 ---

    // If both steps succeed, return the created agent data
    // Cast the successful result to the correct response type
    res.status(201).json(createResult as CreateUserAgentResponse);

  } catch (error) {
    console.error('Error in /create-user-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during agent creation/linking'
    } as CreateUserAgentResponse); // Use renamed type here too
  }
}) as RequestHandler);

/**
 * Update an existing agent, ensuring user ownership
 * Renamed from /update
 */
router.post('/update-user-agent', (async (req, res) => {
  try {
    const input: UpdateUserAgentInput = req.body;
    const { user_id, agent_id, ...agentUpdateData } = input;
    
    // --- Validation ---
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    if (!agent_id) {
      return res.status(400).json({ success: false, error: 'agent_id is required' });
    }
    if (Object.keys(agentUpdateData).length === 0) {
       return res.status(400).json({ success: false, error: 'No update data provided' });
    }
    // --- End Validation ---

    // --- Authorization Check ---
    console.log(`[DB Service /update-user-agent] Checking ownership for agent ${agent_id} by user ${user_id}`);
    const ownershipCheckResult = await getUserAgent({ user_id, agent_id });

    if (!ownershipCheckResult.success) {
        // This means agent not found OR not linked to this user.
        console.warn(`[DB Service /update-user-agent] Ownership check failed for agent ${agent_id}, user ${user_id}. Agent not found or not linked.`);
        return res.status(403).json({ // 403 Forbidden is appropriate here
            success: false, 
            error: 'Forbidden: User does not own this agent or agent not found.'
        } as UpdateUserAgentResponse);
    }
    console.log(`[DB Service /update-user-agent] Ownership confirmed for agent ${agent_id}, user ${user_id}.`);
    // --- End Authorization Check ---

    // --- Perform Update ---
    // Now we know the user is authorized, proceed with the update.
    console.log(`[DB Service /update-user-agent] Attempting update for agent ${agent_id} by user ${user_id}`);
    
    // Assuming updateAgent service needs agent_id within the data payload
    const updatePayload = { agent_id, ...agentUpdateData }; 
    const result = await updateAgent(updatePayload);
    
    if (!result.success) {
       // If updateAgent fails *after* ownership check, it's likely an internal DB error.
       console.error(`[DB Service /update-user-agent] Update failed for agent ${agent_id} AFTER ownership check:`, result.error);
       // Return 500 Internal Server Error
       return res.status(500).json({ success: false, error: result.error || 'Agent update failed' } as UpdateUserAgentResponse);
    }

    console.log(`[DB Service /update-user-agent] Agent ${agent_id} updated successfully.`);
    res.status(200).json(result as UpdateUserAgentResponse);
    // --- End Perform Update ---

  } catch (error) {
    console.error('Error in update-user-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as UpdateUserAgentResponse);
  }
}) as RequestHandler);

/**
 * List all agents for a user
 */
router.get('/list-user-agents', (async (req, res) => {
  try {
    const user_id = req.query.user_id as string;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
    }

    console.log(`[DB Service /list-user-agents] Fetching agents for user ${user_id}`);
    const input: ListUserAgentsInput = { user_id };
    const result = await listUserAgents(input);
    
    // Check for actual errors from the service
    if (!result.success) {
      // Log the specific error from the service
      console.error(`[DB Service /list-user-agents] Service error listing agents for user ${user_id}:`, result.error);
      // Return a 500 Internal Server Error for service failures
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to list agents due to an internal error' 
      } as ListUserAgentsResponse);
    }

    // If service call was successful (result.success is true),
    // return 200 OK with the data (which might be an empty array [] if no agents found)
    console.log(`[DB Service /list-user-agents] Successfully retrieved agent list for user ${user_id}. Count: ${result.data?.length ?? 0}`);
    res.status(200).json({
        success: true,
        data: result.data ?? [] // Ensure data is always an array, even if null/undefined from service
    } as ListUserAgentsResponse);

  } catch (error) {
    // Catch unexpected errors during route processing
    console.error('Error in list-user-agents route handler:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    } as ListUserAgentsResponse);
  }
}) as RequestHandler);

/**
 * Get a specific agent belonging to a user
 */
router.get('/get-user-agent', (async (req, res) => {
  try {
    // Extract user_id and agent_id from query parameters
    const user_id = req.query.user_id as string;
    const agent_id = req.query.agent_id as string;

    // Validate required query parameters
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
    }
    if (!agent_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id query parameter is required'
      });
    }

    console.log(`[Database Service /get-user-agent] Request for user: ${user_id}, agent: ${agent_id}`);

    const input: GetUserAgentInput = { user_id, agent_id };
    // Call the service function to fetch the agent
    const result = await getUserAgent(input);
    
    // If agent not found or doesn't belong to user, service should return success: false
    if (!result.success) {
      console.log(`[Database Service /get-user-agent] Agent not found or access denied for user: ${user_id}, agent: ${agent_id}`);
      return res.status(404).json(result); // Return 404
    }

    console.log(`[Database Service /get-user-agent] Found agent: ${agent_id} for user: ${user_id}`);
    res.status(200).json(result); // Return agent data

  } catch (error) {
    console.error('Error in get user agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal server error'
    });
  }
}) as RequestHandler);

export default router;