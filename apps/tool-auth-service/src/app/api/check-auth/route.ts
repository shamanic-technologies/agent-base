/**
 * Check Auth API Endpoint
 * 
 * Checks if a user has the required OAuth scopes and returns authentication URL if needed
 */
import { NextRequest, NextResponse } from 'next/server';
import { 
   OAuthProvider,
   ServiceResponse,
   CheckUserOAuthResult,
   OAuth,
   MinimalInternalCredentials,
   GetUserOAuthInput,
   CheckUserOAuthValidResult,
   CheckUserOAuthInvalidResult
} from '@agent-base/types';
// @ts-ignore api-client will be recognized soon
import { getInternalAuthHeaders, getCredentials } from '@agent-base/api-client';

/**
 * Checks if the user has authorized the required scopes for a tool
 * If not, returns an auth URL for the frontend to redirect to
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // We get all credentials from headers now, not from the body.
    const internalCredsResult = getInternalAuthHeaders(req as any);
    if (!internalCredsResult.success) {
      return NextResponse.json(internalCredsResult, { status: 401 });
    }
    const minimalInternalCredentials = internalCredsResult.data as MinimalInternalCredentials;

    const { oauthProvider, requiredScopes }: { oauthProvider: OAuthProvider, requiredScopes: string[] } = await req.json();

    const getUserOAuthInput: GetUserOAuthInput = {
      clientUserId: minimalInternalCredentials.clientUserId,
      clientOrganizationId: minimalInternalCredentials.clientOrganizationId,
      oauthProvider,
      requiredScopes
    };
    
    // Pass the full credentials to checkUserAuth
    const checkUserAuthResponse: ServiceResponse<CheckUserOAuthResult> = await checkUserAuth(getUserOAuthInput, minimalInternalCredentials);

    // 1. Check for explicit failure from checkUserAuth (e.g., database service error)
    if (!checkUserAuthResponse.success) {
      console.error(`checkUserAuth failed for user ${getUserOAuthInput.clientUserId}: ${checkUserAuthResponse.error}`);
      // Return a server error status, indicating the check itself failed
      return NextResponse.json({ 
        success: false, 
        error: checkUserAuthResponse.error || "Failed to check authentication status.",
        hint: `This error should not happen. Contact support.`
      }, { status: 500 }); // Use 500 for internal errors
    }

    const checkUserAuthResult = checkUserAuthResponse.data as CheckUserOAuthResult;

    // 2. If checkUserAuth succeeded, check if authentication is valid
    if (checkUserAuthResult.valid) {
      // User is authenticated, return success response with credentials
      return NextResponse.json(checkUserAuthResponse);
    } else {
      // User is not authenticated or lacks scopes, return needs-auth response
      // Encode the entire internalCredentials object into the state parameter
      const state = Buffer.from(JSON.stringify(minimalInternalCredentials)).toString('base64');
      const callbackUrl = encodeURIComponent(`${process.env.BASE_URL}/auth/callback`);
      const scopeString = requiredScopes.join(' ');
      const authUrl = `${process.env.BASE_URL}/api/auth/start?callbackUrl=${callbackUrl}&scopes=${scopeString}&state=${state}`;
      
        const CheckUserOAuthInvalidResponse: ServiceResponse<CheckUserOAuthInvalidResult> = {
        success: true, // The check operation succeeded, but the user needs auth
        data: {
          valid: false,
          authUrl
        }
      };
      return NextResponse.json(CheckUserOAuthInvalidResponse); // 200 OK is correct here
    }

  } catch (error) {
    // Catch unexpected errors in the POST handler itself
    console.error('Unexpected error in POST /api/check-auth:', error);
    const errorResponse: ServiceResponse<never> = { 
      success: false,
      error: "Internal server error",
      hint: `This error should not happen. Contact support.`
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Checks if a user has valid credentials with the required scopes
 */
async function checkUserAuth(
  input: GetUserOAuthInput,
  minimalInternalCredentials: MinimalInternalCredentials
): Promise<ServiceResponse<CheckUserOAuthResult>> {

  const {
    clientUserId,
    clientOrganizationId,
    oauthProvider,
    requiredScopes
  } = input;
  
  try {
    console.log(`Checking auth for user ${clientUserId} in org ${clientOrganizationId} with provider ${oauthProvider} and scopes: ${requiredScopes.join(', ')}`);

    // Get credentials from database service
    const getCredentialsResponse: ServiceResponse<OAuth[]> = await getCredentials(input, minimalInternalCredentials);
    console.log('Database service call result:', JSON.stringify(getCredentialsResponse, null, 2));

    // Explicitly check for failure from the service call
    if (!getCredentialsResponse.success) {
      // Log the specific error returned by the database service if available
      const errorMessage = getCredentialsResponse.error || 'Unknown error fetching credentials';
      console.error(`Error fetching credentials for user ${clientUserId} (provider: ${oauthProvider}): ${errorMessage}`);
      return getCredentialsResponse;
    }

    const credentials: OAuth[] = getCredentialsResponse.data;

    // Handle case where success is true but no data is returned (shouldn't happen with current types, but good practice)
    if (!credentials || credentials.length === 0) {
      console.log(`No credentials found for user ${clientUserId} with provider ${oauthProvider}`);
      return { 
        success: true,
        data: {
          valid: false,
          oauthCredentials: []
        }
      };
    }

    // Check if the returned credentials cover all required scopes.
    // Note: This check might be redundant if the database service already filters by scope correctly.
    // Keeping it for safety unless confirmed otherwise.
    const currentScopes = new Set(credentials.flatMap((cred: OAuth) => cred.scope ? cred.scope.split(' ') : []));
    const hasAllScopes = requiredScopes.every((scope: string) => currentScopes.has(scope));

    if (!hasAllScopes) {
      console.log(`User ${clientUserId} has credentials but is missing required scopes: ${requiredScopes.filter((s: string) => !currentScopes.has(s)).join(', ')}`);
      return { 
        success: true,
        data: {
          valid: false,
          oauthCredentials: []
        }
      };
    }

    // All checks passed
    console.log(`User ${clientUserId} has valid credentials with required scopes for provider ${oauthProvider}`);
    return {
      success: true,
      data: {
        valid: true,
        oauthCredentials: credentials
      }
    };

  } catch (error) {
    // Log the error and rethrow if it's not the specific error thrown above
    // (to ensure it's caught by the main POST handler)
    console.error(`Unexpected error in checkUserAuth for user ${clientUserId}:`, error);
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