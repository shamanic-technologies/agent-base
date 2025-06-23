import { getAgentBaseApiUrl } from "../utils/config.js";
import { makeAgentBaseRequest } from "../utils/service-client.js";
import { 
    AgentBaseCredentials, 
    ServiceResponse, 
    Dashboard,
    DashboardInfo
} from "@agent-base/types";

const DASHBOARD_SERVICE_ROUTE_PREFIX = '/dashboard';

/**
 * Lists summary information for all dashboards for the user and organization.
 * @param {AgentBaseCredentials} credentials - The credentials containing the API key and user info.
 * @returns {Promise<ServiceResponse<DashboardInfo[]>>} A promise resolving to the list of dashboard summaries.
 */
export const getDashboardsInfo = async (
    credentials: AgentBaseCredentials
): Promise<ServiceResponse<DashboardInfo[]>> => {
    const endpoint = `${DASHBOARD_SERVICE_ROUTE_PREFIX}/dashboards`;

    return makeAgentBaseRequest<DashboardInfo[]>(
        getAgentBaseApiUrl(),
        'GET',
        endpoint,
        credentials
    );
};

/**
 * Fetches a single, complete dashboard by its ID.
 * @param {string} dashboardId - The ID of the dashboard to fetch.
 * @param {AgentBaseCredentials} credentials - The credentials for authentication.
 * @returns {Promise<ServiceResponse<Dashboard>>} A promise resolving to the full dashboard object.
 */
export const getDashboardById = async (
    dashboardId: string,
    credentials: AgentBaseCredentials
): Promise<ServiceResponse<Dashboard>> => {
    const endpoint = `${DASHBOARD_SERVICE_ROUTE_PREFIX}/dashboards/${dashboardId}`;

    return makeAgentBaseRequest<Dashboard>(
        getAgentBaseApiUrl(),
        'GET',
        endpoint,
        credentials
    );
};

/**
 * Executes a raw SQL query via the dashboard-service.
 * This is a powerful and potentially dangerous endpoint that should be used with care.
 * @param {QueryDashboardServiceInput} data - The SQL query to execute.
 * @param {AgentBaseCredentials} credentials - The credentials for authentication.
 * @returns {Promise<ServiceResponse<Record<string, any>[]>>} A promise resolving to the query result.
 */
export const queryDashboard = async (
    query: string,
    credentials: AgentBaseCredentials
): Promise<ServiceResponse<Record<string, any>[]>> => {
    // The new dashboard-service is mounted on /dashboard at the gateway
    const endpoint = `${DASHBOARD_SERVICE_ROUTE_PREFIX}/query`;

    // The body for this request only needs the query string.
    // The user/org context is handled by the gateway and middleware.
    const body = {
        query: query,
        clientUserId: credentials.clientAuthUserId, // Pass credentials in body as expected by the service
        clientOrganizationId: credentials.clientAuthOrganizationId
    };

    return makeAgentBaseRequest<Record<string, any>[]>(
        getAgentBaseApiUrl(),
        'POST',
        endpoint,
        credentials,
        body
    );
};
