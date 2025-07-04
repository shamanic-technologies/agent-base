/**
 * Payment Service Routes
 * 
 * Configures routes for proxying requests to the backend Payment Service.
 * It applies authentication and then uses the createApiProxy utility.
 */
import express from 'express';
import { createApiProxy } from '../utils/proxy.util.js';

// Request type augmentation is handled globally via src/types/index.ts

/**
 * Configures routes related to payment, proxying them to the Payment Service.
 * @returns {express.Router} The configured router.
 */
export const configurePaymentRoutes = (
  router: express.Router,
  targetServiceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // Create a proxy for the payment service
  const paymentProxy = createApiProxy(targetServiceUrl, 'Payment Service');

  // Specific route for webhooks that bypasses auth middleware
  router.post('/webhook', paymentProxy);

  // Apply authentication middleware to all other payment routes
  router.use(authMiddleware);
  
  // Proxy all other requests to the payment service
  router.use(paymentProxy);
  
  return router;
}; 