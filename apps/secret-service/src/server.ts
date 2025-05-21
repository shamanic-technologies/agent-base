/**
 * Express Server Entry Point
 * 
 * Initializes the Express application, configures middleware, mounts routes,
 * and starts the HTTP server.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import routes from './routes/index.js'; // Import the main router (explicitly index.js)
import { ErrorResponse } from '@agent-base/types'; // Import shared error type
import { initializeGsmClient } from './lib/gsmClient.js'; // Corrected import

// Load environment variables from .env file
// process.cwd() should be /app (the WORKDIR in Docker)
// This assumes your .env file for secret-service is at /app/apps/secret-service/.env in the container
// if you have one for local dev that gets copied by 'COPY . .'
dotenv.config({ path: path.resolve(process.cwd(), 'apps/secret-service/.env') });

// Initialize Express app
const app: Express = express();

// Define the port, defaulting to 3070 as used previously
const port = process.env.PORT || 3070;

// --- Middleware --- //

// Enable CORS for all origins (consider restricting in production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Basic Logging Middleware (optional, can be expanded)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[SecretService] ${req.method} ${req.url}`);
  next();
});

// --- Routes --- //

// Mount the main router
app.use('/api', routes);

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  // Simple health check response
  res.status(200).json({ status: 'ok' });
});

// --- Global Error Handler --- //
// Catches errors passed via next(error)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging purposes
  console.error('Unhandled Error:', err);

  // Send a generic error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'An unexpected error occurred',
    details: err.message, // Include error message for more context
  };
  // Set status to 500 for Internal Server Error
  res.status(500).json(errorResponse);
});

// Initialize GSM client and then start the server
async function startServer() {
  try {
    await initializeGsmClient(); // Initialize GSM client
    app.listen(port, () => {
      console.log(`[SecretService] Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[SecretService] Failed to initialize and start server:', error);
    process.exit(1); // Exit if critical initialization fails
  }
}

startServer(); // Call the async function to start the server 