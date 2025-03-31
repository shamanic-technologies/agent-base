/**
 * Route handlers for the logging service
 */
import express from 'express';
import { DatabaseService } from '../services/database';
import apiLogsRoutes from './api-logs';

const router = express.Router();
let db: DatabaseService;

function initDatabase() {
  if (!db) {
    db = new DatabaseService();
  }
  return db;
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'logging-service'
  });
});

// Mount API logs routes
router.use('/api-logs', apiLogsRoutes);

export default router; 