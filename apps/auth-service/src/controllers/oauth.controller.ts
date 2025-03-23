/**
 * OAuth Controller
 * 
 * Handles OAuth authentication with Passport.js
 */
import { AsyncRequestHandler } from '../utils/types';
import { config } from '../config/env';
import { generateToken, UserProfile } from '../utils/passport';
import { saveUserToDatabase } from '../utils/database';
import { cookieSettings } from '../config/env';

/**
 * Handle successful authentication
 * Sets JWT token in cookies and redirects to client app
 */
export const authSuccessHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const user = req.user as UserProfile;
    
    console.log('[Auth Service] Auth Success Handler - User data:', user ? 'Found' : 'Not found');
    
    if (!user) {
      console.error('[Auth Service] No user data found in request');
      return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
    }
    
    // Save user to database
    try {
      const dbResponse = await saveUserToDatabase(user);
      console.log('[Auth Service] User saved to database:', dbResponse);
    } catch (dbError) {
      console.error('[Auth Service] Failed to save user to database, continuing anyway:', dbError);
      // Continue anyway - don't fail the authentication due to database issues
    }
    
    // Generate JWT token
    const token = generateToken(user);
    console.log('[Auth Service] Auth Success Handler - Generated JWT token (truncated):', token.substring(0, 15) + '...');
    
    // Create custom cookie options based on cookieSettings
    const cookieOptions = {
      ...cookieSettings,
      // For localhost dev testing, ensure sameSite is lax and domain is set to allow sharing
      sameSite: 'lax' as const,
      secure: false // Disable secure flag for local testing
    };
    
    console.log('[Auth Service] Auth Success Handler - Setting cookie with options:', {
      ...cookieOptions,
      tokenLength: token.length
    });
    
    // Set the auth token cookie
    res.cookie('auth-token', token, cookieOptions);
    
    // Log all response headers for debugging
    console.log('[Auth Service] Auth Success Handler - Response headers set:', res.getHeaders());
    
    // Get the origin from the state parameter
    const state = req.query.state as string;
    if (!state) {
      console.error('[Auth Service] Missing state parameter in OAuth callback');
      return res.redirect(`${config.clientAppUrl}?error=missing_state`);
    }
    
    try {
      // Extract domain and port from the state (origin URL)
      const originUrl = new URL(state);
      
      // Get allowed domains from config
      const allowedDomains = config.allowedRedirectDomains;
      
      // Validate the hostname is in our whitelist
      if (!allowedDomains.includes(originUrl.hostname) && 
          !allowedDomains.some(domain => originUrl.hostname.endsWith(`.${domain}`))) {
        console.error(`[Auth Service] Unauthorized redirect domain: ${originUrl.hostname}`);
        return res.redirect(`${config.clientAppUrl}?error=unauthorized_redirect`);
      }
      
      // Always append the /auth/callback path to the origin
      const redirectUrl = `${originUrl.origin}/auth/callback?token=${encodeURIComponent(token)}`;
      console.log('[Auth Service] Auth Success Handler - Using origin from state for redirect:', redirectUrl);
      
      // Additional debug log before redirect
      console.log('[Auth Service] Auth Success Handler - Final redirect URL:', redirectUrl);
      
      // Redirect to client app
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('[Auth Service] Invalid state parameter:', error);
      return res.redirect(`${config.clientAppUrl}?error=invalid_state`);
    }
    
  } catch (error: any) {
    console.error('[Auth Service] Auth success handler error:', error);
    return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
  }
};

/**
 * Handle authentication failure
 */
export const authFailureHandler: AsyncRequestHandler = async (req, res) => {
  console.error('[Auth Service] Authentication failed');
  return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
}; 