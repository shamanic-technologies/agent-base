/**
 * Logging Service
 * 
 * Service for recording API Gateway requests with API keys to the database.
 * Uses the database-service for persistence and payment-service for billing.
 */

// Load environment variables first
import { config } from 'dotenv';
config({ path: '.env' });

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'node:http';
import routes from './routes/index';

function validateEnv() {
  const requiredVars = [
    'PORT',
    'DATABASE_SERVICE_URL',
    'PAYMENT_SERVICE_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.info('All required environment variables are set');
  console.info(`Environment configuration:
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
  app.use('/', ((req: Request, res: Response, next: NextFunction) => {
    // Skip authentication for health checks
    if ((req as any).path === '/health') {
      return (next as any)();
    }
    
    const userId = (req as any).headers['x-user-id'] as string;
    
    if (!userId) {
      console.warn(`Auth Middleware: Missing X-USER-ID header for ${(req as any).path}`);
      return (res as any).status(401).json({
        success: false,
        error: 'Authentication required - X-USER-ID header must be provided'
      });
    }
    
    console.info(`Auth Middleware: User ${userId} authenticated for ${(req as any).path}`);
    (next as any)();
  }) as RequestHandler);

  // Routes
  app.use('/', routes);

  // Create HTTP server
  const server = createServer(app);

  // Start server
  server.listen(port, () => {
    console.info(`Server is running on port ${port}`);
  });

  // Handle shutdown
  process.on('SIGTERM', () => {
    console.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.info('Server closed');
      process.exit(0);
    });
  });
}

// Start the application
validateEnv();
startServer(); 