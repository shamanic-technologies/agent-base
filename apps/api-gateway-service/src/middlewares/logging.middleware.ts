// import express from 'express';
// import axios from 'axios';

// /**
//  * Logs request data to the logging service
//  * @param req Express request object
//  */
// async function logToService(req: express.Request) {
//   try {
//     const loggingServiceUrl = process.env.LOGGING_SERVICE_URL;
//     if (!loggingServiceUrl) {
//       throw new Error('LOGGING_SERVICE_URL not set');
//     }
    
//     // Extract only serializable data from the request
//     const requestData = {
//       headers: req.headers,
//       method: req.method,
//       url: req.originalUrl || req.url,
//       path: req.path,
//       query: req.query,
//       body: req.body,
//       ip: req.ip,
//       timestamp: new Date().toISOString()
//     };

//     // Prepare headers for the logging request
//     const loggingHeaders: Record<string, string> = {};
//     if (req.platformUserId) { // Assuming auth middleware adds this
//       loggingHeaders['x-platform-user-id'] = req.platformUserId;
//     }
//     if (req.clientUserId) { // Assuming auth middleware adds this
//       loggingHeaders['x-client-user-id'] = req.clientUserId;
//     }
//     // Add other necessary headers if required by logging service authentication

//     await axios.post(`${loggingServiceUrl}/api-logs/me`, requestData, {
//       headers: loggingHeaders
//     });
//   } catch (error) {
//     // Avoid logging failures breaking the main request flow
//     console.error('Failed to log to service:', error instanceof Error ? error.message : String(error));
//     // Do not re-throw here to prevent breaking the request if logging fails
//   }
// }

// /**
//  * Middleware to log API requests to the logging service
//  */
// export const apiLoggerMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//   // Skip logging for health checks
//   if (req.path === '/health') {
//     return next();
//   }

//   // Log asynchronously - forward relevant request data
//   logToService(req).catch(console.error);

//   // Continue processing the request
//   next();
// }; 