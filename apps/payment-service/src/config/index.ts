/**
 * Configuration for the payment service
 * Handles environment variables loading and Stripe initialization
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

// Initialize Stripe with API key
const stripeApiKey = process.env.STRIPE_API_KEY || '';
if (!stripeApiKey) {
  throw new Error('STRIPE_API_KEY is required to run the payment service');
}

// Export Stripe instance and other configuration
export const stripe = new Stripe(stripeApiKey);
export const PORT = process.env.PORT || 3007; 