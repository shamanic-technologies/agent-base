/**
 * HelloWorld Payment Service
 * 
 * A simple service for handling payments and credits based on Stripe.
 * Manages customer credit balances via Stripe Customer Balance API.
 */
import express from 'express';
import cors from 'cors';
import { PORT } from './config';
import routes from './routes';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());

// Authentication middleware - extracts user from x-user-id header
app.use((req, res, next) => {
  try {
    // Get user ID from header set by web-gateway auth middleware
    const userId = req.headers['x-user-id'] as string;
    
    if (userId) {
      // Set user object on request for route handlers
      // Ensure all required User fields are included to satisfy the type
      req.user = { 
        id: userId,
        email: req.headers['x-user-email'] as string || 'unknown@example.com',
        name: req.headers['x-user-name'] as string || 'Unknown User',
        provider: req.headers['x-user-provider'] as string || 'unknown'
      };
      console.log(`[Auth Middleware] User ID set from header: ${userId}`);
    }
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error processing request:', error);
    next();
  }
});

// Special handling for webhook path which requires raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/payment/webhook') {
    // Skip JSON parsing for webhook endpoint - will be handled by express.raw middleware
    next();
  } else {
    // Use standard JSON body parsing for all other routes
    express.json()(req, res, next);
  }
});

// Register routes
app.use(routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
}); 