import { Router } from 'express';
import { queryController } from '../controllers/queryController.js';
import dashboardBlockRoutes from './dashboard-blocks.routes.js';
import dashboardRoutes from './dashboards.routes.js';

const router = Router();

// Route for running arbitrary queries (tenant-safe)
router.post('/query', queryController);

// Routes for listing available dashboard block templates
router.use('/blocks', dashboardBlockRoutes);

// Routes for CRUD operations on dashboard instances
router.use('/dashboards', dashboardRoutes);

export default router; 