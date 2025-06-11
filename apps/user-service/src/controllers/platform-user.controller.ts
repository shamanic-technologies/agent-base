/**
 * User Controller
 *
 * Handles platform user validation.
 */
import { AsyncRequestHandler } from '../utils/types';
import { GetOrCreatePlatformUserInput, PlatformUser, ServiceResponse } from '@agent-base/types';
import { getOrCreatePlatformUserInDatabase } from '../utils/database'; // We will ensure this function exists and is correctly typed

interface ValidateAuthUserInput {
  platformAuthUserId: string;
  // Add other optional fields if needed in the future, like email, displayName
}

/**
 * Validates a platform user by their authUserId.
 * It will find an existing user linked to this authUserId or create a new one.
 * Returns the internal platformUserId.
 */
export const validatePlatformAuthUserHandler: AsyncRequestHandler = async (req, res) => {
  // Check if req.body exists
  if (!req.body) {
    console.log('[User Service] Request body is missing or undefined');
    return res.status(400).json({
      success: false,
      error: 'Request body is missing',
    });
  }

  const { platformAuthUserId } = req.body as ValidateAuthUserInput;

  if (!platformAuthUserId) {
    console.log('[User Service] Missing platformAuthUserId in request body');
    return res.status(400).json({
      success: false,
      error: 'Missing required field: platformAuthUserId',
    });
  }

  try {
    // Prepare the input for the database utility function
    // We use clerkUserId as the providerUserId
    const getOrCreateInput: GetOrCreatePlatformUserInput = {
      platformAuthUserId,
      // We are not passing email, displayName, or profileImage from this endpoint initially
      // The database service's getOrCreatePlatformUserByProviderUserId can handle nulls for these
      email: undefined, 
      displayName: undefined,
      profileImage: undefined,
    };

    // Call the utility function that interacts with the API client for the database service
    const dbResponse: ServiceResponse<PlatformUser> = await getOrCreatePlatformUserInDatabase(getOrCreateInput);

    if (!dbResponse.success) {
      console.error(`[User Service] Failed to get or create user for platformAuthUserId ${platformAuthUserId}: ${dbResponse.error}`);
      return res.status(500).json({
        success: false,
        error: dbResponse.error || 'Failed to process user validation',
      });
    }

    // Successfully found or created the user
    return res.json({
      success: true,
      data: {
        platformUserId: dbResponse.data.id, // Return only the platformUserId as requested
      },
    });

  } catch (error: any) {
    console.error(`[User Service] Unexpected error validating platform user for platformAuthUserId ${platformAuthUserId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during user validation',
    });
  }
}; 