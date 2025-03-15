/**
 * Shared Types
 * 
 * Type definitions used across the auth service
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Async request handler type that allows returning responses
 * This allows Express routes to use async/await
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<any>; 