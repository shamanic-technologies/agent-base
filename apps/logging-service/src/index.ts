/**
 * Logging Service
 * 
 * Service for recording API Gateway requests with API keys to the database.
 * Uses the database-service for persistence and payment-service for billing.
 */
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import { createServer } from 'node:http';
import pino from 'pino';
import { initDatabase } from './services/database';
import routes from './routes';

// Load environment variables
config({ path: '.env.local' });

// Set up logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Validate required environment variables
function validateEnv() {
  const requiredVars = ['PORT', 'DATABASE_SERVICE_URL', 'PAYMENT_SERVICE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  logger.info('All required environment variables are set');
  logger.info(`Environment configuration:
  PORT: ${process.env.PORT}
  DATABASE_SERVICE_URL: ${process.env.DATABASE_SERVICE_URL}
  PAYMENT_SERVICE_URL: ${process.env.PAYMENT_SERVICE_URL}
  LOG_LEVEL: ${process.env.LOG_LEVEL || 'info (default)'}
`);
}

// Validate environment before proceeding
validateEnv();

// Initialize Express app
const app = express();
const server = createServer(app);
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mount routes
app.use('/', routes);

// Start server
server.listen(port, async () => {
  logger.info(`Logging service listening on port ${port}`);
  
  // Initialize database
  try {
    await initDatabase();
    logger.info('Service is fully initialized and ready to accept requests');
  } catch (error) {
    logger.error('Service started with database initialization failure');
    logger.warn('Failed to initialize database, will retry periodically');
    
    // Retry initialization periodically
    setInterval(async () => {
      try {
        await initDatabase();
        logger.info('Successfully initialized database on retry');
      } catch (retryError) {
        logger.error('Failed to initialize database on retry');
      }
    }, 60000); // Retry every minute
  }
}); 