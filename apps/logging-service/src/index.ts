/**
 * Logging Service
 * 
 * Service for recording API Gateway requests with API keys to the database.
 * Uses the database-service for persistence.
 */
import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'node:http';
import { setTimeout } from 'node:timers/promises';
import pino from 'pino';

// Load environment variables
config();

// Initialize Express app
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3900;
const router = Router();

// Database service URL from environment variable
const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Set up logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

/**
 * Interface for API call log entry
 */
export interface ApiLogEntry {
  id?: string;
  apiKey: string;
  userId: string;  // Required user_id field
  endpoint: string;
  method: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requestBody?: any;
  responseBody?: any;
  durationMs?: number;
  errorMessage?: string;
  timestamp?: string;
}

/**
 * Initialize database tables for logging
 */
async function initDatabase(): Promise<boolean> {
  try {
    // Check if api_logs collection exists
    const response = await fetch(`${DB_SERVICE_URL}/db`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      logger.error(`Failed to get collections: ${response.status}`);
      return false;
    }

    const data = await response.json() as any;
    const collections = data.data.map((c: any) => c.name);
    
    // If api_logs collection doesn't exist, create it
    if (!collections.includes('api_logs')) {
      logger.info('Creating api_logs collection');
      
      // Database service doesn't have a direct "create table" endpoint,
      // so we'll create it by inserting a dummy record
      const dummyLog: ApiLogEntry = {
        id: uuidv4(),
        apiKey: 'setup',
        userId: 'setup',
        endpoint: '/setup',
        method: 'GET',
        statusCode: 200,
        timestamp: new Date().toISOString()
      };
      
      await logApiCall(dummyLog);
      logger.info('api_logs collection created');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize database', error);
    return false;
  }
}

/**
 * Log an API call to the database
 * @param logEntry The API call log entry
 * @returns The created log entry ID
 */
async function logApiCall(logEntry: ApiLogEntry): Promise<string | null> {
  try {
    const id = logEntry.id || uuidv4();
    const timestamp = logEntry.timestamp || new Date().toISOString();
    
    // Validate required userId
    if (!logEntry.userId) {
      throw new Error('[LOGGING SERVICE] userId is required for logging API calls');
    }

    const response = await fetch(`${DB_SERVICE_URL}/db/api_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        data: {
          api_key: logEntry.apiKey,
          user_id: logEntry.userId,  // Store user_id in the log
          endpoint: logEntry.endpoint,
          method: logEntry.method,
          status_code: logEntry.statusCode,
          ip_address: logEntry.ipAddress,
          user_agent: logEntry.userAgent,
          request_id: logEntry.requestId,
          request_body: logEntry.requestBody,
          response_body: logEntry.responseBody,
          duration_ms: logEntry.durationMs,
          error_message: logEntry.errorMessage,
          timestamp
        }
      })
    });
    
    if (!response.ok) {
      logger.error(`Failed to log API call: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as any;
    return data.data.id;
  } catch (error) {
    logger.error('Error logging API call', error);
    return null;
  }
}

/**
 * Get logs for a specific user
 * @param userId The user ID to filter by
 * @param limit Maximum number of logs to return
 * @param offset Pagination offset
 * @returns The logs for the user
 */
async function getUserLogs(userId: string, limit = 100, offset = 0): Promise<any[] | null> {
  try {
    // Use the database service's query parameter to filter by user_id
    // This creates a proper SQL query for the JSONB data field
    const queryParam = encodeURIComponent(JSON.stringify({ "data.user_id": userId }));
    
    logger.info(`Getting logs for user ${userId} with query: ${queryParam}`);
    
    const response = await fetch(`${DB_SERVICE_URL}/db/api_logs?query=${queryParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      logger.error(`Failed to get API logs: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as any;
    logger.info(`Found ${data.data?.items?.length || 0} logs for user ${userId}`);
    
    if (!data.success || !data.data || !data.data.items) {
      logger.error('Unexpected response structure from database service');
      return null;
    }
    
    // The items are already filtered by the database query
    // Just sort and paginate them
    const logs = data.data.items
      .sort((a: any, b: any) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime())
      .slice(offset, offset + limit);
    
    return logs;
  } catch (error) {
    logger.error('Error getting user logs', error);
    return null;
  }
}

// API Routes

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
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const logEntry = req.body as ApiLogEntry;
    
    // Validate required fields
    if (!logEntry.apiKey || !logEntry.userId || !logEntry.endpoint || !logEntry.method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: apiKey, userId, endpoint, method'
      });
    }
    
    // Add client IP and user agent if not provided
    if (!logEntry.ipAddress) {
      logEntry.ipAddress = req.ip;
    }
    
    if (!logEntry.userAgent && req.headers['user-agent']) {
      logEntry.userAgent = req.headers['user-agent'];
    }
    
    const logId = await logApiCall(logEntry);
    
    if (!logId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to log API call'
      });
    }
    
    res.status(201).json({
      success: true,
      data: { id: logId }
    });
  } catch (error) {
    logger.error('Error in /log endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get logs for a user
 */
router.get('/logs/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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

/**
 * Get all logs with pagination
 */
router.get('/logs/all', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');
    
    logger.info(`Getting all logs with limit: ${limit}, offset: ${offset}`);
    
    // Get all logs from the database service
    const response = await fetch(`${DB_SERVICE_URL}/db/api_logs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      logger.error(`Failed to get API logs: ${response.status}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get logs'
      });
    }
    
    const data = await response.json() as any;
    
    // Debug the response structure
    logger.info(`Retrieved ${data.data?.items?.length || 0} logs from database`);
    
    // Check if the response has the expected structure
    if (!data.success || !data.data || !data.data.items) {
      logger.error('Unexpected response structure from database service');
      return res.status(500).json({
        success: false,
        error: 'Invalid response from database service'
      });
    }
    
    const logs = data.data.items
      .sort((a: any, b: any) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime())
      .slice(offset, offset + limit);
    
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error in /logs/all endpoint', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Metrics endpoint (for monitoring)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  // Simple metrics for now, could be expanded with Prometheus or similar
  res.status(200).json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    date: new Date().toISOString()
  });
});

// Mount router
app.use('/', router);

// Start server
server.listen(port, async () => {
  logger.info(`Logging service listening on port ${port}`);
  
  // Initialize database
  const initialized = await initDatabase();
  
  if (!initialized) {
    logger.warn('Failed to initialize database, will retry periodically');
    
    // Retry initialization periodically
    setInterval(async () => {
      const retry = await initDatabase();
      if (retry) {
        logger.info('Successfully initialized database on retry');
      }
    }, 60000); // Retry every minute
  }
}); 