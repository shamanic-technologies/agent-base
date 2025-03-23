/**
 * API Gateway Middleware for Logging
 * 
 * Middleware to be used in the API Gateway service to log API calls.
 * This file can be imported directly by the API Gateway service.
 */
import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';

const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL;

/**
 * API Logger Middleware
 * Logs information about incoming API requests
 */
export const apiLoggerMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip logging for health checks to reduce noise
  if (req.path === '/health') {
    next();
    return;
  }

  const startTime = Date.now();
  const reqId = Math.random().toString(36).substring(2, 10);
  
  // Log request details
  console.log(`[${reqId}] 📥 ${req.method} ${req.path} - Client: ${req.ip}`);
  
  if (Object.keys(req.query).length > 0) {
    console.log(`[${reqId}] Query params:`, req.query);
  }
  
  // Create a copy of the headers without sensitive data
  const safeHeaders = { ...req.headers };
  delete safeHeaders.authorization;
  delete safeHeaders['x-api-key'];
  
  console.log(`[${reqId}] Headers:`, safeHeaders);
  
  // Log masked body content for non-GET requests (limit size to avoid huge logs)
  if (req.method !== 'GET' && req.body) {
    const maskedBody = { ...req.body };
    
    // Mask any sensitive fields
    if (maskedBody.apiKey) maskedBody.apiKey = '[REDACTED]';
    if (maskedBody.password) maskedBody.password = '[REDACTED]';
    if (maskedBody.token) maskedBody.token = '[REDACTED]';
    
    console.log(`[${reqId}] Body:`, JSON.stringify(maskedBody).substring(0, 500));
    if (JSON.stringify(maskedBody).length > 500) {
      console.log(`[${reqId}] Body truncated...`);
    }
  }
  
  // Intercept the response to log its status
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    console.log(`[${reqId}] 📤 ${res.statusCode} ${req.method} ${req.path} - ${responseTime}ms`);
    
    // If there's an error response (4xx or 5xx), log more details
    if (res.statusCode >= 400) {
      try {
        const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
        console.error(`[${reqId}] Error response:`, responseBody);
      } catch (e) {
        console.error(`[${reqId}] Error response (not JSON):`, body);
      }
    }
    
    // Send the log to the Logging Service
    if (LOGGING_SERVICE_URL) {
      try {
        const userId = req.user?.id || req.headers['x-user-id'] as string || 'anonymous';
        const logEntry = {
          userId,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: reqId,
          durationMs: responseTime,
          // Add sanitized versions of request/response bodies
          requestBody: sanitizeBody(req.body),
          responseBody: res.statusCode < 400 ? null : sanitizeBody(typeof body === 'string' ? JSON.parse(body) : body),
        };
        
        // Log that we're about to send to the logging service
        console.log(`[${reqId}] Sending log to ${LOGGING_SERVICE_URL}/log for user ${userId}`);
        
        // Use axios instead of fetch for better error handling and compatibility
        axios.post(`${LOGGING_SERVICE_URL}/log`, logEntry, {
          headers: {
            'Content-Type': 'application/json',
            // Pass the user ID in the header for authentication
            'x-user-id': userId,
            // Add host header for proper internal routing
            'host': new URL(LOGGING_SERVICE_URL).host
          }
        }).then(() => {
          console.log(`[${reqId}] Successfully sent log to logging service`);
        }).catch(error => {
          console.error(`[${reqId}] Failed to send log to logging service: ${error.message}`);
          if (error.response) {
            console.error(`Response status: ${error.response.status}, data:`, error.response.data);
          } else if (error.request) {
            console.error(`No response received from logging service`);
          }
        });
      } catch (error) {
        console.error(`[${reqId}] Error preparing or sending log to logging service:`, error);
      }
    } else {
      console.warn(`[${reqId}] LOGGING_SERVICE_URL not set, skipping remote logging`);
    }
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
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