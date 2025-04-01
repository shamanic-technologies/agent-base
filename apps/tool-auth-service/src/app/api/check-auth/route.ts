/**
 * Check Auth API Endpoint
 * 
 * Checks if a user has the required OAuth scopes and returns authentication URL if needed
 */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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
async function checkUserAuth(userId: string, requiredScopes: string[]): Promise<{ valid: boolean, credentials?: any }> {
  try {
    // Call database service to check for credentials
    const response = await axios.get(`${process.env.DATABASE_SERVICE_URL}/credentials/${userId}`);
    
    // For now, we'll just return invalid until we implement the database integration
    return {
      valid: false
    };

    /* Real implementation would be:
    const userCredentials = response.data;
    
    if (!userCredentials || !userCredentials.accessToken) {
      return { valid: false };
    }
    
    // Check if all required scopes are included in the user's scopes
    const userScopes = userCredentials.scopes || [];
    const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));
    
    // Check if token is expired
    const isExpired = userCredentials.expiresAt < Date.now();
    
    if (hasAllScopes && !isExpired) {
      return {
        valid: true,
        credentials: userCredentials
      };
    }
    
    return { valid: false };
    */
  } catch (error) {
    console.error('Error checking user auth:', error);
    return { valid: false };
  }
} 