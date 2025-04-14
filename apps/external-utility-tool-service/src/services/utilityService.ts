import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { 
    ExternalUtilityConfig, 
    ExternalUtilityExecutionResponse, 
    SetupNeededResponse,
    UtilityErrorResponse,
    UtilitySuccessResponse,
    UtilitySecret,
    AuthMethod,
    ApiKeyAuthScheme
} from '@agent-base/agents';
// Import database service functions
import { readUtilities, writeUtilities } from './databaseService';
// Import client functions
import { fetchSecrets } from '../clients/secretServiceClient';
import { checkAuth, CheckAuthResultData } from '../clients/toolAuthServiceClient';

// Path to the mock database file - REMOVED
// const UTILITIES_DB_PATH = path.join(__dirname, '../data/utilities.json');

// Helper function to read the utilities from the JSON file - REMOVED
// const readUtilities = async (): Promise<ExternalUtilityConfig[]> => { ... };

// Helper function to write utilities back to the JSON file - REMOVED
// const writeUtilities = async (utilities: ExternalUtilityConfig[]): Promise<void> => { ... };

// Service function to list available tools (simplified: ID and description)
export const listAvailableTools = async (): Promise<{ id: string; description: string }[]> => {
    const utilities = await readUtilities(); // Use imported function
    return utilities.map(tool => ({ id: tool.id, description: tool.description }));
};

// Service function to get tool details (ID, description, schema)
export const getToolDetails = async (toolId: string): Promise<Pick<ExternalUtilityConfig, 'id' | 'description' | 'schema'> | null> => {
    const utilities = await readUtilities(); // Use imported function
    const tool = utilities.find(t => t.id === toolId);
    if (!tool) return null;
    return { id: tool.id, description: tool.description, schema: tool.schema };
};

// Service function to add a new tool configuration
export const addNewTool = async (newConfig: ExternalUtilityConfig): Promise<ExternalUtilityConfig> => {
    const utilities = await readUtilities(); // Use imported function
    const existingTool = utilities.find(t => t.id === newConfig.id);
    if (existingTool) {
        throw new Error(`Tool with ID '${newConfig.id}' already exists.`);
    }
    // TODO: Add more robust validation of the config structure
    utilities.push(newConfig);
    await writeUtilities(utilities); // Use imported function
    return newConfig;
};

// --- Tool Execution Logic ---

/**
 * Main service function to execute a tool.
 * Handles prerequisite checks, API calls, and response formatting.
 */
export const runToolExecution = async (
    toolId: string,
    userId: string,
    conversationId: string, // Keep for potential future use (logging, context)
    params: Record<string, any>, // Explicitly type params
    agentId?: string        // Optional ID of the agent initiating the call
): Promise<ExternalUtilityExecutionResponse> => {

    const logPrefix = `[EXECUTE ${toolId}] User: ${userId}`; 
    console.log(`${logPrefix} Starting execution with params:`, params);

    try {
        // 1. Load Tool Configuration
        const utilities = await readUtilities();
        const config = utilities.find(t => t.id === toolId);
        if (!config) {
            console.error(`${logPrefix} Error: Tool config not found.`);
            throw new Error(`Tool configuration with ID '${toolId}' not found.`); // Caught by controller
        }

        // 2. Check Prerequisites (Secrets, Actions, OAuth)
        const { prerequisitesMet, setupNeededResponse, credentials } = await checkPrerequisites(config, userId, logPrefix);

        if (!prerequisitesMet) {
            console.log(`${logPrefix} Prerequisites not met. Returning setup needed response.`);
            return setupNeededResponse!;
        }

        // 3. Execute API Call (if defined)
        if (!config.apiDetails) {
            console.log(`${logPrefix} No apiDetails defined. Prerequisites met. Returning success.`);
            const successResponse: UtilitySuccessResponse<{ message: string }> = {
                success: true,
                data: { message: "Prerequisites met. No API call required for this tool." }
            };
            return successResponse;
        }

        console.log(`${logPrefix} Prerequisites met. Proceeding with API call.`);
        const apiResult = await makeApiCall(config, params, credentials, logPrefix);
        
        // 4. Format and Return Response
        const successResponse: UtilitySuccessResponse<any> = {
            success: true,
            data: apiResult // Return raw API result for now
        };
        console.log(`${logPrefix} API call successful. Returning result.`);
        return successResponse;

    } catch (error) {
        console.error(`${logPrefix} Error during execution:`, error);
        // Format error into UtilityErrorResponse
        let errorResponse: UtilityErrorResponse;
        if (axios.isAxiosError(error)) {
             const status = error.response?.status || 500;
             const apiError = error.response?.data?.error || error.response?.data || {};
             errorResponse = {
                success: false,
                error: `External API Error (${status}): ${apiError.message || error.message}`,
                details: JSON.stringify(apiError)
             };
        } else if (error instanceof Error) {
            errorResponse = {
                success: false,
                error: `Tool Execution Failed: ${error.message}`,
                details: error.stack
            };
        } else {
             errorResponse = {
                success: false,
                error: 'An unknown error occurred during tool execution.'
             };
        }
        console.log(`${logPrefix} Returning error response:`, errorResponse);
        return errorResponse;
    }
};

