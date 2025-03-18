/**
 * Auth Service Client
 * 
 * A utility for interacting with the auth service API via server-side routes
 */

/**
 * Log in with email and password
 * @param email User's email
 * @param password User's password
 * @returns Success status and user data if successful
 */
export async function login(email: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Logout the current user by calling the auth service
 * Invalidates the session and clears cookies
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
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
    const response = await fetch('/api/auth/validate', {
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
 * @returns Success or failure
 */
export async function updateUserPresence(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/presence', {
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