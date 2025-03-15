/**
 * Auth Service with Supabase Auth Integration
 * 
 * A modern authentication service that leverages Supabase Auth
 * for user authentication and management.
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CookieOptions } from 'express';

// Define a custom type for Express request handlers that allows returning responses
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<any>;

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3005;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log environment variables (without revealing full keys)
console.log('Environment configuration:');
console.log(`- PORT: ${PORT}`);
console.log(`- SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`- SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 10)}...` : 'not set'}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : 'not set'}`);

// Cookie configuration
const cookieSettings: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ... rest of the file stays the same 