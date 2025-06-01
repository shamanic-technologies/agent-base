import { Request, Response, NextFunction } from 'express';

// API key for gateway access
const WEB_GATEWAY_API_KEY = process.env.WEB_GATEWAY_API_KEY;

if (!WEB_GATEWAY_API_KEY) {
  throw new Error('WEB_GATEWAY_API_KEY environment variable is not set.');
}

/**
 * API Key Authentication Middleware
 * Ensures only authorized clients can access the gateway.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip API key check for health endpoint
  if (req.path === '/health') {
    next();
    return;
  }

  // For all other endpoints, require API key
  const webGatewayAPIKeyHeader = req.headers['x-web-gateway-api-key'] as string;
  if (webGatewayAPIKeyHeader !== WEB_GATEWAY_API_KEY) {
    console.error(`Unauthorized gateway access attempt using key: ${webGatewayAPIKeyHeader ? webGatewayAPIKeyHeader.substring(0, 5) + '...' : 'None'} from ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'Unauthorized access to gateway'
    });
    return;
  }
  
  next();
};