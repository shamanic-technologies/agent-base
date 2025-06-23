import { Router, Request, Response } from 'express';
import { 
    createDashboard,
    getDashboardsForUserAndOrganization,
    getDashboardById 
} from '../services/dashboards.js';
import { CreateDashboardRequest } from '@agent-base/types';

const router = Router();

// POST /dashboards - Create a new dashboard
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const clientOrganizationId = req.headers['x-client-organization-id'] as string; // This is the unique ID for the org
    const clientUserId = req.headers['x-client-user-id'] as string; // This is the unique ID for the user

    if (!clientOrganizationId) {
        console.error(`[GET /dashboards] Missing required header: x-client-organization-id`);
        res.status(400).json({ error: 'Missing required header: x-client-organization-id' });
        return;
    }
    if (!clientUserId) {
        console.error(`[GET /dashboards] Missing required header: x-client-user-id`);
        res.status(400).json({ error: 'Missing required header: x-client-user-id' });
        return;
    }

    try {
        const createDashboardRequest: CreateDashboardRequest = req.body;
        const result = await createDashboard(createDashboardRequest, clientUserId, clientOrganizationId);

        if (result.success) {
            res.status(201).json(result);
        } else {
            console.error('[POST /dashboards] Error creating dashboard:', result);
            res.status(400).json(result);
        }
    } catch (error: any) {
        console.error('[POST /dashboards] Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected server error occurred' });
    }
});

// GET /dashboards - List dashboards for a user and organization
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const clientOrganizationId = req.headers['x-client-organization-id'] as string; // This is the unique ID for the org
        const clientUserId = req.headers['x-client-user-id'] as string; // This is the unique ID for the user

        if (!clientOrganizationId) {
            console.error(`[GET /dashboards] Missing required header: x-client-organization-id`);
            res.status(400).json({ error: 'Missing required header: x-client-organization-id' });
            return;
        }
        if (!clientUserId) {
            console.error(`[GET /dashboards] Missing required header: x-client-user-id`);
            res.status(400).json({ error: 'Missing required header: x-client-user-id' });
            return;
        }

        const result = await getDashboardsForUserAndOrganization(clientUserId, clientOrganizationId);

        if (result.success) {
            res.status(200).json(result);
        } else {
            console.error('[GET /dashboards] Error getting dashboards for user and organization:', result);
            res.status(400).json(result);
        }
    } catch (error: any) {
        console.error('[GET /dashboards] Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected server error occurred' });
    }
});

// GET /dashboards/:id - Get a single dashboard by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await getDashboardById(id);

        if (result.success) {
            res.status(200).json(result);
        } else {
            console.error('[GET /dashboards/:id] Error getting dashboard by id:', result);
            const statusCode = result.error === 'Dashboard not found' ? 404 : 400;
            res.status(statusCode).json(result);
        }
    } catch (error: any) {
        console.error(`[GET /dashboards/:id] Unexpected error for id ${req.params.id}:`, error);
        res.status(500).json({ error: 'An unexpected server error occurred' });
    }
});

export default router; 