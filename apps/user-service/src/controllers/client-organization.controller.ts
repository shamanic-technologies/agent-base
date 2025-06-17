/**
 * Client Organization Controller
 *
 * Handles operations related to client organizations.
 */
import { AsyncRequestHandler } from '../utils/types';
import { 
  updateOrganizationApiClient,
  deleteOrganizationApiClient
} from '@agent-base/api-client';
import { UpdateClientOrganizationInput } from '@agent-base/types';

/**
 * Updates an organization.
 */
export const updateClientOrganizationHandler: AsyncRequestHandler = async (req, res) => {
  const { organizationId } = req.params;
  const updates: UpdateClientOrganizationInput = req.body;

  try {
    const dbResponse = await updateOrganizationApiClient(organizationId, updates, req.humanInternalCredentials);

    if (!dbResponse.success) {
      console.error(`[User Service] Failed to update organization ${organizationId}: ${dbResponse.error}`);
      return res.status(dbResponse.statusCode || 500).json(dbResponse);
    }

    return res.json(dbResponse);
  } catch (error: any) {
    console.error(`[User Service] Unexpected error updating organization ${organizationId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Deletes an organization.
 */
export const deleteClientOrganizationHandler: AsyncRequestHandler = async (req, res) => {
  const { organizationId } = req.params;

  try {
    const dbResponse = await deleteOrganizationApiClient(organizationId, req.humanInternalCredentials);

    if (!dbResponse.success) {
      console.error(`[User Service] Failed to delete organization ${organizationId}: ${dbResponse.error}`);
      return res.status(dbResponse.statusCode || 500).json(dbResponse);
    }

    return res.json(dbResponse);
  } catch (error: any) {
    console.error(`[User Service] Unexpected error deleting organization ${organizationId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 