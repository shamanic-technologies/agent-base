import express from 'express';
import axios from 'axios';

async function logToService(req: express.Request) {
  try {
    const loggingServiceUrl = process.env.LOGGING_SERVICE_URL;
    if (!loggingServiceUrl) {
      throw new Error('LOGGING_SERVICE_URL not set');
    }
    await axios.post(`${loggingServiceUrl}/api-logs`, req);
  } catch (error) {
    throw new Error('Failed to log to service:' + error);
  }
}

export const apiLoggerMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip logging for health checks
  if (req.path === '/health') {
    return next();
  }

  // Log asynchronously - forward the entire request
  logToService(req).catch(console.error);

  // Continue processing the request
  next();
}; 