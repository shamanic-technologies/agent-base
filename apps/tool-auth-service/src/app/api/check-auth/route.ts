/**
 * Check Auth API Endpoint
 * 
 * Checks if a user has the required OAuth scopes and returns authentication URL if needed
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, Credentials } from '@/lib/database';

/**
 * Checks if the user has authorized the required scopes for a tool
 * If not, returns an auth URL for the frontend to redirect to
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId, requiredScopes, toolName } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        error: "Missing userId parameter" 
      }, { status: 400 });
    }

    if (!requiredScopes || !Array.isArray(requiredScopes) || requiredScopes.length === 0) {
      return NextResponse.json({ 
        error: "Missing or invalid requiredScopes parameter" 
      }, { status: 400 });
    }

    // Check if we already have valid credentials with required scopes for this user
    const hasAuth = await checkUserAuth(userId, requiredScopes);

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
      const toolNameParam = toolName ? `&toolName=${encodeURIComponent(toolName)}` : '';
      
      const authUrl = `${process.env.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}&scopes=${scopeString}${toolNameParam}`;
      
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
async function checkUserAuth(userId: string, requiredScopes: string[]): Promise<{ valid: boolean, credentials?: Credentials }> {
  try {
    console.log(`Checking auth for user ${userId} with scopes: ${requiredScopes.join(', ')}`);
    
    // Get credentials from database service
    const result = await getCredentials(userId);
    console.log('Database result:', JSON.stringify(result, null, 2));
    
    if (!result.success || !result.data) {
      console.log('No credentials found for user', userId);
      return { valid: false };
    }
    
    const credentials = result.data;
    
    // Check if valid access token exists
    if (!credentials.accessToken) {
      console.log('No access token found in credentials');
      return { valid: false };
    }
    
    // Check if all required scopes are included in the user's scopes
    const scopes = credentials.scopes || [];
    console.log('User scopes:', scopes);
    console.log('Required scopes:', requiredScopes);
    
    const hasAllScopes = requiredScopes.every(scope => {
      const hasScope = scopes.includes(scope);
      console.log(`Checking scope ${scope}: ${hasScope ? 'FOUND' : 'MISSING'}`);
      return hasScope;
    });
    
    if (!hasAllScopes) {
      console.log('User is missing required scopes');
      return { valid: false };
    }
    
    // Check if token is expired
    const isExpired = credentials.expiresAt < Date.now();
    
    if (isExpired) {
      console.log('Token is expired');
      return { valid: false };
    }
    
    // All checks passed
    console.log('User has all required scopes and valid token');
    return {
      valid: true,
      credentials
    };
  } catch (error) {
    console.error('Error checking user auth:', error);
    return { valid: false };
  }
} 