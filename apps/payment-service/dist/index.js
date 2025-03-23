"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Payment Service
 *
 * A simple service for handling payments and credits based on Stripe.
 * Manages customer credit balances via Stripe Customer Balance API.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
// Initialize Express app
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
// Authentication middleware - extracts user from x-user-id header
app.use((req, res, next) => {
    try {
        // Get user ID from header set by web-gateway auth middleware
        const userId = req.headers['x-user-id'];
        if (userId) {
            // Set user object on request for route handlers
            // Ensure all required User fields are included to satisfy the type
            req.user = {
                id: userId,
                email: req.headers['x-user-email'] || 'unknown@example.com',
                name: req.headers['x-user-name'] || 'Unknown User',
                provider: req.headers['x-user-provider'] || 'unknown'
            };
            console.log(`[Auth Middleware] User ID set from header: ${userId}`);
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
    if (req.originalUrl === '/payment/webhook') {
        // Skip JSON parsing for webhook endpoint - will be handled by express.raw middleware
        next();
    }
    else {
        // Use standard JSON body parsing for all other routes
        express_1.default.json()(req, res, next);
    }
});
// Register routes
app.use(routes_1.default);
// Start the server
app.listen(config_1.PORT, () => {
    console.log(`Payment service running on port ${config_1.PORT}`);
    console.log(`Health check: http://localhost:${config_1.PORT}/health`);
});
