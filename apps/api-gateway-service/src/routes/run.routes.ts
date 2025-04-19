// /**
//  * Run Service Proxy Routes
//  * 
//  * Configures routes under /run/* for proxying requests to the Agent Service.
//  * It applies authentication, injects necessary headers, and uses the createApiProxy utility.
//  */
// import express from 'express';
// import { createApiProxy } from '../utils/proxy.util.js';
// import { injectCustomHeaders } from '../middlewares/header.middleware.js';

// /**
//  * Configures routes for agent runs, proxying them to the Agent Service.
//  *
//  * @param {express.Router} router - The Express router instance to configure.
//  * @param {string} targetServiceUrl - The base URL of the target Agent Service (handling /run).
//  * @param {express.RequestHandler} authMiddleware - Middleware for authenticating requests.
//  * @returns {express.Router} The configured router.
//  */
// export const configureRunRoutes = (
//   router: express.Router,
//   targetServiceUrl: string, // Should still point to Agent Service as per routes/index.ts
//   authMiddleware: express.RequestHandler
// ) => {
//   console.log(`🟢[API Gateway Service /run] Configuring run routes`);
//   // Apply authentication middleware first.
//   router.use(authMiddleware);
//   console.log(`🟢[API Gateway Service /run] Applying authentication middleware`);
//   // Apply the middleware to inject custom headers (x-platform-user-id, etc.)
//   router.use(injectCustomHeaders);
//   console.log(`🟢[API Gateway Service /run] Injecting custom headers`);
//   // Create the proxy middleware instance. 
//   // Note: http-proxy-middleware handles streaming responses automatically.
//   const runProxy = createApiProxy(targetServiceUrl, 'Agent Service (Runs)'); // Target is Agent Service
//   console.log(`🟢[API Gateway Service /run] Creating proxy middleware instance`);
//   // Apply the proxy middleware for all paths under the router's mount point.
//   router.use(runProxy);

//   return router;
// }; 