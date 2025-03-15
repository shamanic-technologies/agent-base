/**
 * Auth Service with Supabase Auth Integration
 * 
 * A modern authentication service that leverages Supabase Auth
 * for user authentication and management.
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { config, logConfig } from './config/env';

// Initialize Express app
const app = express();
const PORT = config.port;

// Log configuration
logConfig();

// Middleware
app.use(cors({
  origin: config.clientAppUrl,
  credentials: true, // Allow cookies to be sent with requests
}));
app.use(cookieParser());
app.use(express.json());

// Register all routes
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT} (using Supabase Auth)`);
}); 