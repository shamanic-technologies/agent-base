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
  price?: number;  // New field for pricing
  inputTokens?: number; // Total input tokens
  outputTokens?: number; // Total output tokens
}

/**
 * Parse token usage from LangChain response body
 * @param responseBody The response body from a /generate call
 * @returns Object containing total input and output tokens
 */
function parseTokenUsage(responseBody: any): { inputTokens: number, outputTokens: number } {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Check if responseBody has the expected structure
    if (!responseBody || !responseBody.messages || !Array.isArray(responseBody.messages)) {
      logger.warn('Response body does not have expected structure for token counting');
      return { inputTokens: 0, outputTokens: 0 };
    }

    // Iterate through all messages
    for (const message of responseBody.messages) {
      // Look for AIMessageChunk objects which contain usage metadata
      if (message?.id && 
          Array.isArray(message.id) && 
          message.id.includes("AIMessageChunk") &&
          message?.kwargs?.usage_metadata) {
        
        const metadata = message.kwargs.usage_metadata;
        
        // Extract token counts, if they're not redacted
        if (metadata.input_tokens && metadata.input_tokens !== "[REDACTED]") {
          const inputTokens = parseInt(metadata.input_tokens, 10);
          if (!isNaN(inputTokens)) {
            totalInputTokens += inputTokens;
            logger.debug(`Found ${inputTokens} input tokens in message ${message.kwargs?.id || 'unknown'}`);
          }
        }
        
        if (metadata.output_tokens && metadata.output_tokens !== "[REDACTED]") {
          const outputTokens = parseInt(metadata.output_tokens, 10);
          if (!isNaN(outputTokens)) {
            totalOutputTokens += outputTokens;
            logger.debug(`Found ${outputTokens} output tokens in message ${message.kwargs?.id || 'unknown'}`);
          }
        }
      }
    }
    
    // If we couldn't parse any tokens but found [REDACTED] values, log this information
    const foundRedactedValues = responseBody.messages.some(
      (msg: any) => msg?.kwargs?.usage_metadata?.input_tokens === "[REDACTED]" || 
                   msg?.kwargs?.usage_metadata?.output_tokens === "[REDACTED]"
    );
    
    if (totalInputTokens === 0 && totalOutputTokens === 0 && foundRedactedValues) {
      logger.info('Token counts are redacted in the response. Using estimation based on message length.');
      
      // Simple estimation based on human-readable content length
      // This is a fallback when token counts are redacted
      for (const message of responseBody.messages) {
        if (message?.kwargs?.content) {
          // Estimate tokens from content - rough approximation (~4 chars per token)
          const content = Array.isArray(message.kwargs.content) 
            ? message.kwargs.content.map((c: any) => c.text || "").join("")
            : String(message.kwargs.content);
            
          const estimatedTokens = Math.ceil(content.length / 4);
          
          if (message.id && Array.isArray(message.id)) {
            if (message.id.includes("HumanMessage")) {
              totalInputTokens += estimatedTokens;
            } else if (message.id.includes("AIMessageChunk")) {
              totalOutputTokens += estimatedTokens;
            }
          }
        }
      }
      
      logger.info(`Estimated tokens: ${totalInputTokens} input, ${totalOutputTokens} output`);
    }
    
    return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
  } catch (error) {
    logger.error('Error parsing token usage:', error);
    return { inputTokens: 0, outputTokens: 0 };
  }
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

    // Initialize pricing variables
    let price = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    // Calculate price based on endpoint
    if (logEntry.endpoint.startsWith('/utility')) {
      // Fixed price for utility calls
      price = 0.01;
    } else if (logEntry.endpoint.startsWith('/generate')) {
      // Token-based pricing for generate calls
      if (logEntry.responseBody) {
        // Parse token usage from the response body
        const tokenUsage = parseTokenUsage(logEntry.responseBody);
        inputTokens = tokenUsage.inputTokens;
        outputTokens = tokenUsage.outputTokens;
        
        // Calculate price based on token counts
        // Input tokens: $0.000006 per token
        // Output tokens: $0.00003 per token
        const inputPrice = inputTokens * 0.000006;
        const outputPrice = outputTokens * 0.00003;
        price = inputPrice + outputPrice;
        
        logger.info(`Calculated token-based price for ${logEntry.endpoint}: $${price.toFixed(6)} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
      } else {
        // Fallback to fixed price if response body parsing fails
        price = 0.20;
        logger.warn(`Using fallback fixed price for ${logEntry.endpoint}: $${price.toFixed(2)} (no token data available)`);
      }
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
          user_id: logEntry.userId,
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
          price: logEntry.price || price,
          input_tokens: logEntry.inputTokens || inputTokens,
          output_tokens: logEntry.outputTokens || outputTokens,
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