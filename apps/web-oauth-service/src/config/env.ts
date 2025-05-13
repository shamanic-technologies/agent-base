/**
 * Environment variables and configuration
 * 
 * Centralized configuration management for the Auth Service
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

// Check required environment variables
const requiredEnvVars = [
  'PORT',
  'CLIENT_APP_URL',
  // 'AUTH_SERVICE_URL',
  // 'WEB_GATEWAY_URL',
  'DATABASE_SERVICE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'ALLOWED_REDIRECT_DOMAINS',
  // 'COOKIE_DOMAIN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export const config = {
  // Server configuration
  port: process.env.PORT!,
  
  // Client app URL for redirects
  clientAppUrl: process.env.CLIENT_APP_URL!,
  
  // Auth service URL (direct)
  // authServiceUrl: process.env.AUTH_SERVICE_URL!,
  
  // Web gateway URL (for callbacks)
  // webGatewayUrl: process.env.WEB_GATEWAY_URL!,
  
  // Database service URL
  databaseServiceUrl: process.env.DATABASE_SERVICE_URL!,
  
  // Google OAuth credentials
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d', // 7 days
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET!,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Allowed domains for OAuth redirects
  allowedRedirectDomains: process.env.ALLOWED_REDIRECT_DOMAINS!.split(',').map(domain => domain.trim()),
  
  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
};

// Log environment variables (without revealing full keys)
export const logConfig = () => {
  console.log('Environment configuration:');
  console.log(`- PORT: ${config.port}`);
  // console.log(`- AUTH_SERVICE_URL: ${config.authServiceUrl}`);
  // console.log(`- WEB_GATEWAY_URL: ${config.webGatewayUrl}`);
  console.log(`- GOOGLE_CLIENT_ID: ${config.google.clientId ? `${config.google.clientId.substring(0, 10)}...` : 'not set'}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${config.google.clientSecret ? `${config.google.clientSecret.substring(0, 5)}...` : 'not set'}`);
  console.log(`- GOOGLE_REDIRECT_URI: ${config.google.redirectUri}`);
  console.log(`- JWT_SECRET: ${config.jwt.secret ? 'set (hidden)' : 'not set'}`);
  console.log(`- SESSION_SECRET: ${config.session.secret ? 'set (hidden)' : 'not set'}`);
  console.log(`- ALLOWED_REDIRECT_DOMAINS: ${config.allowedRedirectDomains.join(', ')}`);
  // console.log(`- COOKIE_DOMAIN: ${process.env.COOKIE_DOMAIN}`);
};

// Cookie settings
export const cookieSettings = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: process.env.COOKIE_DOMAIN! // Use domain from environment variable
}; 