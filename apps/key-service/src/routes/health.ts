/**
 * Health check routes
 * Used for monitoring and service health status
 */
import { Router } from 'express';

const router = Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'key-service',
    timestamp: new Date().toISOString()
  });
});

export default router; 