/**
 * Actions Routes
 *
 * API endpoints for retrieving actions associated with a client user.
 * Actions are derived from tool calls and results in conversation messages.
 */
import express, { Request, Response, Router, NextFunction } from 'express';
import { Action, ServiceResponse, ErrorResponse } from '@agent-base/types';
import { getActionsForClientUserLangGraph } from '../services/actions-langgraph.js';

const router: Router = express.Router(); // mergeParams is not strictly needed if not using parent params

/**
 * GET /actions
 *
 * Retrieves all actions for a given clientUserId and clientOrganizationId.
 * Both clientUserId and clientOrganizationId are expected in headers.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let clientUserIdFromHeader: string | undefined;
    try {
        clientUserIdFromHeader = req.headers['x-client-user-id'] as string;
        const clientOrganizationId = req.headers['x-client-organization-id'] as string;
        
        // Parse limit from query parameters
        const queryLimit = req.query.limit as string | undefined;
        let limit: number | undefined = undefined;
        if (queryLimit) {
            const parsedLimit = parseInt(queryLimit, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limit = parsedLimit;
            }
        } // If not provided or invalid, service will use its default (10)

        if (!clientUserIdFromHeader) {
            console.error('[API /actions] Client User ID is missing in request headers (x-client-user-id).');
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Client User ID is missing in request headers (x-client-user-id).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errorResponse);
            return;
        }

        if (!clientOrganizationId) {
            console.error('[API /actions] Client Organization ID is missing in request headers (x-client-organization-id).');
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Client Organization ID is missing in request headers (x-client-organization-id).',
                hint: 'This error should not happen. Please contact support if you see this error.'
            };
            res.status(400).json(errorResponse);
            return;
        }

        const response: ServiceResponse<Action[]> = await getActionsForClientUserLangGraph(
            clientUserIdFromHeader,
            clientOrganizationId,
            limit // Pass the parsed limit to the service
        );

        if (!response.success) {
            const errorResponse = response as ErrorResponse;
            const statusCode = errorResponse.error.toLowerCase().includes('required') ? 400 : 500;
            console.error(`[API /actions] Service error for clientUserId ${clientUserIdFromHeader}:`, errorResponse.error);
            res.status(statusCode).json(errorResponse);
            return;
        }

        res.status(200).json(response);

    } catch (error: any) {
        console.error(`[API /actions] Unexpected error for clientUserId ${clientUserIdFromHeader}:`, error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: error.message || 'An unexpected server error occurred while fetching actions.',
            hint: 'This error should not happen. Please contact support if you see this error.'
        };
        if (!res.headersSent) {
            res.status(500).json(errorResponse);
        }
    }
});

export default router;
