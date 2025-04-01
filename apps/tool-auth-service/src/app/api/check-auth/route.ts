/**
 * Check Auth API Endpoint
 * 
 * Checks if a user has the required OAuth scopes and returns authentication URL if needed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, Credential } from '@/lib/database';

/**
 * Checks if the user has authorized the required scopes for a tool
 * If not, returns an auth URL for the frontend to redirect to
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId, provider, requiredScopes } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        error: "Missing userId parameter" 
      }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({ 
        error: "Missing provider parameter" 
      }, { status: 400 });
    }

    if (!requiredScopes || !Array.isArray(requiredScopes) || requiredScopes.length === 0) {
      return NextResponse.json({ 
        error: "Missing or invalid requiredScopes parameter" 
      }, { status: 400 });
    }

    // Check if we already have valid credentials with required scopes for this user
    const hasAuth = await checkUserAuth(userId, provider, requiredScopes);

    if (hasAuth.valid) {
      // We have valid credentials with the required scopes
      return NextResponse.json({
        hasAuth: true,
        credentials: hasAuth.credentials
      });
    } else {
      // We need to authenticate with these scopes
      // Generate a URL to the sign-in page with the required scopes
      const callbackUrl = encodeURIComponent(`${process.env.BASE_URL}/auth/callback?userId=${userId}`);
      const scopeString = encodeURIComponent(requiredScopes.join(' '));
      
      const authUrl = `${process.env.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}&scopes=${scopeString}`;
      
      return NextResponse.json({
        hasAuth: false,
        authUrl
      });
    }
  } catch (error) {
    console.error('Error in check-auth:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

/**
 * Checks if a user has valid credentials with the required scopes
 */
async function checkUserAuth(userId: string, provider: string, requiredScopes: string[]): Promise<{ valid: boolean, credentials?: Credential[] }> {
  try {
    console.log(`Checking auth for user ${userId} with scopes: ${requiredScopes.join(', ')}`);
    
    // Get credentials from database service
    const result = await getCredentials({
      userId: userId,
      provider: provider,
      requiredScopes: requiredScopes
    });
    console.log('Database result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('Error fetching credentials for user', userId, 'with provider', provider, 'and scopes', requiredScopes);
      return { valid: false };
    }

    const credentials = result.data;

    if (!credentials || credentials.length === 0) {
      console.log('No credentials found for user', userId);
      return { valid: false };
    }
    
    const validCredentials: Credential[] = [];

    for (const credential of credentials) {
      // Check if valid access token exists
      if (credential.accessToken && credential.expiresAt > Date.now()) {
        validCredentials.push(credential);
      }
    }

    if (validCredentials.length === 0) {
      console.log('No valid credentials found for user', userId);
      return { valid: false };

    } else {

      const hasAllScopes = requiredScopes.every(scope => {
        return validCredentials.some(credential => credential.scope == scope);
      });
      if (!hasAllScopes) {
        console.log('User is missing required scopes');
        return { valid: false };
      }
      // All checks passed
      console.log('User has all required scopes and valid token');
      return {
        valid: true,
        credentials: validCredentials
      };
    }
  } catch (error) {
    console.error('Error checking user auth:', error);
    return { valid: false };
  }
} 