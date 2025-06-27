/**
 * Secrets Controller
 * 
 * Contains handler functions for secret-related API endpoints.
 * Logic is migrated from the original Next.js API route handlers.
 */
import { Request, Response, NextFunction } from 'express';
import { getGsmClient } from '../lib/gsmClient.js';
import {
    generateSecretManagerId,
    GoogleSecretManagerConfigError,
    GoogleCloudSecretManagerApiError,
    SecretNotFoundError
} from '@agent-base/secret-client';
import {
    ErrorResponse,
    StoreSecretRequest,
    GetSecretRequest,
    CheckSecretRequest,
    SecretValue,
    SecretExists,
    ServiceResponse,
    UserType,
    UtilityProvider,
    UtilitySecretType,
    HumanInternalCredentials,
    InternalCredentials
} from '@agent-base/types';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Handles POST /api/secrets
 * Stores a secret using the Google Secret Manager client.
 */
export async function storeSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storeRequest: StoreSecretRequest = req.body;
        const { platformUserId, platformOrganizationId, clientUserId, clientOrganizationId } = (req as AuthenticatedRequest);
        const { userType, secretType, secretUtilityProvider, secretUtilitySubProvider, secretValue } = storeRequest;
        
        if (!userType || !secretType || secretValue === undefined || secretValue === null || !secretUtilityProvider) {
            console.error('Missing required fields:', storeRequest);
            const errorResponse: ErrorResponse = { success: false, error: 'Missing required fields: userType, secretType, secretValue, secretUtilityProvider.' };
            res.status(400).json(errorResponse);
            return;
        }
        
        const userId = userType === UserType.Platform ? platformUserId : clientUserId;
        if (!userId) {
            console.error('User ID could not be determined:', storeRequest);
            const errorResponse: ErrorResponse = { success: false, error: 'User ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }
        const organizationId = userType === UserType.Platform ? platformOrganizationId : clientOrganizationId;
        if (!organizationId) {
            console.error('Organization ID could not be determined:', storeRequest);
            const errorResponse: ErrorResponse = { success: false, error: 'Organization ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }

        const gsmClient = getGsmClient();
        const secretIdToStore = generateSecretManagerId(
            userType,
            userId,
            organizationId,
            secretUtilityProvider, 
            secretType,
            secretUtilitySubProvider
        );

        await gsmClient.storeSecret(secretIdToStore, secretValue);

        const response: ServiceResponse<string> = { success: true, data: `Secret stored successfully with ID: ${secretIdToStore}` };
        res.status(201).json(response); // 201 for created/updated resource

    } catch (error: any) {
        console.error('Error storing secret:', error);
        if (error instanceof GoogleSecretManagerConfigError) {
            res.status(400).json({ success: false, error: `Configuration error: ${error.message}` });
        } else if (error instanceof GoogleCloudSecretManagerApiError) {
            res.status(500).json({ success: false, error: `GSM API error: ${error.message}` });
        } else {
            next(error); // Pass to global error handler
        }
    }
}

/**
 * Handles GET /api/secrets/:secretTypeParam
 * Retrieves a secret using the Google Secret Manager client.
 */
export async function getSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const secretTypeParam: UtilitySecretType = req.params.secretType as UtilitySecretType;
        const userType: UserType = req.query.userType as UserType;
        const secretUtilityProvider: UtilityProvider = req.query.secretUtilityProvider as UtilityProvider;
        const secretUtilitySubProvider: string | undefined = req.query.secretUtilitySubProvider as string | undefined;
        console.debug('➡️ getSecretHandler', secretTypeParam, userType, secretUtilityProvider, secretUtilitySubProvider, null, 2);
        const { platformUserId, platformOrganizationId, clientUserId, clientOrganizationId } = (req as AuthenticatedRequest);
        console.debug('➡️ getSecretHandler', platformUserId, platformOrganizationId, clientUserId, clientOrganizationId, null, 2);
        
        if (!userType || !secretTypeParam || !secretUtilityProvider) {
            const errorResponse: ErrorResponse = { success: false, error: 'Missing required query parameters: userType, secretTypeParam (in path), secretUtilityProvider.' };
            res.status(400).json(errorResponse);
            return;
        }

        const userId = userType === UserType.Platform ? platformUserId : clientUserId;
        if (!userId) {
            const errorResponse: ErrorResponse = { success: false, error: 'User ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }
        const organizationId = userType === UserType.Platform ? platformOrganizationId : clientOrganizationId;
        if (!organizationId) {
            console.error('Organization ID could not be determined:', req.query);
            const errorResponse: ErrorResponse = { success: false, error: 'Organization ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }

        const gsmClient = getGsmClient();
        const secretIdToGet = generateSecretManagerId(
            userType,
            userId,
            organizationId,
            secretUtilityProvider,
            secretTypeParam,
            secretUtilitySubProvider
        );
        console.debug('➡️ getSecretHandler', secretIdToGet, null, 2);
        
        const secretValue = await gsmClient.getSecret(secretIdToGet);
        console.debug('➡️ getSecretHandler', secretValue, null, 2);
        
        if (secretValue === null) {
            const errorResponse: ErrorResponse = { success: false, error: 'Secret not found.' };
            res.status(404).json(errorResponse);
            return;
        }

        const response: ServiceResponse<SecretValue> = { success: true, data: { value: secretValue } };
        res.status(200).json(response);

    } catch (error: any) {
        console.error('Error getting secret:', error);
         if (error instanceof GoogleCloudSecretManagerApiError) {
            res.status(500).json({ success: false, error: `GSM API error: ${error.message}` });
        } else {
            next(error);
        }
    }
}

/**
 * Handles GET /api/secrets/exists/:secretTypeParam
 * Checks if a secret exists using the Google Secret Manager client.
 */
export async function checkSecretExistsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const secretTypeParam: UtilitySecretType = req.params.secretType as UtilitySecretType;
        const userType: UserType = req.query.userType as UserType;
        const secretUtilityProvider: UtilityProvider = req.query.secretUtilityProvider as UtilityProvider;
        const secretUtilitySubProvider: string | undefined = req.query.secretUtilitySubProvider as string | undefined;

        const { platformUserId, platformOrganizationId, clientUserId, clientOrganizationId } = (req as AuthenticatedRequest);

        if (!userType || !secretTypeParam || !secretUtilityProvider) {
            const errorResponse: ErrorResponse = { success: false, error: 'Missing required query parameters: userType, secretTypeParam (in path), secretUtilityProvider.' };
            res.status(400).json(errorResponse);
            return;
        }

        const userId = userType === UserType.Platform ? platformUserId : clientUserId;
        if (!userId) {
            const errorResponse: ErrorResponse = { success: false, error: 'User ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }
        const organizationId = userType === UserType.Platform ? platformOrganizationId : clientOrganizationId;
        if (!organizationId) {
            console.error('Organization ID could not be determined:', req.query);
            const errorResponse: ErrorResponse = { success: false, error: 'Organization ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }

        const gsmClient = getGsmClient();
        const secretIdToCheck = generateSecretManagerId(
            userType,
            userId,
            organizationId,
            secretUtilityProvider,
            secretTypeParam,
            secretUtilitySubProvider
        );

        const exists = await gsmClient.secretExists(secretIdToCheck);

        const response: ServiceResponse<SecretExists> = { success: true, data: { exists } };
        res.status(200).json(response);

    } catch (error: any) {
        console.error('Error checking secret existence:', error);
        if (error instanceof GoogleCloudSecretManagerApiError) {
            res.status(500).json({ success: false, error: `GSM API error: ${error.message}` });
        } else {
            next(error);
        }
    }
}

/**
 * Handles DELETE /api/secrets/:secretType
 * Deletes a secret using the Google Secret Manager client.
 */
export async function deleteSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const secretTypeParam: UtilitySecretType = req.params.secretType as UtilitySecretType;
        const userType: UserType = req.query.userType as UserType;
        const secretUtilityProvider: UtilityProvider = req.query.secretUtilityProvider as UtilityProvider;
        const secretUtilitySubProvider: string | undefined = req.query.secretUtilitySubProvider as string | undefined;

        const { platformUserId, platformOrganizationId, clientUserId, clientOrganizationId } = (req as AuthenticatedRequest);

        if (!userType || !secretTypeParam || !secretUtilityProvider) {
            const errorResponse: ErrorResponse = { success: false, error: 'Missing required query parameters: userType, secretTypeParam (in path), secretUtilityProvider.' };
            console.error('deleteSecretHandler', errorResponse, null, 2);
            res.status(400).json(errorResponse);
            return;
        }

        const userId = userType === UserType.Platform ? platformUserId : clientUserId;
        if (!userId) {
            const errorResponse: ErrorResponse = { success: false, error: 'User ID could not be determined.' };
            console.error('deleteSecretHandler', errorResponse, null, 2);
            res.status(400).json(errorResponse);
            return;
        }
        const organizationId = userType === UserType.Platform ? platformOrganizationId : clientOrganizationId;
        if (!organizationId) {
            console.error('Organization ID could not be determined:', req.query);
            const errorResponse: ErrorResponse = { success: false, error: 'Organization ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }

        const gsmClient = getGsmClient();
        const secretIdToDelete = generateSecretManagerId(
            userType,
            userId,
            organizationId,
            secretUtilityProvider,
            secretTypeParam,
            secretUtilitySubProvider
        );

        await gsmClient.deleteSecret(secretIdToDelete);

        const response: ServiceResponse<boolean> = { success: true, data: true };
        res.status(200).json(response);

    } catch (error: any) {
        console.error('Error deleting secret:', error);
        if (error instanceof SecretNotFoundError) {
            res.status(404).json({ success: false, error: error.message });
        } else if (error instanceof GoogleCloudSecretManagerApiError) {
            res.status(500).json({ success: false, error: `GSM API error: ${error.message}` });
        } else {
            next(error);
        }
    }
} 