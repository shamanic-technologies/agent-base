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
app.use(cookieParser());
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: config.session.maxAge
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Register all routes
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT} (using Passport.js)`);
}); 