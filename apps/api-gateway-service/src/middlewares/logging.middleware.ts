/**
 * Simple API Gateway Logging Middleware - Direct Database Approach
 */
import express from 'express';
import axios from 'axios';

export const apiLoggerMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`[DIRECT DB] LOGGING REQUEST: ${req.method} ${req.path}`);
  
  // Use ANY identifier we can find
  const userId = req.headers['x-user-id'] || req.headers['x-api-key'] || 'unknown-user';
  const apiKey = req.headers['x-api-key'] || 'unknown-api-key';

  // Generate a unique request ID
  const requestId = Math.random().toString(36).substring(2, 10);
  
  // Create log entry with direct database field names (snake_case)
  // This matches what the database is expecting
  const dbLogEntry = {
    data: {
      user_id: userId,
      api_key: apiKey,
      endpoint: req.originalUrl,
      method: req.method,
      status_code: 200,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_id: requestId,
      request_body: req.body,
      timestamp: new Date().toISOString(),
      conversation_id: req.body?.conversation_id || 'none'
    }
  };

  console.log(`[${requestId}] DB ENTRY:`, JSON.stringify(dbLogEntry));

  try {
    // Write directly to the database using the correct field names
    console.log(`[${requestId}] WRITING DIRECTLY TO DATABASE: http://localhost:3006/db/api_logs`);
    const dbResponse = await axios.post(`http://localhost:3006/db/api_logs`, dbLogEntry, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`[${requestId}] DATABASE RESPONSE:`, dbResponse.status, JSON.stringify(dbResponse.data));
  } catch (error) {
    console.error(`[${requestId}] DATABASE ERROR:`, error.message);
  }

  // Continue processing the request
  next();
};

export default apiLoggerMiddleware; 