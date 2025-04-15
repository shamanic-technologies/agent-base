/**
 * OAuth Controller
 * 
 * Handles OAuth authentication with Passport.js
 */
import { AsyncRequestHandler } from '../utils/types';
import { config } from '../config/env';
import { generateToken } from '../utils/passport';
import { saveUserToDatabase } from '../utils/database';
import { cookieSettings } from '../config/env';
import { ProviderUser, PlatformUser, ServiceResponse, PlatformJWTPayload } from '@agent-base/types';

/**
 * Handle successful authentication
 * Sets JWT token in cookies and redirects to client app
 */
export const authSuccessHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const userFromProvider = req.user as ProviderUser;
    
    console.log('[Auth Service] Auth Success Handler - User profile from provider:', userFromProvider);
    
    if (!userFromProvider) {
      console.error('[Auth Service] No user data found in request after OAuth callback');
      return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
    }
    
    // Save/update user in database and get the canonical user record (including DB UUID)
    let platformUser: PlatformUser; // Use 'any' for now, define a proper type later
    try {
      // saveUserToDatabase should return the full user record from the DB
      const dbResponse: ServiceResponse<PlatformUser> = await saveUserToDatabase(userFromProvider);
      if (!dbResponse.success || !dbResponse.data) { // Check for the DB UUID 'id'
         console.error('[Auth Service] Failed to get valid user record with DB UUID from database service.');
         return res.redirect(`${config.clientAppUrl}?error=database_error&details=no_db_uuid`);
      }
      platformUser = dbResponse.data;
      console.log('[Auth Service] User record retrieved/saved from database:', platformUser);
    } catch (dbError) {
      console.error('[Auth Service] Failed to save/retrieve user from database:', dbError);
      // Don't fail auth, but log potentially critical error
      // Maybe redirect with a different error? For now, continue might lead to issues later.
      return res.redirect(`${config.clientAppUrl}?error=database_error`); 
    }

    // --- Prepare payload for JWT using Database User Record --- 
    // Construct payload matching UserProfile interface for generateToken
    const tokenPayload: PlatformJWTPayload = {
      platformUserId: platformUser.id, // Use database UUID for the 'id' field
    };
    console.log('[Auth Service] Payload for JWT generation:', tokenPayload);

    if (!tokenPayload.platformUserId) { // Check the 'id' field now
        console.error('[Auth Service] CRITICAL: Missing database UUID (id) before generating token.');
        return res.redirect(`${config.clientAppUrl}?error=internal_error&details=missing_db_uuid`);
    }

    // Generate JWT token using the payload with the database UUID as 'id'
    const token : string = generateToken(tokenPayload); // Pass UserProfile object with DB UUID as id
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