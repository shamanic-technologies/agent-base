/**
 * API Gateway Middleware for Logging
 * 
 * Middleware to be used in the API Gateway service to log API calls.
 * This file can be imported directly by the API Gateway service.
 */
import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';
import { User } from '../types/index.js';

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
  
  // Log request details - raw, no sanitization
  console.log(`[${reqId}] 📥 ${req.method} ${req.path} - Client: ${req.ip}`);
  
  if (Object.keys(req.query).length > 0) {
    console.log(`[${reqId}] Query params:`, req.query);
  }
  
  // Log raw headers - no sanitization
  console.log(`[${reqId}] Headers:`, req.headers);
  
  // Log raw body content for non-GET requests
  if (req.method !== 'GET' && req.body) {
    console.log(`[${reqId}] Body:`, req.body);
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
    
    // Get the LOGGING_SERVICE_URL at runtime from environment variables
    const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL;
    
    // Send the log to the Logging Service
    if (LOGGING_SERVICE_URL) {
      try {
        // Get user ID from header - no fallbacks
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          throw new Error('x-user-id header is required for logging');
        }
        
        const logEntry = {
          userId,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: reqId,
          durationMs: responseTime,
          // Pass raw request/response bodies without any sanitization
          requestBody: req.body,
          // Pass all response bodies - let logging-service handle sanitization
          responseBody: typeof body === 'string' ? JSON.parse(body) : body
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

export default apiLoggerMiddleware; 