// Updated prerequisite checking logic using clients
const checkPrerequisites = async (
    config: ExternalUtilityConfig,
    userId: string,
    logPrefix: string
): Promise<{ 
    prerequisitesMet: boolean; 
    setupNeededResponse?: SetupNeededResponse; 
    credentials?: { apiKey?: string | null; oauthToken?: string | null }; // More specific type
}> => {
    console.log(`${logPrefix} Checking prerequisites...`);
    let allSecretsAvailable = true;
    let oauthAuthorized = true;
    let fetchedApiKey: string | null = null;
    let fetchedOauthToken: string | null = null;
    let requiredSecretInputs: UtilitySecret[] = [];
    let requiredActionConfirmations: UtilitySecret[] = [];

    // --- Check Secrets and Actions --- 
    if (config.requiredSecrets && config.requiredSecrets.length > 0) {
        try {
            // Use the client function
            const secretsData = await fetchSecrets(userId, config.provider, config.requiredSecrets, logPrefix);

            for (const secretKey of config.requiredSecrets) {
                const value = secretsData?.[secretKey];
                if (!value || (secretKey === UtilitySecret.WEBHOOK_URL_INPUTED && value !== 'true')) {
                    allSecretsAvailable = false;
                    // Differentiate between action confirmation and regular input
                    if (secretKey === UtilitySecret.WEBHOOK_URL_INPUTED) { // Check enum directly
                        requiredActionConfirmations.push(secretKey);
                    } else {
                        requiredSecretInputs.push(secretKey);
                    }
                    console.log(`${logPrefix} Missing or invalid secret: ${secretKey}`);
                }
                // Store API key if needed for this tool
                if (config.authMethod === AuthMethod.API_KEY && config.apiKeyDetails?.secretName === secretKey && value) { // Check enum directly
                    fetchedApiKey = value;
                }
            }
        } catch (err) {
            // Error is already logged by the client, just re-throw
            throw err; 
        }
    }

    // --- Check OAuth --- 
    if (config.authMethod === AuthMethod.OAUTH) {
        if (!config.requiredScopes || config.requiredScopes.length === 0) {
             console.error(`${logPrefix} OAuth tool requires requiredScopes.`);
             throw new Error(`Configuration error: OAuth tool '${config.id}' must define requiredScopes.`);
        }
        try {
            // Use the client function
            const authResponse = await checkAuth(userId, config.provider, config.requiredScopes, logPrefix);

            // Check the ServiceResponse structure first
            if (!authResponse.success) {
                // The client call itself failed (e.g., network error, config error)
                console.error(`${logPrefix} Auth check client call failed: ${authResponse.error}`);
                throw new Error(`Tool Auth Service communication failed: ${authResponse.error}`);
            }

            // Now check the data within the successful response
            const authData = authResponse.data;
            if (!authData.hasAuth) { // Case: hasAuth is false
                oauthAuthorized = false;
                const authUrl = authData.authUrl;
                console.log(`${logPrefix} OAuth not authorized. Auth URL: ${authUrl}`);
                // Construct SetupNeededResponse for OAuth
                if (!authUrl) {
                    console.error(`${logPrefix} OAuth requires setup, but no authUrl provided by auth service.`);
                    throw new Error('OAuth setup required, but authorization URL is missing.');
                }
                // Create the SetupNeededResponse structure
                const setupResponse: SetupNeededResponse = {
                    success: true,
                    data: {
                        needs_setup: true,
                        setup_url: authUrl,
                        provider: config.provider,
                        message: `Authentication required for ${config.provider}.`, 
                        title: `Connect ${config.provider}`, 
                        description: config.description,
                        // Clear secret/action requirements as OAuth takes precedence here
                        required_secret_inputs: [], 
                        required_action_confirmations: [] 
                    }
                };
                // If secrets are also needed, merge info? For now, prioritize OAuth if missing.
                return { prerequisitesMet: false, setupNeededResponse: setupResponse }; 
            }
            // Find the correct token (assuming simple case: first credential has it)
            fetchedOauthToken = authData.credentials?.[0]?.accessToken ?? null; 
            if (!fetchedOauthToken) {
                console.error(`${logPrefix} OAuth authorized but no access token found in credentials.`);
                throw new Error('OAuth token missing despite successful auth check.');
            }
             console.log(`${logPrefix} OAuth authorized.`);
        } catch (err) {
            // Error is already logged by the client (if from HTTP call) or thrown above
            throw err;
        }
    }
    
    // --- Determine Overall Status --- 
    const prerequisitesMet = allSecretsAvailable && oauthAuthorized;

    if (!prerequisitesMet) {
        // Construct SetupNeededResponse for Secrets/Actions *only if OAuth was authorized*
        // If OAuth failed, its specific setup response was already returned.
        const setupResponse: SetupNeededResponse = {
            success: true,
            data: {
                needs_setup: true,
                provider: config.provider,
                message: `Configuration required for ${config.provider}. Please provide the following details or confirm actions.`, 
                title: `Configure ${config.provider}`, 
                description: config.description,
                required_secret_inputs: requiredSecretInputs,
                required_action_confirmations: requiredActionConfirmations
            }
        };
        return { prerequisitesMet: false, setupNeededResponse: setupResponse };
    }

    console.log(`${logPrefix} All prerequisites met.`);
    // Return fetched credentials
    const credentials = {
        apiKey: fetchedApiKey,
        oauthToken: fetchedOauthToken
    };
    return { prerequisitesMet: true, credentials };
};

