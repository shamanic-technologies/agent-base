/**
 * Secrets API Router
 * 
 * Defines routes related to managing secrets:
 * - POST /      : Store a new secret
 * - GET /:secretType : Get a secret by type
 * - GET /exists/:secretType : Check if a secret exists by type
 */
import { Router } from 'express';
import * as secretsController from '../controllers/secretsController'; // Import controller functions

// Initialize the secrets router
const router = Router();

/**
 * @route POST /api/secrets
 * @description Stores a secret value associated with a user and type.
 * @access Private (Requires valid x-user-id header - *** NEEDS PROPER AUTH ***)
 * @requestBody { secretType: string, secretValue: any }
 * @response 200 { success: true, data: string } - Success message
 * @response 400 { success: false, error: string } - Missing parameters
 * @response 500 { success: false, error: string, details?: string } - Server error
 */
router.post('/', secretsController.storeSecretHandler);

/**
 * @route GET /api/secrets/:secretType
 * @description Retrieves a secret value for a given user and type.
 * @access Private (Requires valid x-user-id header - *** NEEDS PROPER AUTH ***)
 * @urlParam secretType - The type identifier of the secret.
 * @response 200 { success: true, data: SecretValue } - Secret value
 * @response 400 { success: false, error: string } - Missing parameters
 * @response 404 { success: false, error: string } - Secret not found
 * @response 500 { success: false, error: string, details?: string } - Server error
 */
router.get('/:secretType', secretsController.getSecretHandler);

/**
 * @route GET /api/secrets/exists/:secretType
 * @description Checks if a secret exists for a given user and type.
 * @access Private (Requires valid x-user-id header - *** NEEDS PROPER AUTH ***)
 * @urlParam secretType - The type identifier of the secret.
 * @response 200 { success: true, data: { exists: boolean } } - Existence status
 * @response 400 { success: false, error: string } - Missing parameters
 * @response 500 { success: false, error: string, details?: string } - Server error
 */
router.get('/exists/:secretType', secretsController.checkSecretExistsHandler);

// Export the secrets router
export default router; 