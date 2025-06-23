/**
 * Dashboard Routes
 *
 * Defines the API routes for all dashboard-related CRUD operations.
 */
import { Router } from 'express';
import {
  createDashboard,
  getDashboardsInfo,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
} from '../controllers/dashboards.controller.js';

const router = Router();

// Route to get all dashboards summary info and create a new one.
router.route('/')
  .get(getDashboardsInfo)
  .post(createDashboard);

// Route to get, update, or delete a specific dashboard by its ID.
router.route('/:id')
  .get(getDashboardById)
  .patch(updateDashboard)
  .delete(deleteDashboard);

export default router; 