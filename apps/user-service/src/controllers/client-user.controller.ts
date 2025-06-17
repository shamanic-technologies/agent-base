/**
 * Client Organization Controller
 *
 * Handles operations related to client organizations.
 */
import { AsyncRequestHandler } from '../utils/types';
import { getOrganizationsForClientUserApiClient } from '@agent-base/api-client';

/**
 * Lists all organizations for the authenticated client user.
 */
export const listClientOrganizationsHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const dbResponse = await getOrganizationsForClientUserApiClient(req.humanInternalCredentials);

    if (!dbResponse.success) {
      console.error(`[User Service] Failed to get organizations for client user ${req.humanInternalCredentials.clientUserId}: ${dbResponse.error}`);
      return res.status(dbResponse.statusCode || 500).json({
        success: false,
        error: dbResponse.error || 'Failed to process request',
      });
    }

    return res.json(dbResponse);
  } catch (error: any) {
    console.error(`[User Service] Unexpected error listing organizations for client user ${req.humanInternalCredentials.clientUserId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 