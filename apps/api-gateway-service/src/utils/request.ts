/**
 * Request Utilities
 * 
 * Utilities for forwarding requests to backend services.
 */
import express from 'express';
import axios from 'axios';
import { User } from '../types/index.js';

/**
 * Forwards a request to a service
 * Passes user information via headers instead of in the request body
 */
export const forwardRequest = async (req: express.Request, res: express.Response, serviceUrl: string) => {
  // Build target URL by joining service URL with the request path
  const targetUrl = `${serviceUrl}${req.path}`;
  
  // Create the request configuration
  const headers = {
    'Content-Type': 'application/json',
    // Propagate user ID to downstream services if available
    ...(req.user && { 'x-user-id': (req.user as User).id }),
    // Include the original API key if available (for chained service calls)
    ...(req.headers['x-api-key'] && { 'x-api-key': req.headers['x-api-key'] as string })
  };
  
  try {
    console.log(`Forwarding ${req.method} request to: ${targetUrl}`);
    
    let response;
    
    // Use explicit method calls based on the request method
    switch (req.method) {
      case 'POST':
        console.log(`Making POST request to ${targetUrl} with body:`, JSON.stringify(req.body).substring(0, 200));
        response = await axios.post(targetUrl, req.body, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'GET':
        console.log(`Making GET request to ${targetUrl}`);
        response = await axios.get(targetUrl, { 
          headers,
          params: req.query,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'PUT':
        response = await axios.put(targetUrl, req.body, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      case 'DELETE':
        response = await axios.delete(targetUrl, { 
          headers,
          timeout: 120000 // 2 minutes
        });
        break;
        
      default:
        // Fallback to the generic method for other HTTP methods
        response = await axios({
          method: req.method,
          url: targetUrl,
          headers,
          data: req.body,
          timeout: 120000 // 2 minutes
        });
    }
    
    // Return the service response
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Error forwarding request to ${targetUrl}:`, error);
    
    let statusCode = 500;
    let errorMessage = 'API Gateway Service: Error communicating with service';
    let errorDetails = 'Unknown error';
    
    // Handle Axios errors with specialized error handling
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Connection error (no response received)
        console.error(`API Gateway connection error to ${serviceUrl}: ${error.message}`);
        statusCode = 502; // Bad Gateway
        errorMessage = `API Gateway Service: Could not connect to ${serviceUrl.split('/').slice(-1)[0] || 'service'}`;
        errorDetails = error.message;
      } else {
        // Service returned an error response
        console.error(`Service error response from ${serviceUrl}: ${error.response.status}`, error.response.data ? JSON.stringify(error.response.data) : 'No data');
        statusCode = error.response.status;
        errorMessage = error.response.data?.error || errorMessage;
        errorDetails = error.response.data?.details || error.message;
      }
    } else if (error instanceof Error) {
      // General JavaScript errors
      errorDetails = error.message;
      
      // Handle timeout errors specifically
      if (error.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'API Gateway Service: Request timed out';
        errorDetails = `Request to ${serviceUrl.split('/').slice(-1)[0] || 'service'} timed out after 120 seconds`;
      }
    }
    
    // Return structured error response
    return res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      details: errorDetails,
      userId: req.user ? (req.user as User).id : null
    });
  }
}; 