/**
 * Shared Types
 * 
 * Type definitions used across the auth service
 */
import { Request, Response, NextFunction } from 'express';
import { UserProfile } from './passport';

// Extend Express Request type to include Passport user
declare global {
  namespace Express {
    interface User extends UserProfile {}
    
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * Async request handler type that allows returning responses
 * This allows Express routes to use async/await
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<any>; 