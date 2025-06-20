import { getAgentBaseApiUrl } from "../utils/config.js";
import { makeAgentBaseRequest } from "../utils/service-client.js";
import { 
    AgentBaseCredentials, 
    ServiceResponse, 
    Dashboard,
    DashboardInfo
} from "@agent-base/types";

const DATABASE_SERVICE_ROUTE_PREFIX = '/database'; // Assuming the gateway prefixes database routes

/**
 * Lists all dashboards for the user and organization specified in the credentials.
 * @param {AgentBaseCredentials} credentials - The credentials containing the API key and user info.
 * @returns {Promise<ServiceResponse<DashboardInfo[]>>} A promise resolving to the list of dashboards.
 */
export const listDashboards = async (
    credentials: AgentBaseCredentials
): Promise<ServiceResponse<DashboardInfo[]>> => {
    // The clientUserId and clientOrganizationId are passed as query params,
    // which the gateway will extract from the validated credentials.
    const endpoint = `${DATABASE_SERVICE_ROUTE_PREFIX}/dashboards`;

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
export const getDashboard = async (
    dashboardId: string,
    credentials: AgentBaseCredentials
): Promise<ServiceResponse<Dashboard>> => {
    const endpoint = `${DATABASE_SERVICE_ROUTE_PREFIX}/dashboards/${dashboardId}`;

    return makeAgentBaseRequest<Dashboard>(
        getAgentBaseApiUrl(),
        'GET',
        endpoint,
        credentials
    );
};
