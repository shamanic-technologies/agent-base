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
import userRoutes from './routes/user.routes'; // Import specific user routes
import { config, logConfig } from './config/env';

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

// Session and Passport initialization are removed as they are no longer used.

// Register user routes
// All user-related routes will be prefixed with /users (or whatever you prefer)
app.use('/users', userRoutes);

// Health check endpoint (optional, but good practice)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'User Service' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 User Service running on port ${PORT}`);
}); 