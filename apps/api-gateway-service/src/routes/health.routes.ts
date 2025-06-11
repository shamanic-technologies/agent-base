/**
 * Health Check Routes
 * 
 * Route for checking the basic health of the API Gateway service.
 */
import express from 'express';
// Removed axios import as detailed downstream checks are removed.

/**
 * Configure basic health check route.
 * 
 * @param {express.Router} router - The Express router instance.
 * @param {object} serviceUrls - Object containing URLs of dependent services (used for informational purposes).
 */
export const configureHealthRoutes = (
  router: express.Router,
  serviceUrls: {
    agent: string;
    utilityTool: string;
    key: string;
    secret: string; // Secret service URL is optional
  }
) => {
  /**
   * Basic health check endpoint.
   * Returns the status of the API gateway service itself and lists configured downstream service URLs.
   */
  router.get('/', (req: express.Request, res: express.Response) => {
    console.log('[Health Check] Received request for /');
    // Return a simple status indicating the gateway is running.
    res.status(200).json({
      status: 'healthy',
      serviceName: 'api-gateway-service',
      timestamp: new Date().toISOString(),
      // Optionally list configured downstream services for informational purposes.
      configuredServices: {
        agentService: serviceUrls.agent ? 'configured' : 'not configured',
        utilityToolService: serviceUrls.utilityTool ? 'configured' : 'not configured',
        keyService: serviceUrls.key ? 'configured' : 'not configured',
        secretService: serviceUrls.secret ? 'configured' : 'not configured',
      }
    });
  });

  return router;
}; 