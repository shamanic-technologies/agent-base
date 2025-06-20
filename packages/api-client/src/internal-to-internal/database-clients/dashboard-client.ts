/**
 * Typed API client functions for interacting with Dashboard endpoints in the Database Service.
 */
import { 
    ServiceResponse,
    Dashboard,
    DashboardFileTree,
    HumanInternalCredentials,
    DashboardInfo
} from '@agent-base/types';
import { makeInternalRequest } from '../../utils/service-client.js';
import { getDatabaseServiceUrl } from '../../utils/config.js';
import { Method } from 'axios';

interface CreateDashboardApiClientInput {
    name: string;
    webContainerConfig: DashboardFileTree;
}

/**
 * Creates a new dashboard record via the database service.
 * Corresponds to: POST /dashboards
 * 
 * @param {CreateDashboardApiClientInput} data - The dashboard name and configuration.
 * @param {HumanInternalCredentials} credentials - The internal credentials for the user making the request.
 * @returns {Promise<ServiceResponse<Dashboard>>} A promise resolving to a ServiceResponse containing the created Dashboard data or an error.
 */
export const createDashboardApiClient = async (
  data: CreateDashboardApiClientInput,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<Dashboard>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;

  // The body for the database service endpoint needs the user and org IDs.
  const body = {
    ...data,
    client_user_id: clientUserId,
    client_organization_id: clientOrganizationId
  };

  return makeInternalRequest<Dashboard>(
    getDatabaseServiceUrl(),
    'POST' as Method,
    '/dashboards',
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    body
  );
};

/**
 * Lists all dashboards for a given user and organization, excluding the large webContainerConfig.
 * Corresponds to: GET /dashboards?clientUserId={id}&organizationId={id}
 * 
 * @param {HumanInternalCredentials} credentials - The internal credentials for the user and organization making the request.
 * @returns {Promise<ServiceResponse<DashboardInfo[]>>} A promise resolving to the list of dashboards.
 */
export const listDashboardsForUserAndOrganizationApiClient = async (
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<DashboardInfo[]>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;

  // The user and organization IDs are passed as URL query parameters
  const endpoint = `/dashboards?clientUserId=${clientUserId}&clientOrganizationId=${clientOrganizationId}`;

  return makeInternalRequest<DashboardInfo[]>(
    getDatabaseServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

/**
 * Fetches a single, complete dashboard by its ID.
 * Corresponds to: GET /dashboards/{id}
 * 
 * @param {string} dashboardId - The ID of the dashboard to fetch.
 * @param {HumanInternalCredentials} credentials - The internal credentials for the user making the request.
 * @returns {Promise<ServiceResponse<Dashboard>>} A promise resolving to the full dashboard object.
 */
export const getDashboardByIdApiClient = async (
  dashboardId: string,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<Dashboard>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/dashboards/${dashboardId}`;

  return makeInternalRequest<Dashboard>(
    getDatabaseServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};
