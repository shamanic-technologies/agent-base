/**
 * Database Service
 * 
 * Handles database operations for the logging service
 */
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { ApiLogEntry } from '../types/index.js';
import { parseTokenUsage, calculatePrice } from '../utils/index.js';

// Set up logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Database service URL is accessed directly from environment in each function
// to ensure it's always using the current value

/**
 * Initialize database tables for logging
 * @throws Error if database connection or initialization fails
 */
export async function initDatabase(): Promise<void> {
  try {
    // Get database service URL from environment
    const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;
    if (!DB_SERVICE_URL) {
      throw new Error('DATABASE_SERVICE_URL environment variable is not defined');
    }
    
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
 * @throws Error if token usage cannot be determined for generate endpoints
 */
export async function logApiCall(logEntry: ApiLogEntry): Promise<string | null> {
  try {
    // Get database service URL from environment
    const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;
    if (!DB_SERVICE_URL) {
      throw new Error('DATABASE_SERVICE_URL environment variable is not defined');
    }
    
    const id = logEntry.id || uuidv4();
    const timestamp = logEntry.timestamp || new Date().toISOString();
    
    // Validate required userId
    if (!logEntry.userId) {
      throw new Error('[LOGGING SERVICE] userId is required for logging API calls');
    }

    // Calculate price using the imported calculatePrice function
    let price = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    
    // For generate endpoints, calculate price based on tokens
    if (logEntry.endpoint.startsWith('/generate')) {
      // Use the calculatePrice function from utils
      price = calculatePrice(logEntry);
      
      // Extract token information if available for storage
      if (logEntry.responseBody) {
        const tokenUsage = parseTokenUsage(logEntry.responseBody);
        inputTokens = tokenUsage.inputTokens;
        outputTokens = tokenUsage.outputTokens;
      }
    } else if (logEntry.endpoint.startsWith('/utility')) {
      // Fixed price for utility calls
      price = 0.01;
    }

    // Send userId in both the X-USER-ID header for authentication
    // and include it in the request body data
    const response = await fetch(`${DB_SERVICE_URL}/db/api_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-USER-ID': logEntry.userId // Using standard header format for authentication
      },
      body: JSON.stringify({
        id,
        data: {
          api_key: logEntry.apiKey,
          user_id: logEntry.userId, // Include user_id in the data object as well
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
export async function getUserLogs(userId: string, limit = 100, offset = 0): Promise<any[] | null> {
  try {
    // Get database service URL from environment
    const DB_SERVICE_URL = process.env.DATABASE_SERVICE_URL;
    if (!DB_SERVICE_URL) {
      throw new Error('DATABASE_SERVICE_URL environment variable is not defined');
    }
    
    // Use the database service's query parameter to filter by user_id
    // This creates a proper SQL query for the JSONB data field
    const queryParam = encodeURIComponent(JSON.stringify({ "data.user_id": userId }));
    
    logger.info(`Getting logs for user ${userId} with query: ${queryParam}`);
    
    const response = await fetch(`${DB_SERVICE_URL}/db/api_logs?query=${queryParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-USER-ID': userId
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

