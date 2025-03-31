/**
 * Logging Service
 * 
 * Service for recording API Gateway requests with API keys to the database.
 * Uses the database-service for persistence and payment-service for billing.
 */

// Load environment variables first
import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'node:http';
import pino from 'pino';
import routes from './routes/index.js';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

function validateEnv() {
  const requiredVars = [
    'PORT',
    'DATABASE_SERVICE_URL',
    'PAYMENT_SERVICE_URL'
  ];

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
  `);
}

function startServer() {
  const app = express();
  const port = process.env.PORT;

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());

  /**
   * Authentication middleware
   * Enforces X-USER-ID header authentication for protected routes
   * Skips authentication for /health and /log endpoints
   */
  app.use((req, res, next) => {
    // Skip authentication for health checks
    if (req.path === '/health') {
      return next();
    }
    
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      logger.warn(`Auth Middleware: Missing X-USER-ID header for ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required - X-USER-ID header must be provided'
      });
    }
    
    logger.info(`Auth Middleware: User ${userId} authenticated for ${req.path}`);
    next();
  });

  // Routes
  app.use('/', routes);

  // Create HTTP server
  const server = createServer(app);

  // Start server
  server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  // Handle shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Start the application
validateEnv();
startServer(); 