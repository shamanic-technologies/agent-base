import {
    ExternalUtilityTool,
    ExternalUtilityExecutionResponse,
    SuccessResponse,
    ErrorResponse,
} from '@agent-base/agents';
import axios from 'axios';

// Import functions from the new services
import { validateInputParameters } from './validationService';
import { checkPrerequisites } from './prerequisiteService';
import { makeApiCall } from './apiCallService';

/**
 * Handles the full execution flow for a given tool configuration.
 * Orchestrates validation, prerequisite checks, and API calls by delegating to other services.
 * @param config The tool configuration.
 * @param userId The user ID.
 * @param params The raw input parameters.
 * @param logPrefix Logging prefix.
 * @returns The result of the execution (Success, Error, or SetupNeeded).
 */
export const handleExecution = async (
    config: ExternalUtilityTool,
    userId: string,
    params: Record<string, any>,
    logPrefix: string
): Promise<ExternalUtilityExecutionResponse> => {
    try {
        // 1. Validate Input Parameters (using validationService)
        const validationResult = validateInputParameters(config, params, logPrefix);
        if ('success' in validationResult && !validationResult.success) {
            return validationResult; // Return ErrorResponse directly
        }
        // Type assertion is safe because we checked for error case above
        const validatedParams = (validationResult as { validatedParams: Record<string, any> }).validatedParams;

        // 2. Check Prerequisites (using prerequisiteService)
        const prereqResult = await checkPrerequisites(config, userId, logPrefix);
        if (!prereqResult.prerequisitesMet) {
            console.log(`${logPrefix} Prerequisites not met. Returning setup needed response.`);
            // Non-null assertion is safe here due to prerequisitesMet check
            return prereqResult.setupNeededResponse!;
        }
        // Type assertion needed as credentials might be undefined if prerequisitesMet is false
        const credentials = prereqResult.credentials!;

        // 3. Execute API Call (if defined, using apiCallService)
        if (!config.apiDetails) {
            console.log(`${logPrefix} No apiDetails defined. Prerequisites met. Returning success.`);
            const successResponse: SuccessResponse<{ message: string }> = {
                success: true,
                data: { message: "Prerequisites met. No API call required for this tool." }
            };
            return successResponse;
        }

        console.log(`${logPrefix} Prerequisites met. Proceeding with API call.`);
        const apiResult = await makeApiCall(config, validatedParams, credentials, logPrefix);

        // 4. Format and Return Success Response
        const successResponse: SuccessResponse<any> = {
            success: true,
            data: apiResult
        };
        console.log(`${logPrefix} API call successful. Returning result.`);
        return successResponse;

    } catch (error) {
        // This catch block now primarily handles errors from prerequisite/API call services
        // or unexpected orchestration errors.
        console.error(`${logPrefix} Error during execution handling:`, error);
        // Format error into ErrorResponse
        let errorResponse: ErrorResponse;
        // Keep Axios error check for detailed API error reporting
        if (axios.isAxiosError(error)) {
             const status = error.response?.status || 500;
             // Adjust based on expected API error structure from external services
             const apiError = error.response?.data?.error || error.response?.data || {}; 
             errorResponse = {
                success: false,
                error: `External API Error (${status}): ${apiError.message || JSON.stringify(apiError) || error.message}`,
                details: JSON.stringify(apiError) // Keep original details if possible
             };
        } else if (error instanceof Error) {
            // Errors thrown by checkPrerequisites or makeApiCall directly
            errorResponse = {
                success: false,
                error: `Tool Execution Failed: ${error.message}`,
                details: error.stack
            };
        } else {
            // Unknown errors
             errorResponse = {
                success: false,
                error: 'An unknown error occurred during tool execution orchestration.'
             };
        }
        console.log(`${logPrefix} Returning error response from handleExecution:`, errorResponse);
        return errorResponse;
    }
}; 