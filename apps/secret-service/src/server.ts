/**
 * Express Server Entry Point
 * 
 * Initializes the Express application, configures middleware, mounts routes,
 * and starts the HTTP server.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'; // Import path module
import routes from './routes/index.js'; // Import the main router (explicitly index.js)
import { ErrorResponse } from '@agent-base/types'; // Import shared error type

// Load environment variables from .env file, explicitly setting the path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Express app
const app: Express = express();

// Define the port, defaulting to 3070 as used previously
const port = process.env.PORT || 3070;

// --- Middleware --- //

// Enable CORS for all origins (consider restricting in production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

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

// --- Start Server --- //

// Start listening on the configured port
app.listen(port, () => {
  // Log server start message
  console.log(`[server]: Server is running at http://localhost:${port}`);
}); 