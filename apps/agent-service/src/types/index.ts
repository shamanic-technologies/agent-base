/**
 * Agent service local types
 */

// Import shared User type for Express Request augmentation
import { ClientUser, PlatformUser } from '@agent-base/types';

/**
 * UtilityError Interface
 * Standardized error structure returned by utility tools or services.
 */
export interface UtilityError {
  error: boolean;
  message: string;
  status: string; // Consider using specific statuses like 'error', 'success', 'not_found'
  code: string;
  statusCode?: number;
}

/**
 * UtilityToolCredentials Interface
 * Standard credentials required by all utility tools.
 */
export interface UtilityToolCredentials {
  clientUserId: string;
  platformUserId: string;
  platformApiKey: string;
  conversationId: string;
  agentId: string;
}

// Removed local User interface
// Removed local ServiceResponse interface

// Extend Express Request interface to include the shared User type
declare global {
  namespace Express {
    interface Request {
      clientUserId?: string; // Use the imported shared User type
      platformUserId?: string; // Use the imported shared User type
      platformApiKey?: string; // Use the imported shared User type
    }
  }
}

// Export only necessary local types
export * from './agent-config.js'; 