/**
 * Database Module for Logging Service
 * 
 * Handles PostgreSQL connection and operations for API call logging.
 */
import { Pool, PoolClient } from 'pg';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

// Initialize PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Event handlers for the connection pool
pgPool.on('connect', () => {
  console.log('New client connected to PostgreSQL pool');
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('PostgreSQL connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Initialize the database schema
 * @returns {Promise<boolean>} True if initialization is successful
 */
export async function initializeDatabase(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();

    // Create API logs table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER,
        ip_address VARCHAR(50),
        user_agent TEXT,
        request_id VARCHAR(100),
        request_body JSONB,
        response_body JSONB,
        duration_ms INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )
    `);
    
    // Create index on api_key for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_logs (api_key)
    `);
    
    // Create index on timestamp for faster retention queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs (timestamp)
    `);

    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database schema:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Log API call to database
 */
export interface ApiLogEntry {
  apiKey: string;
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
}

/**
 * Save an API call log to the database
 * @param logEntry The API log entry to save
 * @returns {Promise<string>} The ID of the created log entry
 */
export async function logApiCall(logEntry: ApiLogEntry): Promise<string> {
  let client: PoolClient | null = null;
  try {
    const id = uuidv4();
    client = await pgPool.connect();
    
    const {
      apiKey,
      endpoint,
      method,
      statusCode,
      ipAddress,
      userAgent,
      requestId,
      requestBody,
      responseBody,
      durationMs,
      errorMessage
    } = logEntry;
    
    const query = `
      INSERT INTO api_logs (
        id, api_key, endpoint, method, status_code, ip_address, user_agent,
        request_id, request_body, response_body, duration_ms, error_message
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING id
    `;
    
    const values = [
      id,
      apiKey,
      endpoint,
      method,
      statusCode || null,
      ipAddress || null,
      userAgent || null,
      requestId || null,
      requestBody ? JSON.stringify(requestBody) : null,
      responseBody ? JSON.stringify(responseBody) : null,
      durationMs || null,
      errorMessage || null
    ];
    
    await client.query(query, values);
    return id;
  } catch (error) {
    console.error('Error logging API call:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

/**
 * Get logs for a specific API key
 * @param apiKey The API key to filter by
 * @param limit Maximum number of logs to return
 * @param offset Pagination offset
 * @returns {Promise<any[]>} The logs for the API key
 */
export async function getApiKeyLogs(apiKey: string, limit = 100, offset = 0): Promise<any[]> {
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();
    
    const query = `
      SELECT * FROM api_logs 
      WHERE api_key = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await client.query(query, [apiKey, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error getting API key logs:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

/**
 * Clean up old logs based on retention policy
 * @param retentionDays Number of days to keep logs (0 = no deletion)
 * @returns {Promise<number>} Number of deleted log entries
 */
export async function cleanupOldLogs(retentionDays: number): Promise<number> {
  if (retentionDays <= 0) {
    return 0; // No cleanup needed
  }
  
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();
    
    const query = `
      DELETE FROM api_logs 
      WHERE timestamp < NOW() - INTERVAL '${retentionDays} days' 
      RETURNING id
    `;
    
    const result = await client.query(query);
    const deletedCount = result.rowCount || 0;
    console.log(`Cleaned up ${deletedCount} log entries older than ${retentionDays} days`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

/**
 * Get statistics for API usage
 * @param timeframe Timeframe in days (default: 30)
 * @returns {Promise<any>} API usage statistics
 */
export async function getApiUsageStats(timeframe = 30): Promise<any> {
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();
    
    const query = `
      SELECT 
        api_key,
        COUNT(*) as total_calls,
        AVG(duration_ms) as avg_duration,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_calls,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_calls,
        MIN(timestamp) as first_call,
        MAX(timestamp) as last_call
      FROM api_logs
      WHERE timestamp > NOW() - INTERVAL '${timeframe} days'
      GROUP BY api_key
      ORDER BY total_calls DESC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting API usage stats:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
} 