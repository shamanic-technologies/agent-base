/**
 * User Controller
 *
 * Handles platform user validation.
 */
import { AsyncRequestHandler } from '../utils/types';
import { GetOrCreatePlatformUserInput, PlatformUser, ServiceResponse } from '@agent-base/types';
import { getOrCreateUserInDatabase } from '../utils/database'; // We will ensure this function exists and is correctly typed

interface ValidatePlatformUserInput {
  clerkUserId: string;
  // Add other optional fields if needed in the future, like email, displayName
}

/**
 * Validates a platform user by their Clerk User ID.
 * It will find an existing user linked to this clerkUserId or create a new one.
 * Returns the internal platformUserId.
 */
export const validatePlatformUserHandler: AsyncRequestHandler = async (req, res) => {
  const { clerkUserId } = req.body as ValidatePlatformUserInput;

  if (!clerkUserId) {
    console.log('[User Service] Missing clerkUserId in request body');
    return res.status(400).json({
      success: false,
      error: 'Missing required field: clerkUserId',
    });
  }

  try {
    // Prepare the input for the database utility function
    // We use clerkUserId as the providerUserId
    const getOrCreateInput: GetOrCreatePlatformUserInput = {
      providerUserId: clerkUserId,
      // We are not passing email, displayName, or profileImage from this endpoint initially
      // The database service's getOrCreatePlatformUserByProviderUserId can handle nulls for these
      email: null, 
      displayName: null,
      profileImage: null,
    };

    // Call the utility function that interacts with the API client for the database service
    const dbResponse: ServiceResponse<PlatformUser> = await getOrCreateUserInDatabase(getOrCreateInput);

    if (!dbResponse.success || !dbResponse.data) {
      console.error(`[User Service] Failed to get or create user for clerkUserId ${clerkUserId}: ${dbResponse.error}`);
      return res.status(500).json({
        success: false,
        error: dbResponse.error || 'Failed to process user validation',
      });
    }

    // Successfully found or created the user
    console.log(`[User Service] Successfully validated platform user for clerkUserId ${clerkUserId}, platformUserId: ${dbResponse.data.id}`);
    return res.json({
      success: true,
      data: {
        platformUserId: dbResponse.data.id, // Return only the platformUserId as requested
      },
    });

  } catch (error: any) {
    console.error(`[User Service] Unexpected error validating platform user for clerkUserId ${clerkUserId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during user validation',
    });
  }
}; 