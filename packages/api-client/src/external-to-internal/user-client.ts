import { getAgentBaseApiUrl } from "../utils/config.js";
import { makeAgentBaseRequest } from "../utils/service-client.js";
import { AgentBaseCredentials, ServiceResponse, ClientOrganization, UpdateClientOrganizationInput } from "@agent-base/types";

const USER_SERVICE_ROUTE_PREFIX = '/user';

/**
 * Updates an organization.
 * @param {string} organizationId - The ID of the organization to update.
 * @param {UpdateClientOrganizationInput} updates - The fields to update.
 * @param {HumanInternalCredentials} credentials - The internal credentials.
 * @returns {Promise<ServiceResponse<ClientOrganization>>} The updated organization data.
 */
export const updateOrganization = async (
    organizationId: string,
    updates: UpdateClientOrganizationInput,
    credentials: AgentBaseCredentials
  ): Promise<ServiceResponse<ClientOrganization>> => {
    const endpoint = `${USER_SERVICE_ROUTE_PREFIX}/organizations/${organizationId}`;
  
    return makeAgentBaseRequest<ClientOrganization>(
      getAgentBaseApiUrl(),
      'PUT',
      endpoint,
      credentials,
      updates,
      undefined
    );
  };
  
  /**
   * Deletes an organization.
   * @param {string} organizationId - The ID of the organization to delete.
   * @param {HumanInternalCredentials} credentials - The internal credentials.
   * @returns {Promise<ServiceResponse<boolean>>} Success status.
   */
  export const deleteOrganization = async (
    organizationId: string,
    credentials: AgentBaseCredentials
  ): Promise<ServiceResponse<boolean>> => {
    const endpoint = `${USER_SERVICE_ROUTE_PREFIX}/organizations/${organizationId}`;
  
    return makeAgentBaseRequest<boolean>(
      getAgentBaseApiUrl(),
      'DELETE',
      endpoint,
      credentials,
      undefined,
      undefined
    );
  };

/**
 * Fetches an organization by its Clerk Auth ID.
 * @param {string} clientAuthOrganizationId - The Clerk organization ID.
 * @param {AgentBaseCredentials} credentials - The credentials.
 * @returns {Promise<ServiceResponse<ClientOrganization>>} The organization data.
 */
export const getOrganizationByAuthId = async (
  clientAuthOrganizationId: string,
  credentials: AgentBaseCredentials
): Promise<ServiceResponse<ClientOrganization>> => {
  const endpoint = `${USER_SERVICE_ROUTE_PREFIX}/organizations/auth/${clientAuthOrganizationId}`;

  return makeAgentBaseRequest<ClientOrganization>(
    getAgentBaseApiUrl(),
    'GET',
    endpoint,
    credentials,
    undefined,
    undefined
  );
};

/**
 * Fetches an organization by its client organization ID.
 * @param {string} clientOrganizationId - The client organization ID.
 * @param {AgentBaseCredentials} credentials - The credentials.
 * @returns {Promise<ServiceResponse<ClientOrganization>>} The organization data.
 */
export const getClientOrganizationByIdApiClient = async (
  clientOrganizationId: string,
  credentials: AgentBaseCredentials
): Promise<ServiceResponse<ClientOrganization>> => {
  const endpoint = `${USER_SERVICE_ROUTE_PREFIX}/organizations/client/${clientOrganizationId}`;

  return makeAgentBaseRequest<ClientOrganization>(
    getAgentBaseApiUrl(),
    'GET',
    endpoint,
    credentials,
    undefined,
    undefined
  );
};

  