/**
 * Typed API client functions for interacting with endpoints in the Dashboard Service.
 */
import {
  ServiceResponse,
  Dashboard,
  DashboardLayout,
  HumanInternalCredentials,
  DashboardInfo,
  CreateDashboardRequest,
  DashboardBlockInfo,
  DashboardBlock
} from '@agent-base/types';
import { makeInternalRequest } from '../utils/service-client.js';
import { getDashboardServiceUrl } from '../utils/config.js';
import { Method } from 'axios';

/**
 * Creates a new dashboard.
 * Corresponds to: POST /dashboards
 */
export const createDashboardApiClient = (
  data: CreateDashboardRequest,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<Dashboard>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  return makeInternalRequest<Dashboard>(
    getDashboardServiceUrl(),
    'POST' as Method,
    '/dashboards',
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    data
  );
};

/**
 * Lists all dashboards for the authenticated user and organization.
 * Corresponds to: GET /dashboards
 */
export const listDashboardsApiClient = (
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<DashboardInfo[]>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  return makeInternalRequest<DashboardInfo[]>(
    getDashboardServiceUrl(),
    'GET' as Method,
    '/dashboards',
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

/**
 * Fetches a single dashboard by its ID.
 * Corresponds to: GET /dashboards/{id}
 */
export const getDashboardByIdApiClient = (
  dashboardId: string,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<Dashboard>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/dashboards/${dashboardId}`;
  return makeInternalRequest<Dashboard>(
    getDashboardServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

/**
 * Updates an existing dashboard.
 * Corresponds to: PATCH /dashboards/{id}
 */
export const updateDashboardApiClient = (
  dashboardId: string,
  data: Partial<{ name: string; layout: DashboardLayout }>,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<Dashboard>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/dashboards/${dashboardId}`;
  return makeInternalRequest<Dashboard>(
    getDashboardServiceUrl(),
    'PATCH' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey,
    data
  );
};

/**
 * Deletes a dashboard by its ID.
 * Corresponds to: DELETE /dashboards/{id}
 */
export const deleteDashboardApiClient = (
  dashboardId: string,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<{ message: string }>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/dashboards/${dashboardId}`;
  return makeInternalRequest<{ message: string }>(
    getDashboardServiceUrl(),
    'DELETE' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

/**
 * Lists all available dashboard block templates.
 * Corresponds to: GET /blocks
 */
export const listDashboardBlocksApiClient = (
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<DashboardBlockInfo[]>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  return makeInternalRequest<DashboardBlockInfo[]>(
    getDashboardServiceUrl(),
    'GET' as Method,
    '/blocks',
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};

/**
 * Fetches a single, complete dashboard block template by its ID.
 * Corresponds to: GET /blocks/{id}
 */
export const getDashboardBlockByIdApiClient = (
  blockId: string,
  credentials: HumanInternalCredentials
): Promise<ServiceResponse<DashboardBlock>> => {
  const { platformUserId, clientUserId, clientOrganizationId, platformApiKey } = credentials;
  const endpoint = `/blocks/${blockId}`;
  return makeInternalRequest<DashboardBlock>(
    getDashboardServiceUrl(),
    'GET' as Method,
    endpoint,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    platformApiKey
  );
};
