/**
 * Common type definitions for the web gateway service
 */

import { PlatformUser } from '@agent-base/types';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      platformUserId?: string;
      platformOrgId?: string;
    }
  }
} 