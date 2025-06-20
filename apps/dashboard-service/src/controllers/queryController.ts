import { Request, Response } from 'express';
import { executeQuery } from '@agent-base/neon-client';
// ServiceResponse is not returned by executeQuery, so it's not needed here.

/**
 * Handles the /query endpoint.
 * Extracts user and organization IDs from headers and the query from the body.
 * Calls the neon-client to execute the query against the database.
 */
export const queryController = async (req: Request, res: Response) => {
    // clientUserId and clientOrganizationId are available for logging/auditing if needed from res.locals
    const { clientUserId, clientOrganizationId } = res.locals.credentials;
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'A "query" string is required in the request body.' });
    }

    try {
        console.log(`Executing query for user ${clientUserId} in org ${clientOrganizationId}`);
        
        // Call executeQuery with just the SQL string
        const queryResult = await executeQuery(query);

        // The result is directly the array of rows
        res.status(200).json(queryResult);

    } catch (error: any) {
        console.error(`[queryController] Unexpected error:`, error);
        res.status(500).json({ error: 'An unexpected server error occurred.', details: error.message });
    }
}; 