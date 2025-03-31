import express from 'express';
import axios from 'axios';

/**
 * Logs request data to the logging service
 * @param req Express request object
 */
async function logToService(req: express.Request) {
  try {
    const loggingServiceUrl = process.env.LOGGING_SERVICE_URL;
    if (!loggingServiceUrl) {
      throw new Error('LOGGING_SERVICE_URL not set');
    }
    
    // Extract only serializable data from the request
    const requestData = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };
    
    await axios.post(`${loggingServiceUrl}/api-logs/me`, requestData);
  } catch (error) {
    throw new Error('Failed to log to service:' + error);
  }
}

/**
 * Middleware to log API requests to the logging service
 */
export const apiLoggerMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip logging for health checks
  if (req.path === '/health') {
    return next();
  }

  // Log asynchronously - forward relevant request data
  logToService(req).catch(console.error);

  // Continue processing the request
  next();
}; 