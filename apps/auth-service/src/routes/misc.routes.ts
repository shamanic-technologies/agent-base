/**
 * Miscellaneous Routes
 * 
 * Utility endpoints like health checks
 */
import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Hello World API Endpoint - for testing connectivity
router.get('/helloworld', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Hello from Auth Service (Supabase Auth)!',
    service: 'auth-service',
    timestamp: new Date().toISOString() 
  });
});

export default router; 