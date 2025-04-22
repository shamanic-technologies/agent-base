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
    UserType,
    ServiceCredentials,
    UtilityProvider,
    UtilitySecretType
} from '@agent-base/types'; // Import shared types
import { getAuthHeaders } from '@agent-base/api-client';


/**
 * Handles POST /api/secrets
 * Stores a secret using the Google Secret Manager library.
 */
export async function storeSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract request body, now including userId directly
        const storeRequest: StoreSecretRequest = req.body;
        const serviceCredentialsResponse : ServiceResponse<ServiceCredentials> = await getAuthHeaders(req);
        if (!serviceCredentialsResponse.success) {
          console.error('Error getting service credentials:', serviceCredentialsResponse.error);
          res.status(400).json(serviceCredentialsResponse);
          return;
        }
        const { platformUserId, clientUserId, platformApiKey } = serviceCredentialsResponse.data;
        const { userType, secretType, secretUtilityProvider, secretValue } = storeRequest; // Destructure userId from body
        const userId = userType === UserType.Platform ? platformUserId : clientUserId;

        // Check for missing userId (now expected in body)
        if (!userId) {
            console.error('Missing userId in request body');
            const errorResponse: ErrorResponse = { success: false, error: 'userId is required in the request body' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType
        if (!secretType) {
            console.error('Missing secretType in request body');
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required' };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretValue
        if (secretValue === undefined || secretValue === null) {
            console.error('Missing secretValue in request body');
            const errorResponse: ErrorResponse = { success: false, error: 'secretValue is required' };
            res.status(400).json(errorResponse);
            return; 
        }

        if (!secretUtilityProvider) {
            console.error('Missing secretUtilityProvider in request body');
            const errorResponse: ErrorResponse = { success: false, error: 'secretUtilityProvider is required' };
            res.status(400).json(errorResponse);
            return; 
        }
        

        // --- Call Library Function --- //
        // Pass the request object from the body
        const storeResponse: ServiceResponse<string> = await GsmLib.storeSecret(storeRequest, userId);

        // --- Handle Response --- //
        if (!storeResponse.success) {
            console.error('Error storing secret:', storeResponse.error);
            const errorResponse: ErrorResponse = { success: false, error: storeResponse.error || 'Failed to store secret' };
            res.status(500).json(errorResponse);
            return; 
        }

        // --- Success Response --- //
        const response: ServiceResponse<string> = { success: true, data: storeResponse.data };
        res.status(200).json(response);

    } catch (error) {
        console.error('Error storing secret:', error);
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
        const secretType: UtilitySecretType = req.params.secretType as UtilitySecretType;
        // Extract userType from query parameters
        const userType : UserType = req.query.userType as UserType;
        const secretUtilityProvider: UtilityProvider = req.query.secretUtilityProvider as UtilityProvider;
        
        const serviceCredentialsResponse : ServiceResponse<ServiceCredentials> = await getAuthHeaders(req);
        if (!serviceCredentialsResponse.success) {
          console.error('Error getting service credentials:', serviceCredentialsResponse.error);
          res.status(400).json(serviceCredentialsResponse);
          return;
        }
        const { platformUserId, clientUserId, platformApiKey } = serviceCredentialsResponse.data;
        const userId = userType === UserType.Platform ? platformUserId : clientUserId;


        // Check for missing user ID in header
        if (!userId) {
            console.error('Missing userId in header');
            const errorResponse: ErrorResponse = { success: false, error: `userId is required in header for userType ${userType}` };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType (from path param)
        if (!secretType) {
            console.error('Missing secretType in URL path');
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required in URL path' };
            res.status(400).json(errorResponse);
            return; 
        }

        // --- Prepare Request for Library --- //
        // Create request object conforming to GetSecretRequest type
        const getRequest: GetSecretRequest = { userType, secretUtilityProvider, secretType };

        // --- Call Library Function --- //
        const getResponse: ServiceResponse<SecretValue> = await GsmLib.getSecret(getRequest, userId);

        // --- Handle Response --- //
        if (!getResponse.success) {
            console.error('Error getting secret:', getResponse.error);
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
        const secretType: UtilitySecretType = req.params.secretType as UtilitySecretType;
        // Extract userType from query parameters
        const userType: UserType = req.query.userType as UserType;
        const secretUtilityProvider: UtilityProvider = req.query.secretUtilityProvider as UtilityProvider;
        
        const serviceCredentialsResponse : ServiceResponse<ServiceCredentials> = await getAuthHeaders(req);
        if (!serviceCredentialsResponse.success) {
          console.error('Error getting service credentials:', serviceCredentialsResponse.error);
          res.status(400).json(serviceCredentialsResponse);
          return;
        }
        const { platformUserId, clientUserId, platformApiKey } = serviceCredentialsResponse.data;
        const userId = userType === UserType.Platform ? platformUserId : clientUserId;

        // Check for missing user ID in header
        if (!userId) {
            console.error('Missing userId in header');
            const errorResponse: ErrorResponse = { success: false, error: `userId is required in header for userType ${userType}` };
            res.status(400).json(errorResponse);
            return; 
        }

        // Check for missing secretType (from path param)
        if (!secretType) {
            console.error('Missing secretType in URL path');
            const errorResponse: ErrorResponse = { success: false, error: 'secretType is required in URL path' };
            res.status(400).json(errorResponse);
            return; 
        }

        // --- Prepare Request for Library --- //
        // Create request object conforming to CheckSecretRequest type
        const checkRequest: CheckSecretRequest = { userType, secretUtilityProvider, secretType };

        // --- Call Library Function --- //
        const checkResponse: ServiceResponse<SecretExists> = await GsmLib.checkSecretExists(checkRequest, userId);

        // --- Handle Response --- //
        if (!checkResponse.success) {
            console.error('Error checking secret existence:', checkResponse.error);
            const errorResponse: ErrorResponse = { success: false, error: checkResponse.error || 'Failed to check secret existence' };
            res.status(500).json(errorResponse);
            return; 
        }

        // --- Success Response --- //
        const response: ServiceResponse<SecretExists> = { success: true, data: checkResponse.data };
        res.status(200).json(response);

    } catch (error) {
        console.error('Error checking secret existence:', error);
        next(error);
    }
} 