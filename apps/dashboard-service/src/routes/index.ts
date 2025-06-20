import { Router } from 'express';
import { queryController } from '../controllers/queryController.js';

const router = Router();

router.post('/query', queryController);

export default router; 