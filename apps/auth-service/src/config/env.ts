/**
 * Environment variables and configuration
 * 
 * Centralized configuration management for the Auth Service
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export const config = {
  // Server configuration
  port: process.env.PORT || '3005',
  
  // Client app URL for redirects
  clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:3000',
  
  // Auth service URL for callbacks
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3005',
  
  // Database service URL
  databaseServiceUrl: process.env.DATABASE_SERVICE_URL || 'http://localhost:3006',
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
};

// Log environment variables (without revealing full keys)
export const logConfig = () => {
  console.log('Environment configuration:');
  console.log(`- PORT: ${config.port}`);
  console.log(`- SUPABASE_URL: ${config.supabase.url}`);
  console.log(`- SUPABASE_ANON_KEY: ${config.supabase.anonKey ? `${config.supabase.anonKey.substring(0, 10)}...` : 'not set'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${config.supabase.serviceRoleKey ? `${config.supabase.serviceRoleKey.substring(0, 10)}...` : 'not set'}`);
};

// Cookie settings
export const cookieSettings = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
}; 