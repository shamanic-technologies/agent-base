/**
 * User Service
 *
 * Handles user validation and management.
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import session from 'express-session'; // No longer needed
// import passport from './utils/passport'; // No longer needed
import { config, logConfig } from './config/env';
import authUserRoutes from './routes/auth-user.routes';
import clientOrganizationRoutes from './routes/client-organization.routes';
import healthRoutes from './routes/health.routes';
import { authMiddleware } from './middleware/authMiddleware';

// Initialize Express app
const app = express();
const PORT = config.port;

// Log configuration
logConfig();

// Middleware
app.use(cors({
  origin: config.clientAppUrl, // Consider making this more flexible or an array of allowed origins
  credentials: true, // If you need to handle cookies from frontend
}));

app.use(cookieParser() as express.RequestHandler);
app.use(express.json() as express.RequestHandler);

// Public routes (no authentication required)
app.use('/health', healthRoutes);
app.use('/auth-user', authUserRoutes);

// All routes after this will be protected by the auth middleware
app.use(authMiddleware);

// Register user routes
// All user-related routes will be prefixed with /users (or whatever you prefer)
app.use('/organizations', clientOrganizationRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 User Service running on port ${PORT}`);
});