/**
 * Health Controller
 *
 * Provides a health check endpoint for the service.
 */
import { Request, Response } from 'express';

/**
 * Health check handler.
 * @param req - The request object.
 * @param res - The response object.
 */
export const healthCheckHandler = (req: Request, res: Response): void => {
  res.status(200).json({ status: 'UP', service: 'User Service' });
}; 