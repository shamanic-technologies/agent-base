/**
 * Type definitions for the payment service
 */
import { PlatformUser } from '@agent-base/types';
import { Request, Response } from 'express';
import Stripe from 'stripe';


// Extend Express Request type to include Passport user
declare global {
  namespace Express {
    
    interface Request {
      platformUser?: {
        platformUserId: string;
        platformUserEmail: string | null;
        platformUserName: string | null;
      };
    }
  }
}
