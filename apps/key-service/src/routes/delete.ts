import { Router, Request, Response } from 'express';
import { deleteApiKey } from '../services/dbService.js';
import { ServiceResponse } from '@agent-base/types';

const router = Router();

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const platformUserId = req.headers['x-platform-user-id'] as string;
  const platformOrganizationId = req.headers['x-platform-organization-id'] as string;

  if (!id) {
    console.error('Key ID is required', null, 2);
    res.status(400).json({ success: false, error: 'Key ID is required' });
    return;
  }

  if (!platformUserId) {
    console.error('User ID is required', null, 2);
    res.status(401).json({ success: false, error: 'User ID is required' });
    return;
  }

  if (!platformOrganizationId) {
    console.error('Organization ID is required', null, 2);
    res.status(401).json({ success: false, error: 'Organization ID is required' });
    return;
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