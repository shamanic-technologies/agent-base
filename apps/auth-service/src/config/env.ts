/**
 * Environment variables and configuration
 * 
 * Centralized configuration management for the Auth Service
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const config = {
  // Server configuration
  port: process.env.PORT || '3005',
  
  // Client app URL for redirects
  clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:3000',
  
  // Auth service URL for callbacks
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3005',
  
  // Database service URL
  databaseServiceUrl: process.env.DATABASE_SERVICE_URL || 'http://localhost:3006',
  
  // Google OAuth credentials
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key-should-be-changed',
    expiresIn: '7d', // 7 days
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-should-be-changed',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
};

// Log environment variables (without revealing full keys)
export const logConfig = () => {
  console.log('Environment configuration:');
  console.log(`- PORT: ${config.port}`);
  console.log(`- GOOGLE_CLIENT_ID: ${config.google.clientId ? `${config.google.clientId.substring(0, 10)}...` : 'not set'}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${config.google.clientSecret ? `${config.google.clientSecret.substring(0, 5)}...` : 'not set'}`);
  console.log(`- JWT_SECRET: ${config.jwt.secret ? 'set (hidden)' : 'not set'}`);
  console.log(`- SESSION_SECRET: ${config.session.secret ? 'set (hidden)' : 'not set'}`);
};

// Cookie settings
export const cookieSettings = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
}; 