import { Router, Request, Response } from 'express';
import { listDashboardBlocks, getDashboardBlockById } from '../services/dashboard-blocks.service.js';

const router = Router();

// GET /blocks - List all available dashboard blocks
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await listDashboardBlocks();
        if (result.success) {
            res.status(200).json(result);
        } else {
            console.error('Error listing dashboard blocks:', result.error);
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error listing dashboard blocks:', error);
        res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
    }
});

// GET /blocks/:id - Get a single dashboard block by its ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            console.error('Block ID is required.');
            res.status(400).json({ success: false, error: 'Block ID is required.' });
            return;
        }
        const result = await getDashboardBlockById(id);

        if (result.success) {
            res.status(200).json(result);
        } else {
            const statusCode = result.error === 'Dashboard block not found' ? 404 : 500;
            console.error('Error getting dashboard block:', result.error);
            res.status(statusCode).json(result);
        }
    } catch (error) {
        console.error('Error getting dashboard block:', error);
        res.status(500).json({ success: false, error: 'An unexpected server error occurred' });
    }
});

export default router; 