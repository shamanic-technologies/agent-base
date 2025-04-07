/**
 * Secret Service Routes
 * 
 * Configures routes that proxy requests to the secret service.
 */
import express from 'express';
import { forwardRequest } from '../utils/request.js';

/**
 * Configure secret service routes
 * 
 * @param router Express router
 * @param serviceUrl URL for the secret service
 * @param authMiddleware Authentication middleware
 */
export const configureSecretRoutes = (
  router: express.Router,
  serviceUrl: string,
  authMiddleware: express.RequestHandler
) => {
  // Set Stripe API keys
  router.post('/set_stripe_api_keys', authMiddleware, async (req, res) => {
    await forwardRequest(req, res, serviceUrl, '/api/store-secret');
  });

  // Set Crisp webhook secret
  router.post('/set_crisp_webhook_secret', authMiddleware, async (req, res) => {
    await forwardRequest(req, res, serviceUrl, '/api/store-secret');
  });

  return router;
}; 