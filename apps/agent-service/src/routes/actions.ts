/**
 * Agent Service - Actions Routes
 *
 * API endpoints for retrieving actions. This service acts as a proxy to the database service,
 * leveraging the internal API client.
 */
import express, { Request, Response, Router, NextFunction } from 'express';
import { Action, ServiceResponse, ErrorResponse } from '@agent-base/types';
import {
    getAllActionsForUserInternalApiService
} from '@agent-base/api-client'; // Ensure this path is correct for your monorepo structure

const router: Router = express.Router();

/**
 * GET /actions
 *
 * Retrieves all actions for a client user.
 * Expects x-client-user-id, x-client-organization-id, x-platform-user-id, 
 * and x-platform-api-key in the request headers.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientUserId = req.headers['x-client-user-id'] as string;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string;
    const platformUserId = req.headers['x-platform-user-id'] as string; // Standard auth header
    const platformApiKey = req.headers['x-platform-api-key'] as string; // Standard auth header

    const queryLimit = req.query.limit as string | undefined;
    let limitNum: number | undefined = undefined;
    if (queryLimit) {
      const parsedLimit = parseInt(queryLimit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limitNum = parsedLimit;
      }
    } // If not provided or invalid, the downstream service/client will use its default

    try {
        // Validate essential headers for the downstream service call
        if (!clientUserId) {
            console.error('[AgentService /actions] Client User ID is missing in request headers (x-client-user-id).');
            const errRes: ErrorResponse = {
                success: false,
                error: 'Client User ID is missing in request headers (x-client-user-id).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errRes);
            return;
        }
        if (!clientOrganizationId) {
            console.error('[AgentService /actions] Client Organization ID is missing in request headers (x-client-organization-id).');
            const errRes: ErrorResponse = {
                success: false,
                error: 'Client Organization ID is missing in request headers (x-client-organization-id).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errRes);
            return;
        }
        if (!platformUserId) {
            console.error('[AgentService /actions] Platform User ID is missing in request headers (x-platform-user-id).');
            const errRes: ErrorResponse = {
                success: false,
                error: 'Platform User ID is missing in request headers (x-platform-user-id).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errRes);
            return;
        }
        if (!platformApiKey) {
            console.error('[AgentService /actions] Platform API Key is missing in request headers (x-platform-api-key).');
            const errRes: ErrorResponse = {
                success: false,
                error: 'Platform API Key is missing in request headers (x-platform-api-key).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errRes);
            return;
        }

        // Call the internal API client function which contacts the database-service
        const serviceResponse: ServiceResponse<Action[]> = await getAllActionsForUserInternalApiService(
            clientUserId,
            clientOrganizationId,
            platformUserId,
            platformApiKey,
            limitNum // Pass the parsed limit
        );

        // Forward the response from the database-service
        // It already includes { success: boolean, data?: T, error?: string }
        if (!serviceResponse.success) {
            // Log the error specific to agent-service context if needed
            // Determine appropriate status code. If database-service provided one (e.g. via error message analysis),
            // we could use that. For now, if it's a known client error pattern (like 'required'), use 400.
            const statusCode = serviceResponse.error?.toLowerCase().includes('required') ? 400 : 500;
            res.status(statusCode).json(serviceResponse);
            return;
        }

        res.status(200).json(serviceResponse);

    } catch (error: any) {
        console.error(`[AgentService /actions] Unexpected error for clientUserId ${clientUserId}:`, error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: error.message || 'An unexpected server error occurred in AgentService while fetching actions.',
            hint: 'This error should not happen. Please contact support if you see this error.'
        };
        // Check if headers are already sent before trying to send another response
        if (!res.headersSent) {
            res.status(500).json(errorResponse);
        }
        // next(error); // Optionally pass to a global error handler
    }
});

export default router; 