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
import { getAuthHeaders } from '@agent-base/api-client';

/**
 * Handles POST /api/secrets
 * Stores a secret using the Google Secret Manager client.
 */
export async function storeSecretHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storeRequest: StoreSecretRequest = req.body;
        const serviceCredentialsResponse: ServiceResponse<InternalCredentials> = await getAuthHeaders(req);

        if (!serviceCredentialsResponse.success || !serviceCredentialsResponse.data) {
            console.error('Error getting service credentials or data missing:', serviceCredentialsResponse.error);
            res.status(401).json({ success: false, error: 'Authentication failed or user data missing.' });
            return;
        }
        const { platformUserId, clientUserId, clientOrganizationId } = serviceCredentialsResponse.data;
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
        if (!clientOrganizationId) {
            console.error('Client organization ID could not be determined:', storeRequest);
            const errorResponse: ErrorResponse = { success: false, error: 'Client organization ID could not be determined.' };
            res.status(400).json(errorResponse);
            return;
        }

        const gsmClient = getGsmClient();
        const secretIdToStore = generateSecretManagerId(
            userType,
            userId,
            organizationId: clientOrganizationId,
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
        
        const serviceCredentialsResponse: ServiceResponse<ServiceCredentials> = await getAuthHeaders(req);

        if (!serviceCredentialsResponse.success || !serviceCredentialsResponse.data) {
            console.error('Error getting service credentials or data missing:', serviceCredentialsResponse.error);
            res.status(401).json({ success: false, error: 'Authentication failed or user data missing.' });
            return;
        }
        const { platformUserId, clientUserId } = serviceCredentialsResponse.data;

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

        const gsmClient = getGsmClient();
        const secretIdToGet = generateSecretManagerId(
            userType,
            userId,
            secretUtilityProvider,
            secretTypeParam,
            secretUtilitySubProvider
        );
        
        const secretValue = await gsmClient.getSecret(secretIdToGet);

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

        const serviceCredentialsResponse: ServiceResponse<ServiceCredentials> = await getAuthHeaders(req);

        if (!serviceCredentialsResponse.success || !serviceCredentialsResponse.data) {
            console.error('Error getting service credentials or data missing:', serviceCredentialsResponse.error);
            res.status(401).json({ success: false, error: 'Authentication failed or user data missing.' });
            return;
        }
        const { platformUserId, clientUserId } = serviceCredentialsResponse.data;

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
        
        const gsmClient = getGsmClient();
        const secretIdToCheck = generateSecretManagerId(
            userType,
            userId,
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