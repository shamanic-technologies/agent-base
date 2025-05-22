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
// Initialize Express app
const app = express();
// Middleware
app.use(cors());
// Authentication middleware - extracts user from x-user-id header
app.use((req, res, next) => {
    try {
        // Get user ID from header set by web-gateway auth middleware
        const platformUserId = req.headers['x-platform-user-id'];
        if (platformUserId) {
            // Set user object on request for route handlers
            // Ensure all required User fields are included to satisfy the type
            req.platformUser = {
                platformUserId: platformUserId,
                platformUserEmail: req.headers['x-platform-user-email'] || null,
                platformUserName: req.headers['x-platform-user-name'] || null,
            };
            console.log(`[Auth Middleware] User ID set from header: ${platformUserId}`);
        }
        next();
    }
    catch (error) {
        console.error('[Auth Middleware] Error processing request:', error);
        next();
    }
});
// Special handling for webhook path which requires raw body
app.use((req, res, next) => {
    if (req.originalUrl === '/webhook') {
        // Skip JSON parsing for webhook endpoint - will be handled by express.raw middleware
        next();
    }
    else {
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
