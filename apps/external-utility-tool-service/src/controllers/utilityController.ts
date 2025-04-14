import { Request, Response, NextFunction } from 'express';
import * as utilityService from '../services/utilityService';
import { ExternalUtilityConfig } from '@agent-base/agents'; // Assuming types are here

// Controller to list available utility tools
export const listTools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const tools = await utilityService.listAvailableTools();
        res.status(200).json({ success: true, data: tools });
    } catch (error) {
        next(error); // Pass error to global error handler
    }
};

// Controller to get detailed information about a specific tool
export const getToolInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const toolId = req.params.id;
        const toolInfo = await utilityService.getToolDetails(toolId);
        if (!toolInfo) {
            res.status(404).json({ success: false, error: `Tool with ID '${toolId}' not found.` });
            return;
        }
        res.status(200).json({ success: true, data: toolInfo });
    } catch (error) {
        next(error);
    }
};

// Controller to create a new tool configuration
export const createTool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const newConfig: ExternalUtilityConfig = req.body;
        // Basic validation placeholder - Add more robust validation later
        if (!newConfig || !newConfig.id || !newConfig.provider || !newConfig.description || !newConfig.schema || !newConfig.authMethod) {
             res.status(400).json({ success: false, error: 'Invalid tool configuration provided.' });
             return;
        }
        const createdTool = await utilityService.addNewTool(newConfig);
        res.status(201).json({ success: true, data: createdTool });
    } catch (error) {
        // Handle potential duplicate ID error from service
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(409).json({ success: false, error: error.message });
        } else {
            next(error);
        }
    }
};

// Controller to execute a specific utility tool
export const executeTool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const toolId = req.params.id;
        const { userId, conversationId, params, agentId } = req.body;

        // Basic input validation
        if (!userId || !conversationId || !params) {
            res.status(400).json({ success: false, error: 'Missing required fields: userId, conversationId, params' });
            return;
        }

        const result = await utilityService.runToolExecution(toolId, userId, conversationId, params, agentId);

        // Check if the result indicates setup is needed
        if (result.success === true && result.data?.needs_setup === true) {
             // It's a SetupNeededResponse - return as is (likely status 200)
             res.status(200).json(result);
        } else if (result.success === true) {
            // It's a UtilitySuccessResponse
            res.status(200).json(result);
        } else {
            // It's a UtilityErrorResponse - potentially map to HTTP status codes later
            res.status(400).json(result); // Use 400 for general tool execution errors for now
        }

    } catch (error) {
         // Catch errors from the service layer (e.g., tool not found)
         if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ success: false, error: error.message });
         } else {
             next(error); // Pass other errors to the global handler
         }
    }
}; 