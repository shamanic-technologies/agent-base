/**
 * Check Auth API Endpoint
 * 
 * Checks if a user has the required OAuth scopes and returns authentication URL if needed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, OAuth, GetUserOAuthInput } from '@/lib/database';
import { 
   OAuthProvider,
   ServiceResponse,
   CheckUserOAuth,
   // CheckAuthSuccessData,
   // CheckAuthNeededData,
} from '@agent-base/types';

// Local type definitions for this endpoint's specific responses
interface CheckAuthSuccessData {
  hasAuth: true;
  oauthCredentials: OAuth[];
}

interface CheckAuthNeededData {
  hasAuth: false;
  authUrl: string;
}

/**
 * Checks if the user has authorized the required scopes for a tool
 * If not, returns an auth URL for the frontend to redirect to
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId, organizationId, oauthProvider, requiredScopes }: GetUserOAuthInput = await req.json();

    // Basic validation (kept concise)
    if (!userId || !organizationId || !oauthProvider || !requiredScopes || !Array.isArray(requiredScopes) || requiredScopes.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Missing or invalid parameters (userId, organizationId, oauthProvider, requiredScopes)" 
      }, { status: 400 });
    }

    // Check if we already have valid credentials with required scopes for this user
    const authResult = await checkUserAuth({ userId, organizationId, oauthProvider, requiredScopes });

    // 1. Check for explicit failure from checkUserAuth (e.g., database service error)
    if (!authResult.success) {
      console.error(`checkUserAuth failed for user ${userId}: ${authResult.error}`);
      // Return a server error status, indicating the check itself failed
      return NextResponse.json({ 
        success: false, 
        error: authResult.error || "Failed to check authentication status."
      }, { status: 500 }); // Use 500 for internal errors
    }

    // 2. If checkUserAuth succeeded, check if authentication is valid
    if (authResult.data?.valid) {
      // User is authenticated, return success response with credentials
      const responseData: ServiceResponse<CheckAuthSuccessData> = {
        success: true,
        data: {
          hasAuth: true,
          oauthCredentials: authResult.data.oauthCredentials!
        }
      };
      return NextResponse.json(responseData);
    } else {
      // User is not authenticated or lacks scopes, return needs-auth response
      const callbackUrl = encodeURIComponent(`${process.env.BASE_URL}/auth/callback?userId=${userId}`);
      const scopeString = encodeURIComponent(requiredScopes.join(' '));
      const authUrl = `${process.env.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}&scopes=${scopeString}`;
      
      const responseData: ServiceResponse<CheckAuthNeededData> = {
        success: true, // The check operation succeeded, but the user needs auth
        data: {
          hasAuth: false,
          authUrl
        }
      };
      return NextResponse.json(responseData); // 200 OK is correct here
    }

  } catch (error) {
    // Catch unexpected errors in the POST handler itself
    console.error('Unexpected error in POST /api/check-auth:', error);
    const errorResponse: ServiceResponse<never> = { 
      success: false,
      error: "Internal server error" 
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Checks if a user has valid credentials with the required scopes
 */
async function checkUserAuth(input: GetUserOAuthInput): Promise<ServiceResponse<CheckUserOAuth>> {
  const { userId, organizationId, oauthProvider, requiredScopes } = input;
  try {
    console.log(`Checking auth for user ${userId} in org ${organizationId} with provider ${oauthProvider} and scopes: ${requiredScopes.join(', ')}`);

    // Get credentials from database service
    const result = await getCredentials(input);
    console.log('Database service call result:', JSON.stringify(result, null, 2));

    // Explicitly check for failure from the service call
    if (!result.success) {
      // Log the specific error returned by the database service if available
      const errorMessage = result.error || 'Unknown error fetching credentials';
      console.error(`Error fetching credentials for user ${userId} (provider: ${oauthProvider}): ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }

    const credentials = result.data;

    // Handle case where success is true but no data is returned (shouldn't happen with current types, but good practice)
    if (!credentials || credentials.length === 0) {
      console.log(`No credentials found for user ${userId} with provider ${oauthProvider}`);
      return { 
        success: true,
        data: {
          valid: false,
          oauthCredentials: [] // Changed to oauthCredentials
        }
      };
    }

    // Check if the returned credentials cover all required scopes.
    // Note: This check might be redundant if the database service already filters by scope correctly.
    // Keeping it for safety unless confirmed otherwise.
    const currentScopes = new Set(credentials.flatMap(cred => cred.scope ? cred.scope.split(' ') : [])); // Handle potential scope string format
    const hasAllScopes = requiredScopes.every(scope => currentScopes.has(scope));

    if (!hasAllScopes) {
      console.log(`User ${userId} has credentials but is missing required scopes: ${requiredScopes.filter(s => !currentScopes.has(s)).join(', ')}`);
      return { 
        success: true,
        data: {
          valid: false,
          oauthCredentials: [] // Changed to oauthCredentials
        }
      };
    }

    // All checks passed
    console.log(`User ${userId} has valid credentials with required scopes for provider ${oauthProvider}`);
    return {
      success: true,
      data: {
        valid: true,
        oauthCredentials: credentials // Changed to oauthCredentials
      }
    };

  } catch (error) {
    // Log the error and rethrow if it's not the specific error thrown above
    // (to ensure it's caught by the main POST handler)
    console.error(`Unexpected error in checkUserAuth for user ${userId}:`, error);
    // Ensure the error propagates to the POST handler's catch block
    if (error instanceof Error && error.message.startsWith('Failed to fetch credentials')) {
        return {
            success: false,
            error: error.message
        }; // Rethrow the specific error
    } else {
        // Wrap other unexpected errors
        return {
            success: false,
            error: `Internal error during authentication check: ${error instanceof Error ? error.message : String(error)}`
        };
    }
  }
} 