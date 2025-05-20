/**
 * Agents Routes
 * 
 * API endpoints for managing agents
 */
import express, { Request, Response, RequestHandler, NextFunction } from 'express';
import { createAgent, updateAgent, linkAgentToClientUser, listClientUserAgents, getClientUserAgent, getConversationAgent } from '../services/agents.js';
import { 
  UpdateAgentInput, 
  CreateClientUserAgentInput,
  ListClientUserAgentsInput, 
  AgentRecord, // Keep other needed types
  ErrorResponse,
  SuccessResponse,
  GetClientUserAgentInput,
  UpdateClientUserAgentInput,
  ServiceResponse,
  Agent,
  BaseResponse, // <-- Add import for the renamed response type
} from '@agent-base/types';

const router = express.Router();

/**
 * Create a new agent and link it to the specified user
 */
router.post('/create-user-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateClientUserAgentInput;
    const { clientUserId, ...agentData } = input; // Separate user_id from agent creation data

    // --- Validation ---
    // 1. Validate user_id presence
    if (!clientUserId) {
      res.status(400).json({ success: false, error: 'clientUserId is required in the request body' });
      return;
    }

    // 2. Validate required agent fields (copied from original /create)
    if (!agentData.firstName || !agentData.lastName || !agentData.profilePicture || 
        !agentData.gender || !agentData.modelId || 
        !agentData.memory || !agentData.jobTitle) {
      res.status(400).json({ success: false, error: 'Missing required agent fields' });
      return;
    }
    // --- End Validation ---

    // --- Step 1: Create Agent ---
    console.log(`[DB Service /create-user-agent] Attempting to create agent for user ${clientUserId}`);
    const createResponse : ServiceResponse<Agent> = await createAgent(agentData);
    
    if (!createResponse.success || !createResponse.data) {
      console.error('[DB Service /create-user-agent] Agent creation failed:', createResponse.error);
      // Use CreateUserAgentResponse type for consistency if needed, though error shape is generic
      res.status(400).json({ success: false, error: `Agent creation failed: ${createResponse.error || 'Unknown error'}` } as ErrorResponse);
      return;
    }
    
    const newAgentId = createResponse.data.id;
    console.log(`[DB Service /create-user-agent] Agent ${newAgentId} created successfully.`);
    // --- End Step 1 ---

    // --- Step 2: Link Agent to User ---
    console.log(`[DB Service /create-user-agent] Attempting to link agent ${newAgentId} to user ${clientUserId}`);
    const linkInput = { clientUserId, agentId: newAgentId };
    const linkResponse : BaseResponse = await linkAgentToClientUser(linkInput);

    if (!linkResponse.success) {
      console.error(`[DB Service /create-user-agent] Failed to link agent ${newAgentId} to user ${clientUserId}:`, linkResponse.error);
      // If linking fails, we might consider this a partial success or a full failure.
      // For atomicity, let's treat linking failure as an overall failure for this endpoint.
      // TODO: Consider if cleanup (deleting the created agent) is needed on link failure.
      res.status(500).json({ 
        success: false, 
        error: `Agent created (${newAgentId}), but failed to link to user ${clientUserId}: ${linkResponse.error || 'Unknown error'}` 
      } as ErrorResponse);
      return;
    }
    console.log(`[DB Service /create-user-agent] Successfully linked agent ${newAgentId} to user ${clientUserId}.`);
    // --- End Step 2 ---

    res.status(201).json(createResponse);

  } catch (error) {
    console.error('Error in /create-user-agent route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during agent creation/linking'
    } as ErrorResponse); // Use renamed type here too
  }
});

/**
 * Update an existing agent, ensuring user ownership
 * Renamed from /update
 */
router.post('/update-user-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as UpdateClientUserAgentInput;
    const { clientUserId, agentId, ...agentUpdateData } = input;
    console.log(`[DB Service /update-user-agent] Received request ${JSON.stringify(input, null, 2)}`);
    
    // --- Validation ---
    if (!clientUserId) {
      res.status(400).json({ success: false, error: 'clientUserId is required' });
      return;
    }
    if (!agentId) {
      res.status(400).json({ success: false, error: 'agentId is required' });
      return;
    }
    if (Object.keys(agentUpdateData).length === 0) {
       res.status(400).json({ success: false, error: 'No update data provided' });
       return;
    }
    // --- End Validation ---

    // --- Authorization Check ---
    console.log(`[DB Service /update-user-agent] Checking ownership for agent ${agentId} by user ${clientUserId}`);
    const ownershipCheckResponse : ServiceResponse<Agent> = await getClientUserAgent({ clientUserId, agentId });

    if (!ownershipCheckResponse.success) {
        // This means agent not found OR not linked to this user.
        console.warn(`[DB Service /update-user-agent] Ownership check failed for agent ${agentId}, user ${clientUserId}. Agent not found or not linked.`);
        res.status(403).json({ 
            success: false, 
            error: 'Forbidden: User does not own this agent or agent not found.'
        } as ErrorResponse);
         return;
    }
    console.log(`[DB Service /update-user-agent] Ownership confirmed for agent ${agentId}, user ${clientUserId}.`);
    // --- End Authorization Check ---

    // --- Perform Update ---
    // Now we know the user is authorized, proceed with the update.
    console.log(`[DB Service /update-user-agent] Attempting update for agent ${agentId} by user ${clientUserId}`);
    
    // Assuming updateAgent service needs agent_id within the data payload
    const updatePayload: UpdateAgentInput = {
       id: agentId,
       firstName: agentUpdateData.agentFirstName,
       lastName: agentUpdateData.agentLastName,
       profilePicture: agentUpdateData.agentProfilePicture,
       gender: agentUpdateData.agentGender,
       modelId: agentUpdateData.agentModelId,
       memory: agentUpdateData.agentMemory,
       jobTitle: agentUpdateData.agentJobTitle
    }; 
    const updateResponse : ServiceResponse<Agent> = await updateAgent(updatePayload);
    
    if (!updateResponse.success) {
       // If updateAgent fails *after* ownership check, it's likely an internal DB error.
       console.error(`[DB Service /update-user-agent] Update failed for agent ${agentId} AFTER ownership check:`, updateResponse.error);
       // Return 500 Internal Server Error
       res.status(500).json({ success: false, error: updateResponse.error || 'Agent update failed' } as ErrorResponse);
       return;
    }

    console.log(`[DB Service /update-user-agent] Agent ${agentId} updated successfully.`);
    res.status(200).json(updateResponse);
    // --- End Perform Update ---

  } catch (error) {
    console.error('Error in update-user-agent route:', error);
     if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ErrorResponse);
    }
  }
});

