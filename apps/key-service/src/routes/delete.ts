import { Router, Request, Response } from 'express';
import { deleteApiKey } from '../services/dbService.js';
import { ServiceResponse } from '@agent-base/types';

const router = Router();

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const platformUserId = req.headers['x-platform-user-id'] as string;
  const platformOrganizationId = req.headers['x-platform-organization-id'] as string;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Key ID is required' });
  }

  if (!platformUserId) {
    return res.status(401).json({ success: false, error: 'User ID is required' });
  }

  if (!platformOrganizationId) {
    return res.status(401).json({ success: false, error: 'Organization ID is required' });
  }

  try {
    const result: ServiceResponse<boolean> = await deleteApiKey(id, platformUserId, platformOrganizationId);
    
    if (result.success) {
      res.status(200).json({ success: true, message: 'API key deleted successfully' });
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 