/**
 * Health check routes
 */
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({ 
    status: 'healthy',
    provider: 'railway-postgres'
  });
});

export default router; 