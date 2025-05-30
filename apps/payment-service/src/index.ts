/**
 * HelloWorld Payment Service
 * 
 * A simple service for handling payments and credits based on Stripe.
 * Manages customer credit balances via Stripe Customer Balance API.
 */
import express from 'express';
import cors from 'cors';
import { PORT } from './config/index.js';
import routes from './routes/index.js';
import { authMiddleware } from './middlewares/authMiddleware.js';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());

// Use the dedicated authentication middleware
app.use(authMiddleware);

// Special handling for webhook path which requires raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
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