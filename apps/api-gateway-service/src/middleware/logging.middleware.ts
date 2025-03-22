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
  // Skip authentication for health check endpoint
  if (req.path === '/health') {
    return next();
  }
  
  const startTime = Date.now();
  
  // Extract API key from X-API-KEY header
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    console.error('[API Gateway] Authentication error: Missing X-API-KEY header');
    return res.status(401).json({
      success: false,
      error: '[API Gateway] X-API-KEY header is required'
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
      
      // Get user ID - first check if req.user is set (by authMiddleware)
      // or fall back to checking for a userId property directly on req
      const userId = (req as any).user?.id || (req as any).userId;
      
      if (!userId) {
        console.error('[API GATEWAY] User ID not found for logging. Proceeding without user context.');
        // Don't throw an error, but still log without user ID
      }
      
      // Prepare request headers with standardized format
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add X-USER-ID header if available
      if (userId) {
        headers['X-USER-ID'] = userId;
      }
      
      // Log the API call
      await fetch(`${LOGGING_SERVICE_URL}/log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          apiKey,
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