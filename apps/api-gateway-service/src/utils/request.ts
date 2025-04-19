// /**
//  * Request Utilities
//  * 
//  * Utilities for forwarding requests to backend services.
//  */
// import express from 'express';
// import axios from 'axios';
// import { User } from '../types/index.js';

// /**
//  * Forward a request to a backend service
//  * Handles different HTTP methods and passes user information via headers
//  * 
//  * @param req Express request
//  * @param res Express response
//  * @param serviceUrl URL of the target service
//  * @param path Path to forward to
//  */
// export const forwardRequest = async (
//   req: express.Request,
//   res: express.Response, 
//   serviceUrl: string,
//   path: string
// ) => {
//   // Build target URL
//   const targetUrl = `${serviceUrl}${path}`;
  
//   // Get user info from middleware
//   const userId = req.user ? (req.user as User).id : undefined;
//   const apiKey = req.headers['x-api-key'] as string | undefined;
//   const agentId = req.headers['x-agent-id'] as string | undefined;
  
//   // Set up headers to include user ID and API key if available
//   const headers = {
//     'Content-Type': 'application/json',
//     ...(userId && { 'x-user-id': userId }),
//     ...(apiKey && { 'x-api-key': apiKey }),
//     ...(agentId && { 'x-agent-id': agentId }),
//     // Add host header for proper internal routing
//     'host': new URL(serviceUrl).host
//   };

//   try {
//     console.log(`Forwarding ${req.method} request to: ${targetUrl}`);
    
//     let response;
    
//     // Handle different HTTP methods
//     switch (req.method) {
//       case 'GET':
//         // Forward the original query parameters
//         response = await axios.get(targetUrl, { 
//           headers,
//           params: req.query // Forward query parameters from original request
//         });
//         break;
//       case 'POST':
//         response = await axios.post(targetUrl, req.body, { headers });
//         break;
//       case 'PUT':
//         response = await axios.put(targetUrl, req.body, { headers });
//         break;
//       case 'DELETE':
//         response = await axios.delete(targetUrl, { headers });
//         break;
//       default:
//         // For unsupported methods, return 405 Method Not Allowed
//         return res.status(405).json({
//           success: false,
//           error: 'API Gateway Service: Method not allowed'
//         });
//     }
    
//     // Return the response from the target service
//     return res.status(response.status).json(response.data);
//   } catch (error) {
//     console.error(`Error forwarding request to ${targetUrl}:`, error);
    
//     let statusCode = 500;
//     let errorMessage = 'API Gateway Service: Error forwarding request';
//     let errorDetails = 'Unknown error';
    
//     // Handle various error types
//     if (axios.isAxiosError(error)) {
//       if (!error.response) {
//         // Connection error - cannot connect to service
//         statusCode = 502; // Bad Gateway
//         errorMessage = `API Gateway Service: Could not connect to service`;
//         errorDetails = error.message;
        
//         console.error(`Connection error to ${targetUrl}: ${error.message}`);
//       } else {
//         // Service returned an error response
//         statusCode = error.response.status;
//         errorMessage = error.response.data?.error || errorMessage;
//         errorDetails = error.response.data?.details || error.message;
//       }
//     } else if (error instanceof Error) {
//       errorDetails = error.message;
//     }
    
//     // Return structured error response
//     return res.status(statusCode).json({
//       success: false,
//       error: errorMessage,
//       details: errorDetails,
//       userId: userId
//     });
//   }
// }; 