import { makeServiceRequest } from '@agent-base/agents/src/utils/httpClient.js';
import { 
    ServiceResponse, 
    ExternalUtilityInfoResponse,
    ExternalUtilityInfo,
    UtilitiesListResponse,
    UtilitiesList
} from '@agent-base/agents';

// // Type for the list response from EUTS GET /api/tools
// type ExternalToolListInfo = { id: string; description: string };

// // Type for the get info response from EUTS GET /api/tools/:id
// // Includes only the fields UTS needs to return
// type ExternalToolDetails = Pick<ExternalUtilityConfig, 'id' | 'description' | 'schema'>;

/**
 * Lists tools available from the External Utility Tool Service.
 * 
 * @returns ServiceResponse containing an array of tool infos.
 */
export const listExternalTools = async (): Promise<UtilitiesListResponse> => {
    const externalToolServiceUrl = process.env.EXTERNAL_UTILITY_TOOL_SERVICE_URL;
    if (!externalToolServiceUrl) {
        console.error('Configuration Error: EXTERNAL_UTILITY_TOOL_SERVICE_URL is not set.');
        return { success: false, error: 'External Utility Tool Service URL is not configured.' };
    }
    return makeServiceRequest<UtilitiesList>(
        externalToolServiceUrl,
        'GET',
        '/api/tools'
    );
};

/**
 * Gets detailed info for a specific external tool.
 * 
 * @param toolId The ID of the external tool.
 * @returns ServiceResponse containing the tool details.
 */
export const getExternalToolInfo = async (toolId: string): Promise<ServiceResponse<ExternalUtilityInfo>> => {
    const externalToolServiceUrl = process.env.EXTERNAL_UTILITY_TOOL_SERVICE_URL;
    if (!externalToolServiceUrl) {
        console.error('Configuration Error: EXTERNAL_UTILITY_TOOL_SERVICE_URL is not set.');
        return { success: false, error: 'External Utility Tool Service URL is not configured.' };
    }
    return makeServiceRequest<ExternalUtilityInfo>(
        externalToolServiceUrl,
        'GET',
        `/api/tools/${toolId}` // Use template literal for the path
    );
};

/**
 * Executes a specific external tool.
 * IMPORTANT: This function aims to proxy the exact response (including status for errors) 
 * from the external service. Using makeServiceRequest might normalize errors into a 
 * standard { success: false, error: ... } structure with status 200. 
 * A direct axios call might be better here for full proxying if needed.
 * For now, we use makeServiceRequest and rely on its error reporting.
 * 
 * @param toolId The ID of the external tool.
 * @param payload The execution payload (userId, conversationId, params, agentId).
 * @returns ServiceResponse containing the execution result (which could be success, error, or setupNeeded).
 */
export const executeExternalTool = async (
    toolId: string, 
    payload: { userId: string; conversationId: string; params: any; agentId?: string }
): Promise<ServiceResponse<any>> => { // Use 'any' for data as it can be diverse
    const externalToolServiceUrl = process.env.EXTERNAL_UTILITY_TOOL_SERVICE_URL;
    if (!externalToolServiceUrl) {
        console.error('Configuration Error: EXTERNAL_UTILITY_TOOL_SERVICE_URL is not set.');
        return { success: false, error: 'External Utility Tool Service URL is not configured.' };
    }
    
    // Using makeServiceRequest will likely return a 200 OK even for proxied errors or setupNeeded responses from EUTS.
    // The caller (utilityController) will need to inspect the response body.
    const response = await makeServiceRequest<any>( // Expecting ExternalUtilityExecutionResponse essentially
        externalToolServiceUrl,
        'POST',
        `/api/tools/${toolId}/execute`,
        undefined, // userId header not needed for this endpoint
        payload
    );

    // We return the ServiceResponse directly. 
    // The controller should handle interpreting if it's a success, error, or setupNeeded response from EUTS.
    return response;
}; 