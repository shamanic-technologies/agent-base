/**
 * OAuth Controller
 * 
 * Handles OAuth authentication with Passport.js
 */
import { AsyncRequestHandler } from '../utils/types';
import { config } from '../config/env';
import { generateToken, UserProfile } from '../utils/passport';
import { saveUserToDatabase } from '../utils/database';

/**
 * Handle successful authentication
 * Sets JWT token in cookies and redirects to client app
 */
export const authSuccessHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const user = req.user as UserProfile;
    
    if (!user) {
      console.error('No user data found in request');
      return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
    }
    
    // Save user to database
    try {
      const dbResponse = await saveUserToDatabase(user);
      console.log('User saved to database:', dbResponse);
    } catch (dbError) {
      console.error('Failed to save user to database, continuing anyway:', dbError);
      // Continue anyway - don't fail the authentication due to database issues
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set auth token cookie
    res.cookie('auth-token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/'
    });
    
    // Determine the redirect URL based on the state parameter
    let redirectUrl = `${config.clientAppUrl}/dashboard`;
    
    // Get the origin from the state parameter
    const state = req.query.state as string;
    if (state) {
      try {
        // Extract domain and port from the state (origin URL)
        const originUrl = new URL(state);
        // Check if the origin is from a trusted domain (localhost with any port)
        if (originUrl.hostname === 'localhost') {
          redirectUrl = `${originUrl.origin}/dashboard`;
        }
      } catch (error) {
        console.error('Invalid state parameter, using default redirect URL:', error);
      }
    }
    
    // Redirect to client app
    return res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Auth success handler error:', error);
    return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
  }
};

/**
 * Handle authentication failure
 */
export const authFailureHandler: AsyncRequestHandler = async (req, res) => {
  console.error('Authentication failed');
  return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
}; 