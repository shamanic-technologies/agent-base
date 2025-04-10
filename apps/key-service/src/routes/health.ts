/**
 * Health check route
 */
import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'healthy' });
});

export default router; 