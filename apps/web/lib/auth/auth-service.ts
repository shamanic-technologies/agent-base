/**
 * Auth Service Client
 * 
 * A utility for interacting with the auth service API via web gateway
 */

const WEB_GATEWAY_URL = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL || 'http://localhost:3030';

/**
 * Logout the current user by calling the auth service
 * Invalidates the session and clears cookies
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${WEB_GATEWAY_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Logout failed');
    }
    
    return true;
  } catch (error) {
    console.error('Auth service logout error:', error);
    return false;
  }
}

/**
 * Validate the user's authentication status
 * @returns User data if authenticated, null if not
 */
export async function validateAuth() {
  try {
    const response = await fetch(`${WEB_GATEWAY_URL}/auth/validate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Auth validation error:', error);
    return null;
  }
}

/**
 * Get the current user from auth service
 * @returns User data object or null if not authenticated
 */
export async function getCurrentUser() {
  const userData = await validateAuth();
  return userData;
}

/**
 * Update user presence status
 * This can be called periodically to indicate the user is active
 * @returns Success or failure
 */
export async function updateUserPresence(): Promise<boolean> {
  try {
    // This endpoint doesn't exist yet in the auth service,
    // but we're preparing the client-side for when it's added
    const response = await fetch(`${WEB_GATEWAY_URL}/auth/presence`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'online',
        lastActive: new Date().toISOString()
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error updating user presence:', error);
    return false;
  }
} 