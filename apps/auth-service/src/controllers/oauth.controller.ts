/**
 * OAuth Controller
 * 
 * Handles Google OAuth flow with proper redirect chain
 */
import { AsyncRequestHandler } from '../utils/types';
import { supabase } from '../utils/supabase';
import { config } from '../config/env';

/**
 * Initiate Google OAuth flow
 * 
 * First step in the redirect chain:
 * Client → Auth Service → Google → Supabase → Auth Service → Client
 */
export const googleAuthHandler: AsyncRequestHandler = async (req, res) => {
  try {
    // Tell Supabase to redirect back to our auth service's callback endpoint
    // This is the SECOND redirect in the chain (Supabase → Auth Service)
    const redirectTo = `${config.authServiceUrl}/auth/callback`;
    
    console.log('Starting OAuth flow with callback to:', redirectTo);
    
    // Generate OAuth URL with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo, // Supabase will redirect here after authentication
        scopes: 'email profile',
      }
    });
    
    if (error) {
      console.error('OAuth initialization error:', error);
      return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
    }
    
    // Redirect to Google OAuth (which will later redirect to Supabase)
    // This starts the FIRST redirect in the chain (Auth Service → Google)
    return res.redirect(data.url);
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.redirect(`${config.clientAppUrl}?error=auth_failed`);
  }
};

/**
 * Handle OAuth callback from Supabase
 * 
 * This handles the SECOND redirect (Supabase → Auth Service)
 * And performs the THIRD redirect (Auth Service → Client)
 */
export const authCallbackHandler: AsyncRequestHandler = async (req, res) => {
  try {
    // Check if we have a code (unlikely) or hash fragment
    const code = req.query.code as string;
    
    // For handling token in URL fragment, we need to use client-side JavaScript
    // since fragments aren't sent to the server
    if (!code) {
      console.log('No code found, sending fragment handler page');
      
      // Send a page that will extract tokens from the fragment and set cookies
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authenticating...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f7fa;
            }
            .loader {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .hidden {
              display: none;
            }
          </style>
          <script>
            // Extract tokens from URL fragment
            function processAuth() {
              if (window.location.hash) {
                // Parse the hash fragment
                const params = {};
                window.location.hash.substring(1).split('&').forEach(pair => {
                  const [key, value] = pair.split('=');
                  params[key] = decodeURIComponent(value);
                });
                
                // Check if we have the access token
                if (params.access_token) {
                  console.log('Access token found, completing authentication');
                  
                  // Set cookies instead of localStorage
                  // We need to make a request to the auth service to set the cookies
                  fetch('/auth/set-cookies', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      access_token: params.access_token,
                      refresh_token: params.refresh_token || '',
                      expires_at: params.expires_at || ''
                    }),
                    credentials: 'include'
                  })
                  .then(response => {
                    if (response.ok) {
                      // Give a small delay to ensure cookies are set before redirecting
                      setTimeout(() => {
                        // Redirect to client app chat page without updating UI text
                        window.location.href = '${config.clientAppUrl}/chat';
                      }, 500);
                    } else {
                      console.error('Failed to set cookies');
                      setTimeout(() => {
                        window.location.href = '${config.clientAppUrl}?error=cookie_setup_failed';
                      }, 500);
                    }
                  })
                  .catch(error => {
                    console.error('Error setting cookies:', error);
                    setTimeout(() => {
                      window.location.href = '${config.clientAppUrl}?error=cookie_setup_error';
                    }, 500);
                  });
                } else {
                  console.error('No access token in fragment');
                  setTimeout(() => {
                    window.location.href = '${config.clientAppUrl}?error=no_token';
                  }, 500);
                }
              } else {
                console.error('No hash fragment found');
                setTimeout(() => {
                  window.location.href = '${config.clientAppUrl}?error=no_auth_data';
                }, 500);
              }
            }
            
            // Process as soon as page loads
            window.onload = processAuth;
          </script>
        </head>
        <body>
          <div class="loader"></div>
        </body>
        </html>
      `);
    }
    
    // If we have a code, exchange it for a session (rare case)
    console.log('Auth code found, exchanging for session');
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data.session) {
      console.error('Error exchanging code for session:', error);
      return res.redirect(`${config.clientAppUrl}?error=session_exchange_failed`);
    }
    
    // Set cookies directly
    const expiresIn = 60 * 60 * 24 * 7; // 7 days
    
    res.cookie('sb-access-token', data.session.access_token, {
      maxAge: expiresIn * 1000,
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/'
    });
    
    res.cookie('sb-refresh-token', data.session.refresh_token, {
      maxAge: expiresIn * 1000,
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/'
    });
    
    // Redirect to client app chat page
    return res.redirect(`${config.clientAppUrl}/chat`);
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return res.redirect(`${config.clientAppUrl}?error=auth_callback_failed`);
  }
};

/**
 * Set cookies from token data
 * Used by the client-side script in authCallbackHandler
 */
export const setCookiesHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const { access_token, refresh_token, expires_at } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'No access token provided' });
    }
    
    console.log('Setting authentication cookies');
    
    const expiresIn = 60 * 60 * 24 * 7; // 7 days
    
    // Set the cookies
    res.cookie('sb-access-token', access_token, {
      maxAge: expiresIn * 1000,
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/'
    });
    
    if (refresh_token) {
      res.cookie('sb-refresh-token', refresh_token, {
        maxAge: expiresIn * 1000,
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/'
      });
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting cookies:', error);
    return res.status(500).json({ error: 'Failed to set cookies' });
  }
}; 