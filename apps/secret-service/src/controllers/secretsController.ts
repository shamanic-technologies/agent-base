/**
 * Secrets Controller
 * 
 * Contains handler functions for secret-related API endpoints.
 * Logic is migrated from the original Next.js API route handlers.
 */
import { Request, Response, NextFunction } from 'express';
import * as GsmLib from '../lib/google-secret-manager'; // Import Google Secret Manager library functions
import { 
    ErrorResponse, 
    StoreSecretRequest, 
    GetSecretRequest, 
    CheckSecretRequest, 
    SecretValue, 
    SecretExists, 
    ServiceResponse,
    UserType // Import UserType
} from '@agent-base/types'; // Import shared types

/**
 * Extracts User ID from the relevant request header based on UserType.
 * Assumes the corresponding header is correctly populated by an upstream service (e.g., API Gateway).
 * 
 * @param req Express Request object
 * @param userType The type of user ('platform' or 'client')
 * @returns The user ID string or null if not found or invalid userType
 */
function getUserIdFromHeader(req: Request, userType: UserType): string | null {
    let userIdHeader: string | undefined | string[];
    // Select the correct header based on userType
    if (userType === UserType.Platform) {
        userIdHeader = req.headers['x-platform-user-id'];
    } else if (userType === UserType.Client) {
        userIdHeader = req.headers['x-client-user-id'];
    } else {
        // Invalid userType provided
        console.warn(`Invalid userType received: ${userType}`);
        return null;
    }
    
    // Return the header value if it's a string, otherwise null
    return typeof userIdHeader === 'string' ? userIdHeader : null;
}

/**
 * Validates the UserType enum.
 * 
 * @param userType The userType value to validate.
 * @returns True if valid, false otherwise.
 */
function isValidUserType(userType: any): userType is UserType {
    return userType === UserType.Platform || userType === UserType.Client;
}

/**
 * Handles POST /api/secrets
 * Stores a secret using the Google Secret Manager library.
 */
export async function storeSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract request body, now including userId directly
        const body: StoreSecretRequest = req.body;
        const { userType, userId, secretType, secretValue } = body; // Destructure userId from body

        // --- Input Validation --- //
        // Check for valid userType
        if (!isValidUserType(userType)) {
            const errorResponse: ErrorResponse = { success: false, error: 'Invalid userType provided' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing userId (now expected in body)
        if (!userId) {
            const errorResponse: ErrorResponse = { success: false, error: 'userId is required in the request body' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType
        if (!secretType) {
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretValue
        if (secretValue === undefined || secretValue === null) {
            const errorResponse: ErrorResponse = { success: false, error: 'secretValue is required' };
            res.status(400).json(errorResponse);
            return; 
        }
        
        // --- Prepare Request for Library --- //
        // The request body now directly matches the StoreSecretRequest type
        const storeRequest: StoreSecretRequest = body;

        // --- Call Library Function --- //
        // Pass the request object from the body
        const storeResponse = await GsmLib.storeSecret(storeRequest);

        // --- Handle Response --- //
        if (!storeResponse.success) {
            const errorResponse: ErrorResponse = { success: false, error: storeResponse.error || 'Failed to store secret' };
            res.status(500).json(errorResponse);
            return; 
        }

        // --- Success Response --- //
        const response: ServiceResponse<string> = { success: true, data: storeResponse.data };
        res.status(200).json(response);

    } catch (error) {
        next(error);
    }
}

/**
 * Handles GET /api/secrets/:secretType
 * Retrieves a secret using the Google Secret Manager library.
 * Reads userType from query parameters and userId from headers.
 */
export async function getSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract secretType from URL parameters
        const secretType = req.params.secretType;
        // Extract userType from query parameters
        const userTypeQuery = req.query.userType as string | undefined;
        
        // --- Input Validation --- //
        // Validate and cast userType from query param
        let userType: UserType;
        if (userTypeQuery?.toLowerCase() === 'platform') {
            userType = UserType.Platform;
        } else if (userTypeQuery?.toLowerCase() === 'client') {
            userType = UserType.Client;
        } else {
            const errorResponse: ErrorResponse = { success: false, error: 'Valid userType (platform or client) is required as a query parameter' };
            res.status(400).json(errorResponse);
            return; 
        }
        
        // Extract user ID based on the validated userType
        const userId = getUserIdFromHeader(req, userType);
        const requiredHeader = userType === UserType.Platform ? 'x-platform-user-id' : 'x-client-user-id';

        // Check for missing user ID in header
        if (!userId) {
            const errorResponse: ErrorResponse = { success: false, error: `userId is required in ${requiredHeader} header for userType ${userType}` };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType (from path param)
        if (!secretType) {
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required in URL path' };
            res.status(400).json(errorResponse);
            return; 
        }

        // --- Prepare Request for Library --- //
        // Create request object conforming to GetSecretRequest type
        const getRequest: GetSecretRequest = { userType, userId, secretType };

        // --- Call Library Function --- //
        const getResponse = await GsmLib.getSecret(getRequest);

        // --- Handle Response --- //
        if (!getResponse.success) {
            const errorResponse: ErrorResponse = { success: false, error: getResponse.error || 'Secret not found' };
            const statusCode = (getResponse.error || '').toLowerCase().includes('not found') ? 404 : 500;
            res.status(statusCode).json(errorResponse);
            return; 
        }

        // --- Success Response --- //
        const response: ServiceResponse<SecretValue> = { success: true, data: getResponse.data };
        res.status(200).json(response);

    } catch (error) {
        next(error);
    }
}

/**
 * Handles GET /api/secrets/exists/:secretType
 * Checks if a secret exists using the Google Secret Manager library.
 * Reads userType from query parameters and userId from headers.
 */
export async function checkSecretExistsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract secretType from URL parameters
        const secretType = req.params.secretType;
        // Extract userType from query parameters
        const userTypeQuery = req.query.userType as string | undefined;
        
        // --- Input Validation --- //
        // Validate and cast userType from query param
        let userType: UserType;
        if (userTypeQuery?.toLowerCase() === 'platform') {
            userType = UserType.Platform;
        } else if (userTypeQuery?.toLowerCase() === 'client') {
            userType = UserType.Client;
        } else {
            const errorResponse: ErrorResponse = { success: false, error: 'Valid userType (platform or client) is required as a query parameter' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Extract user ID based on the validated userType
        const userId = getUserIdFromHeader(req, userType);
        const requiredHeader = userType === UserType.Platform ? 'x-platform-user-id' : 'x-client-user-id';

        // Check for missing user ID in header
        if (!userId) {
             const errorResponse: ErrorResponse = { success: false, error: `userId is required in ${requiredHeader} header for userType ${userType}` };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType (from path param)
        if (!secretType) {
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required in URL path' };
            res.status(400).json(errorResponse);
            return; 
        }

        // --- Prepare Request for Library --- //
        // Create request object conforming to CheckSecretRequest type
        const checkRequest: CheckSecretRequest = { userType, userId, secretType };

        // --- Call Library Function --- //
        const checkResponse = await GsmLib.checkSecretExists(checkRequest);

        // --- Handle Response --- //
        if (!checkResponse.success) {
            const errorResponse: ErrorResponse = { success: false, error: checkResponse.error || 'Failed to check secret existence' };
            res.status(500).json(errorResponse);
            return; 
        }

        // --- Success Response --- //
        const response: ServiceResponse<SecretExists> = { success: true, data: checkResponse.data };
        res.status(200).json(response);

    } catch (error) {
        next(error);
    }
} 