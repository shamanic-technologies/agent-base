/**
 * Route handlers for the logging service
 */
import { Router, Request, Response } from 'express';
import pino from 'pino';
import { ApiLogEntry } from '../types/index.js';
import { logApiCall, getUserLogs } from '../services/database.js';
import { debitUsage } from '../services/payment.js';
import { calculatePrice, sanitizeLogData } from '../utils/index.js';

// Get the logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Create router
const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'logging-service'
  });
});

/**
 * Log API call
 * This endpoint can be called directly from the API Gateway service
 * or forwarded by other services using the X-USER-ID header
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const logEntry = req.body as ApiLogEntry;
    const userId = req.headers['x-user-id'] as string;
    
    // If X-USER-ID header is provided, use it (preferred approach)
    if (userId) {
      logEntry.userId = userId;
      logger.info('Using X-USER-ID header for user identification');
    }
    
    // Complete validation of all required fields
    const missingFields: string[] = [];
    
    // Always required fields
    if (!logEntry.userId && !userId) missingFields.push('userId (X-USER-ID header)');
    if (!logEntry.endpoint) missingFields.push('endpoint');
    if (!logEntry.method) missingFields.push('method');
    
    // Required fields for pricing on both /generate and /utility endpoints
    if (logEntry.endpoint?.startsWith('/generate') || logEntry.endpoint?.startsWith('/utility')) {
      if (!logEntry.responseBody) missingFields.push('responseBody');
    }
    
    // Return early if any required fields are missing
    if (missingFields.length > 0) {
      logger.error(`Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Add client IP and user agent if not provided
    if (!logEntry.ipAddress) {
      logEntry.ipAddress = req.ip;
    }
    
    if (!logEntry.userAgent && req.headers['user-agent']) {
      logEntry.userAgent = req.headers['user-agent'];
    }
    
    // Make sure userId is always set from the header if available
    if (userId) {
      logEntry.userId = userId;
    }
    
    // Calculate price if not provided (for /generate and /utility endpoints)
    if (!logEntry.price && (logEntry.endpoint.startsWith('/generate') || logEntry.endpoint.startsWith('/utility'))) {
      try {
        // Calculate price before sanitizing response body
        logEntry.price = calculatePrice(logEntry);
      } catch (error) {
        // If price calculation fails, return error instead of using fallback
        logger.error(`Price calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return res.status(400).json({
          success: false,
          error: `Failed to calculate price: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    // Sanitize request body if present
    if (logEntry.requestBody) {
      logger.debug('Sanitizing request body');
      logEntry.requestBody = sanitizeLogData(logEntry.requestBody);
    }
    
    // Sanitize response body if present
    if (logEntry.responseBody) {
      logger.debug('Sanitizing response body');
      logEntry.responseBody = sanitizeLogData(logEntry.responseBody);
    }
    
    // Log the API call first
    try {
      const logId = await logApiCall(logEntry);
      
      if (!logId) {
        return res.status(500).json({
          success: false,
          error: 'Failed to log API call'
        });
      }
      
      // Use the already calculated price
      const price = logEntry.price || 0;
      
      if (price > 0) {
        // Generate a useful description
        const description = `API usage: ${logEntry.method} ${logEntry.endpoint}`;
        
        // Attempt to debit usage asynchronously - don't wait for result
        // This prevents payment service issues from blocking the logging API
        debitUsage(logEntry.userId, price, description)
          .then(result => {
            if (!result.success) {
              logger.warn(`Failed to debit usage for log ${logId}: ${result.error}`);
            }
          })
          .catch(error => {
            logger.error(`Exception in debit usage for log ${logId}:`, error);
          });
      }
      
      res.status(201).json({
        success: true,
        data: { id: logId }
      });
    } catch (logError) {
      logger.error(`Failed to log API call: ${logError instanceof Error ? logError.message : 'Unknown error'}`);
      return res.status(500).json({
        success: false,
        error: `Failed to log API call: ${logError instanceof Error ? logError.message : 'Unknown error'}`
      });
    }
  } catch (error) {
    logger.error('Error in /log endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get logs for a user (authenticated via headers)
 * Uses the user ID from x-user-id header that is set by the API Gateway auth middleware
 */
router.get('/logs/user', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      logger.warn('Missing x-user-id header in request to /logs/user');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - missing x-user-id header'
      });
    }
    
    logger.info(`Getting logs for user ${userId}`);
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await getUserLogs(userId, limit, offset);
    
    if (logs === null) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get logs'
      });
    }
    
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error in /logs/user endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 