// Placeholder for API call logic
const makeApiCall = async (
    config: ExternalUtilityConfig, 
    params: Record<string, any>, // Explicitly type params
    credentials: any, 
    logPrefix: string
): Promise<any> => {
    if (!config.apiDetails) throw new Error("makeApiCall called without apiDetails in config");

    const { method, baseUrl, pathTemplate, paramMappings, staticHeaders } = config.apiDetails;
    let url = baseUrl + pathTemplate;
    const queryParams: Record<string, string> = {};
    let requestBody: any = null;
    const headers: Record<string, string> = { ...staticHeaders };

    // 1. Populate Path Parameters
    if (paramMappings?.path) {
        for (const [schemaKey, placeholder] of Object.entries(paramMappings.path)) {
            if (!params[schemaKey]) throw new Error(`Missing required path parameter: ${schemaKey}`);
            url = url.replace(`{${placeholder}}`, encodeURIComponent(params[schemaKey]));
        }
    }

    // 2. Populate Query Parameters
    if (paramMappings?.query) {
        for (const [schemaKey, queryConfig] of Object.entries(paramMappings.query)) {
            const paramValue = params[schemaKey];
            if (paramValue !== undefined && paramValue !== null) {
                let targetName: string;
                let value: any = paramValue;
                if (typeof queryConfig === 'string') {
                    targetName = queryConfig;
                } else {
                    const configObj = queryConfig as { target: string, transform?: 'joinComma' };
                    targetName = configObj.target;
                    if (configObj.transform === 'joinComma' && Array.isArray(value)) {
                        value = value.join(',');
                    }
                    // Add other transforms if needed
                }
                queryParams[targetName] = String(value);
            }
        }
    }

    // 3. Populate Body Parameters (assuming JSON body)
    if (paramMappings?.body) {
        requestBody = {};
        for (const [schemaKey, bodyFieldUntyped] of Object.entries(paramMappings.body)) {
            const bodyField = String(bodyFieldUntyped); // Ensure bodyField is a string
            const paramValue = params[schemaKey];
            if (paramValue !== undefined && paramValue !== null) {
                requestBody[bodyField] = params[schemaKey]; // Use string index
            }
        }
    }

    // 4. Add Authentication Header
    if (config.authMethod === AuthMethod.OAUTH) {
        if (!credentials.oauthToken) throw new Error("OAuth token missing for API call");
        headers['Authorization'] = `Bearer ${credentials.oauthToken}`;
    } else if (config.authMethod === AuthMethod.API_KEY) {
        if (!credentials.apiKey || !config.apiKeyDetails) throw new Error("API key or details missing for API call");
        const { scheme, headerName } = config.apiKeyDetails;
        switch (scheme) {
            case ApiKeyAuthScheme.BEARER:
                headers['Authorization'] = `Bearer ${credentials.apiKey}`;
                break;
            case ApiKeyAuthScheme.BASIC_USER:
                headers['Authorization'] = `Basic ${Buffer.from(`${credentials.apiKey}:`).toString('base64')}`;
                break;
            case ApiKeyAuthScheme.BASIC_PASS:
                 headers['Authorization'] = `Basic ${Buffer.from(`:${credentials.apiKey}`).toString('base64')}`;
                 break;
            case ApiKeyAuthScheme.HEADER:
                if (!headerName) throw new Error("Header name missing for API key scheme 'Header'");
                headers[headerName] = credentials.apiKey;
                break;
            default:
                 throw new Error(`Unsupported API key scheme: ${scheme}`);
        }
    }

    // Log request details (mask sensitive data if needed)
    console.log(`${logPrefix} Making API call: ${method} ${url}`);
    console.log(`${logPrefix} Headers:`, headers); // Be careful logging headers in production
    console.log(`${logPrefix} Query Params:`, queryParams);
    console.log(`${logPrefix} Body:`, requestBody);

    try {
        const response = await axios({
            method: method,
            url: url,
            params: queryParams,
            data: requestBody,
            headers: headers,
        });
        console.log(`${logPrefix} API response status: ${response.status}`);
        return response.data;
    } catch (error) {
        // Axios errors are caught and re-thrown to be handled by runToolExecution's catch block
        if (axios.isAxiosError(error)) {
            console.error(`${logPrefix} Axios error: Status ${error.response?.status}, Data:`, error.response?.data);
        }
        throw error; 
    }
}; 