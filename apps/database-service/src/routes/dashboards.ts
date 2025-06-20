import { Router, Request, Response } from 'express';
import { 
    createDashboard,
    getDashboardsForUserAndOrganization,
    getDashboardById 
} from '../services/dashboards.js';

const router = Router();

// POST /dashboards - Create a new dashboard
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await createDashboard(req.body);

        if (result.success) {
            res.status(201).json(result);
        } else {
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
        const { clientUserId, clientOrganizationId } = req.query;

        if (!clientUserId || typeof clientUserId !== 'string' || !clientOrganizationId || typeof clientOrganizationId !== 'string') {
            res.status(400).json({ error: 'Query parameters "clientUserId" and "clientOrganizationId" are required.' });
            return;
        }

        const result = await getDashboardsForUserAndOrganization(clientUserId, clientOrganizationId);

        if (result.success) {
            res.status(200).json(result);
        } else {
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
            const statusCode = result.error === 'Dashboard not found' ? 404 : 400;
            res.status(statusCode).json(result);
        }
    } catch (error: any) {
        console.error(`[GET /dashboards/:id] Unexpected error for id ${req.params.id}:`, error);
        res.status(500).json({ error: 'An unexpected server error occurred' });
    }
});

export default router; 