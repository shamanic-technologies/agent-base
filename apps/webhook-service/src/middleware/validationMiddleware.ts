/**
 * Validation Middleware
 * 
 * Provides request validation and error handling for the API
 */
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Validate request based on validation chains
 * Applied after express-validator chains
 */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
    return;
  }
  
  next();
}

/**
 * Validate that the request has a valid API key
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const requiredApiKey = process.env.WEBHOOK_SERVICE_API_KEY;
  
  if (!requiredApiKey) {
    console.warn('⚠️ WEBHOOK_SERVICE_API_KEY not set in environment variables');
    next();
    return;
  }
  
  if (!apiKey || apiKey !== requiredApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return;
  }
  
  next();
}

/**
 * Validate Crisp webhook signature
 * This is a placeholder for future implementation
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function validateCrispSignature(req: Request, res: Response, next: NextFunction): void {
  // In production, verify the Crisp webhook signature here
  // using HMAC-SHA256 with the shared secret
  
  // For now, just pass through
  next();
} 