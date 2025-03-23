/**
 * Health Check Routes
 * 
 * Routes for checking the health of the service and its dependencies.
 */
import express from 'express';

/**
 * Configure health check routes
 * 
 * @param router Express router
 * @param serviceUrls Object containing URLs of dependent services
 */
export const configureHealthRoutes = (
  router: express.Router,
  serviceUrls: {
    model: string;
    utility: string;
    key: string;
    logging?: string;
  }
) => {
  /**
   * Health check endpoint
   * Returns the status of the API gateway service and its connections
   */
  router.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'healthy',
      services: {
        model: serviceUrls.model,
        utility: serviceUrls.utility,
        key: serviceUrls.key,
        ...(serviceUrls.logging && { logging: serviceUrls.logging })
      }
    });
  });

  return router;
}; 