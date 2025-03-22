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
config({ path: '.env.local' });

// Set up logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Validate required environment variables
function validateEnv() {
  const requiredVars = ['PORT', 'DATABASE_SERVICE_URL', 'PAYMENT_SERVICE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  logger.info('All required environment variables are set');
  logger.info(`Environment configuration:
  PORT: ${process.env.PORT}
  DATABASE_SERVICE_URL: ${process.env.DATABASE_SERVICE_URL}
  PAYMENT_SERVICE_URL: ${process.env.PAYMENT_SERVICE_URL}
  LOG_LEVEL: ${process.env.LOG_LEVEL || 'info (default)'}
`);
}

// Validate environment before proceeding
validateEnv();

// Initialize Express app
const app = express();
const server = createServer(app);
const port = process.env.PORT;
const router = Router();

// Service URLs from environment variables
const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;


// Middleware
app.use(cors());
app.use(bodyParser.json());

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
 * @throws Error if database connection or initialization fails
 */
async function initDatabase(): Promise<void> {
  try {
    // Check connection to database service
    logger.info(`Checking database service at ${DB_SERVICE_URL}`);
    
    // Check if api_logs collection exists
    const response = await fetch(`${DB_SERVICE_URL}/db`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = `Failed to connect to database service: ${response.status} ${response.statusText}`;
      logger.error(errorText);
      throw new Error(errorText);
    }

    const data = await response.json() as any;
    
    if (!data.success) {
      throw new Error(`Database service returned error: ${data.error || 'Unknown error'}`);
    }
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from database service');
    }
    
    const collections = data.data.map((c: any) => c.name);
    logger.info(`Found collections in database: ${collections.join(', ') || 'none'}`);
    
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
      
      const createResult = await logApiCall(dummyLog);
      if (!createResult) {
        throw new Error('Failed to create api_logs collection');
      }
      
      logger.info('api_logs collection created successfully');
    } else {
      logger.info('api_logs collection already exists');
    }
    
    logger.info('Database initialization complete');
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `Database initialization failed: ${error.message}` 
      : 'Database initialization failed with unknown error';
    
    logger.error(errorMessage);
    throw error; // Re-throw the error to stop the server
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

/**
 * Debit usage cost from user's account via payment service
 * @param userId The user ID to debit
 * @param amount The amount to debit (in USD)
 * @param description Description of the usage
 * @returns Success status and any error message
 */
async function debitUsage(userId: string, amount: number, description: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Skip debiting if amount is too small
    if (amount < 0.001) {
      logger.info(`Skipping payment debit for user ${userId} - amount ${amount} is too small (less than $0.001)`);
      return { success: true };
    }

    logger.info(`Debiting ${amount.toFixed(6)} USD from user ${userId} for ${description}`);
    
    // Direct connection to payment service
    const debitUrl = `${PAYMENT_SERVICE_URL}/payment/deduct-credit`;
    
    try {
      const response = await fetch(debitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          amount,
          description
        })
      });
      
      // Check for network or connection errors
      if (!response) {
        throw new Error('No response received from payment service');
      }
      
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data?: {
          transaction?: { id: string };
          newBalance?: number;
        }
      };
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Failed to debit usage: ${response.status}`;
        logger.error(`Payment service error: ${errorMessage}`, data);
        return { success: false, error: errorMessage };
      }
      
      logger.info(`Successfully debited ${amount.toFixed(6)} USD from user ${userId}`, {
        transaction: data.data?.transaction?.id,
        newBalance: data.data?.newBalance
      });
      
      return { success: true };
    } catch (fetchError) {
      // Specific handling for network/connection errors
      const errorMessage = fetchError instanceof Error 
        ? `Network error connecting to payment service: ${fetchError.message}`
        : 'Unknown network error connecting to payment service';
      
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    logger.error(`Failed to debit usage for user ${userId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error debiting usage'
    };
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
    
    // Log the API call first
    const logId = await logApiCall(logEntry);
    
    if (!logId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to log API call'
      });
    }
    
    // Debit the usage cost from the user's account if price is set
    const price = logEntry.price || calculatePrice(logEntry);
    
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
  try {
    await initDatabase();
    logger.info('Service is fully initialized and ready to accept requests');
  } catch (error) {
    logger.error('Service started with database initialization failure');
    logger.warn('Failed to initialize database, will retry periodically');
    
    // Retry initialization periodically
    setInterval(async () => {
      try {
        await initDatabase();
        logger.info('Successfully initialized database on retry');
      } catch (retryError) {
        logger.error('Failed to initialize database on retry');
      }
    }, 60000); // Retry every minute
  }
});

// Helper function to calculate price if not explicitly provided
function calculatePrice(logEntry: ApiLogEntry): number {
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
  
  return price;
} 