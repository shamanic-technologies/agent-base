/**
 * Configuration loader for Key Service
 * Loads environment variables and exports configuration values.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway/external configuration.');
}

// Export configuration constants
export const PORT = process.env.PORT || 3003;
export const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';
export const SECRET_SERVICE_URL = process.env.SECRET_SERVICE_URL || 'http://localhost:3007';

// Validate essential configuration
if (!SECRET_SERVICE_URL) {
    console.error('FATAL: SECRET_SERVICE_URL environment variable is not set.');
    process.exit(1);
}

console.log(`Configuration loaded: Port=${PORT}, DB_URL=${DATABASE_SERVICE_URL}, SecretSvc=${SECRET_SERVICE_URL}`); 