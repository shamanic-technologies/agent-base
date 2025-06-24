import { Request, Response } from 'express';
import { executeQuery } from '@agent-base/neon-client';
// ServiceResponse is not returned by executeQuery, so it's not needed here.

/**
 * Handles the /query endpoint with optional pagination.
 * If 'page' or 'limit' are provided, it paginates the results.
 * Otherwise, it returns the full result set.
 */
export const queryController = async (req: Request, res: Response) => {
    // clientUserId and clientOrganizationId are available for logging/auditing if needed from res.locals
    const { clientUserId, clientOrganizationId } = res.locals.credentials;
    const { query, page, limit } = req.body;

    if (!query || typeof query !== 'string') {
        console.error(`[queryController] Invalid query: ${query}`);
        return res.status(400).json({ error: 'A "query" string is required in the request body.' });
    }

    const usePagination = page !== undefined || limit !== undefined;
    const sanitizedQuery = query.trim().endsWith(';') ? query.trim().slice(0, -1) : query.trim();

    try {
        
        if (usePagination) {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 100); // Default limit if only page is set
            const offset = (pageNum - 1) * limitNum;

            const paginatedQuery = `${sanitizedQuery} LIMIT ${limitNum} OFFSET ${offset};`;
            const dataResult = await executeQuery(paginatedQuery);

            const countQuery = `SELECT COUNT(*) FROM (${sanitizedQuery}) AS count_query;`;
            const countResult = await executeQuery(countQuery);
            const totalRecords = parseInt(countResult[0]?.count, 10) || 0;
            const totalPages = Math.ceil(totalRecords / limitNum);

            return res.status(200).json({
                success: true,
                data: dataResult,
                pagination: {
                    currentPage: pageNum,
                    pageSize: limitNum,
                    totalRecords,
                    totalPages,
                }
            });
        } else {
            // No pagination, execute the raw query
            const fullResult = await executeQuery(sanitizedQuery);
            return res.status(200).json({ success: true, data: fullResult });
        }

    } catch (error: any) {
        console.error(`[queryController] Unexpected error:`, error);
        res.status(500).json({ success: false, error: 'An unexpected server error occurred.', details: error.message });
    }
}; 