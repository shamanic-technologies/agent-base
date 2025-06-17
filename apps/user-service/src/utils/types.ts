/**
 * Shared Types
 * 
 * Type definitions used across the auth service
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Extend Express Request type to include Passport user
// declare global {
//   namespace Express {
//     interface User extends ProviderUser {}
    
//     interface Request {
//       providerUser?: ProviderUser;
//     }
//   }
// }

/**
 * Async request handler type that allows returning responses
 * This allows Express routes to use async/await
 */
export type AsyncRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next?: NextFunction
) => Promise<any>; 