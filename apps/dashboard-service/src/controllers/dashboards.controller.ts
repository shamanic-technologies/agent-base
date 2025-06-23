/**
 * Dashboards Controller
 *
 * Handles HTTP requests for dashboard operations, mapping them to the
 * appropriate service calls.
 */
import { Request, Response } from 'express';
import * as DashboardService from '../services/dashboards.service.js';
import { CreateDashboardRequest, Dashboard, ServiceResponse, DashboardInfo } from '@agent-base/types';

/**
 * Extracts authentication credentials from the request.
 * In a real app, this would come from a validated JWT or session.
 */
function getAuth(res: Response) {
  const { clientUserId, clientOrganizationId } = res.locals.credentials;
  return { clientUserId, clientOrganizationId };
}

// POST /dashboards - Create a new dashboard
export async function createDashboard(req: Request, res: Response) {
  const { name, layout } = req.body as CreateDashboardRequest;
  if (!name || !layout) {
    console.error('Missing required fields: name and layout.');
    return res.status(400).json({ success: false, error: 'Missing required fields: name and layout.' });
  }

  const result = await DashboardService.createDashboard(name, layout, getAuth(res));
  if (result.success) {
    return res.status(201).json(result);
  }
  console.error('Error creating dashboard:', result.error);
  return res.status(500).json(result);
}

// GET /dashboards - Get all dashboards summary info for the user/org
export async function getDashboardsInfo(req: Request, res: Response) {
  const result: ServiceResponse<DashboardInfo[]> = await DashboardService.getDashboardsInfo(getAuth(res));
  if (result.success) {
    return res.status(200).json(result);
  }
  console.error('Error getting dashboards info:', result.error);
  return res.status(500).json(result);
}

// GET /dashboards/:id - Get a single dashboard by ID
export async function getDashboardById(req: Request, res: Response) {
  const { id } = req.params;
  const result : ServiceResponse<Dashboard> = await DashboardService.getDashboardById(id, getAuth(res));
  if (result.success) {
    return res.status(200).json(result);
  }
  if (result.error?.includes('not found')) {
    return res.status(404).json(result);
  }
  console.error('Error getting dashboard by id:', result.error);
  return res.status(500).json(result);
}

// PATCH /dashboards/:id - Update a dashboard
export async function updateDashboard(req: Request, res: Response) {
  const { id } = req.params;
  const { name, layout } = req.body;

  const result = await DashboardService.updateDashboard(id, name, layout, getAuth(res));
  if (result.success) {
    return res.status(200).json(result);
  }
  if (result.error?.includes('not found')) {
    console.error('Dashboard not found:', result.error);
    return res.status(404).json(result);
  }
  console.error('Error updating dashboard:', result.error);
  return res.status(500).json(result);
}

// DELETE /dashboards/:id - Delete a dashboard
export async function deleteDashboard(req: Request, res: Response) {
  const { id } = req.params;
  const result = await DashboardService.deleteDashboard(id, getAuth(res));
  if (result.success) {
    return res.status(200).json(result);
  }
  if (result.error?.includes('not found')) {
    console.error('Dashboard not found:', result.error);
    return res.status(404).json(result);
  }
  console.error('Error deleting dashboard:', result.error);
  return res.status(500).json(result);
} 