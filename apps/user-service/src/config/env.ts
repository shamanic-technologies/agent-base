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
  'DATABASE_SERVICE_URL'
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

  // Database service URL
  databaseServiceUrl: process.env.DATABASE_SERVICE_URL!,
  
  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
};

// Log environment variables (without revealing full keys)
export const logConfig = () => {
  console.log('Environment configuration:');
  console.log(`- PORT: ${config.port}`);
  console.log(`- DATABASE_SERVICE_URL: ${config.databaseServiceUrl}`);
};
