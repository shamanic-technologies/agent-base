/**
 * Auth Service with Passport.js Integration
 * 
 * A modern authentication service that leverages Passport.js
 * for user authentication and management.
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './utils/passport';
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

// Explicitly cast middleware to avoid TypeScript errors
app.use(cookieParser() as express.RequestHandler);
app.use(express.json() as express.RequestHandler);

// Session configuration - explicitly cast to RequestHandler
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }) as any // Ensure cast is 'as any'
);

// Initialize Passport - explicitly cast to RequestHandler
app.use(passport.initialize() as any); // Ensure cast is 'as any'
app.use(passport.session() as any); // Add 'as any' here too for consistency

// Register all routes
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT} (using Passport.js)`);
}); 