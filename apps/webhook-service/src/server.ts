/**
 * Webhook Service API Server
 * 
 * Express server that receives and processes webhook events from various providers
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes
import setupWebhookRouter from './routes/setupWebhookRoute.js';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (nodeEnv === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log('🔧 Loading development environment from .env.local');
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('🚀 Production environment detected, using configured environment variables.');
}

// Initialize Express
const app: express.Express = express();
const PORT = process.env.PORT || 3080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for webhook endpoints
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  console.log(`📡 [WEBHOOK SERVICE] Health check request received from ${req.ip}`);
  
  res.status(200).json({
    status: 'healthy',
    environment: nodeEnv,
    version: process.env.npm_package_version
  });
});

// Register routes
app.use('/', setupWebhookRouter);

// Default 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist.`
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`❌ [WEBHOOK SERVICE] Error:`, err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: nodeEnv === 'development' ? err.stack : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🪝 [WEBHOOK SERVICE] Webhook Service running on port ${PORT}`);
  console.log(`🌐 [WEBHOOK SERVICE] Environment: ${nodeEnv}`);
});

export default app; 