/**
 * List all agents for a user
 */
router.get('/list-user-agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientUserId = req.query.clientUserId as string;
    
    if (!clientUserId) {
      res.status(400).json({
        success: false,
        error: 'clientUserId query parameter is required'
      });
       return;
    }

    console.log(`[DB Service /list-user-agents] Fetching agents for user ${clientUserId}`);
    const input: ListClientUserAgentsInput = { clientUserId };
    const listResponse : ServiceResponse<Agent[]> = await listClientUserAgents(input);
    
    // Check for actual errors from the service
    if (!listResponse.success) {
      // Log the specific error from the service
      console.error(`[DB Service /list-user-agents] Service error listing agents for user ${clientUserId}:`, listResponse.error);
      // Return a 500 Internal Server Error for service failures
      res.status(500).json({ 
        success: false, 
        error: listResponse.error || 'Failed to list agents due to an internal error' 
      } as ErrorResponse);
       return;
    }

    // If service call was successful (result.success is true),
    // return 200 OK with the data (which might be an empty array [] if no agents found)
    console.log(`[DB Service /list-user-agents] Successfully retrieved agent list for user ${clientUserId}. Count: ${listResponse.data?.length ?? 0}`);
    res.status(200).json(listResponse);

  } catch (error) {
    // Catch unexpected errors during route processing
    console.error('Error in list-user-agents route handler:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown internal server error'
      } as ErrorResponse);
    }
  }
});

/**
 * Get a specific agent belonging to a user
 */
router.get('/get-user-agent', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract user_id and agent_id from query parameters
    const clientUserId = req.query.clientUserId as string;
    const agentId = req.query.agentId as string;
    const input: GetClientUserAgentInput = { clientUserId, agentId };

    // Validate required query parameters
    if (!clientUserId) {
      res.status(400).json({
        success: false,
        error: 'clientUserId query parameter is required'
      });
       return;
    }
    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'agentId query parameter is required'
      });
       return;
    }

    console.log(`[Database Service /get-user-agent] Request for user: ${clientUserId}, agent: ${agentId}`);

    // Call the service function to fetch the agent
    const getAgentResponse : ServiceResponse<Agent> = await getClientUserAgent(input);
    
    // If agent not found or doesn't belong to user, service should return success: false
    if (!getAgentResponse.success) {
      console.log(`[Database Service /get-user-agent] Agent not found or access denied for user: ${clientUserId}, agent: ${agentId}`);
      res.status(404).json(getAgentResponse); // Return 404
       return;
    }

    console.log(`[Database Service /get-user-agent] Found agent: ${agentId} for user: ${clientUserId}`);
    res.status(200).json(getAgentResponse); // Return agent data

  } catch (error) {
    console.error('Error in get user agent route:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown internal server error'
      });
    }
  }
});

/**
 * Get the agent for a specific conversation
 * GET /get-conversation-agent?conversation_id=...
 */
router.get('/get-conversation-agent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract conversation_id from query parameters
    const conversationId = req.query.conversationId as string;

    // Validate conversation_id
    if (!conversationId) {
      res.status(400).json({ 
        success: false, 
        error: 'conversationId query parameter is required' 
      });
      return;
    }

    console.log(`[DB Route /agents] Getting agent for conversation ${conversationId}`);
    const getResponse : ServiceResponse<Agent> = await getConversationAgent({ conversationId });
    
    if (!getResponse.success) {
      console.error(`[DB Route /agents] Error getting agent for conversation:`, getResponse.error);
      res.status(getResponse.error.includes('No agent found') ? 404 : 500).json(getResponse);
      return;
    }

    console.log(`[DB Route /agents] Retrieved agent for conversation ${conversationId}`);
    res.status(200).json(getResponse);

  } catch (error) {
    console.error('Error in GET /agents/get-conversation-agent route:', error);
    next(error); 
  }
});

export default router;