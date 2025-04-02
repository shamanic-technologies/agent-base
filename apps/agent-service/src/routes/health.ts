/**
 * Health routes
 * 
 * Endpoints for service health monitoring
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 * Returns status information about the service
 */
router.get('/', (req: Request, res: Response) => {
  console.log(`📡 [AGENT SERVICE] Health check request received from ${req.ip}`);
  
  // Get environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Get server address info safely
  let addressInfo = null;
  try {
    const serverObj = (req as any).socket?.server || (req as any).connection?.server;
    if (serverObj && typeof serverObj.address === 'function') {
      addressInfo = serverObj.address();
    }
  } catch (serverError) {
    console.error(`⚠️ [AGENT SERVICE] Error getting server info:`, serverError);
  }
  
  // Prepare health response
  const healthResponse = { 
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    serverInfo: {
      address: typeof addressInfo === 'string' ? addressInfo : {
        address: addressInfo?.address,
        port: addressInfo?.port,
        family: addressInfo?.family
      }
    },
    implementation: 'Vercel AI SDK with Claude 3.7 Sonnet Streaming'
  };
  
  res.status(200).json(healthResponse);
});

export default router; 