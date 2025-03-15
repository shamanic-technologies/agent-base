/**
 * Authentication Controller - Simplified
 * 
 * Handles token validation, refresh, and logout for Google OAuth
 */
import { AsyncRequestHandler } from '../utils/types';
import { supabase } from '../utils/supabase';
import { config } from '../config/env';

/**
 * Validate the user's token
 */
export const validateTokenHandler: AsyncRequestHandler = async (req, res) => {
  try {
    // Get access token from cookies
    const accessToken = req.cookies['sb-access-token'];
    const refreshToken = req.cookies['sb-refresh-token'];
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Get the user from Supabase using the token
    const { data, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    return res.json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      }
    });
  } catch (error: any) {
    console.error('Error validating token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Refresh the user's token
 */
export const refreshTokenHandler: AsyncRequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies['sb-refresh-token'];
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token'
      });
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    
    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    // Set the new tokens as cookies
    res.cookie('sb-access-token', data.session.access_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax'
    });
    
    res.cookie('sb-refresh-token', data.session.refresh_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax'
    });
    
    return res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Log the user out
 */
export const logoutHandler: AsyncRequestHandler = async (req, res) => {
  try {
    // Clear Supabase session
    await supabase.auth.signOut();
    
    // Clear cookies
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');
    
    return res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error logging out:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}; 