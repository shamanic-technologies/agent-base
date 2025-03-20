/**
 * API Gateway Middleware for Logging
 * 
 * Middleware to be used in the API Gateway service to log API calls.
 * This file can be imported directly by the API Gateway service.
 */
import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://localhost:3900';

/**
 * Middleware to log API calls to the logging service
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export const apiLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Extract API key from Authorization header (Bearer token)
  const authHeader = req.headers['authorization'] as string;
  let apiKey = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else {
    console.error('[API Gateway] Authentication error: Missing or invalid Authorization header');
    return res.status(401).json({
      success: false,
      error: '[API Gateway] Bearer token is required'
    });
  }
  
  const originalSend = res.send;
  let responseBody: any = null;

  // Only log requests with API keys
  if (!apiKey) {
    return next();
  }

  // Capture response body
  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Process request when it completes
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      // Parse request and response bodies if they're JSON strings
      let parsedRequestBody = req.body;
      let parsedResponseBody = null;
      
      try {
        if (responseBody && typeof responseBody === 'string') {
          parsedResponseBody = JSON.parse(responseBody);
        } else {
          parsedResponseBody = responseBody;
        }
      } catch (e) {
        // If parsing fails, use the raw body
        parsedResponseBody = { raw: responseBody ? String(responseBody).substring(0, 500) : null };
      }
      
      // Sanitize bodies to prevent sensitive data logging
      const sanitizedRequestBody = sanitizeBody(parsedRequestBody);
      const sanitizedResponseBody = sanitizeBody(parsedResponseBody);
      
      // User ID must be in the request object, set by validateApiKey
      const userId = (req as any).userId;
      
      if (!userId) {
        throw new Error('[API GATEWAY] User ID not found for logging. Unable to log API call.');
      }
      
      // Log the API call
      await fetch(`${LOGGING_SERVICE_URL}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          userId,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.headers['x-request-id'] as string || (req as any).id,
          requestBody: sanitizedRequestBody,
          responseBody: sanitizedResponseBody,
          durationMs: duration
        })
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
      // Don't block the response if logging fails
    }
  });

  next();
};

/**
 * Sanitize request/response bodies to prevent logging sensitive data
 * @param body The body to sanitize
 * @returns Sanitized body
 */
function sanitizeBody(body: any): any {
  if (!body) return null;
  
  // If it's not an object, return as is
  if (typeof body !== 'object') return body;
  
  // Clone the body to avoid modifying the original
  const sanitized = Array.isArray(body) ? [...body] : { ...body };
  
  // List of sensitive fields to redact
  // Note: 'token' is intentionally excluded to allow token usage counts to be logged
  // for pricing calculation purposes. This enables accurate cost tracking for API calls.
  const sensitiveFields = [
    'password', 'secret', 'api_key', 'apiKey', 'authorization',
    'credit_card', 'creditCard', 'ssn', 'social_security', 'socialSecurity'
  ];
  
  // Function to recursively sanitize an object
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } 
      // Recursively sanitize nested objects
      else if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

export default apiLoggerMiddleware; 