/**
 * Agent service local types
 */

// Import shared User type for Express Request augmentation
import { User } from '@agent-base/types';

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
  userId: string;
  conversationId: string;
  apiKey: string;
  agent_id: string;
}

// Removed local User interface
// Removed local ServiceResponse interface

// Extend Express Request interface to include the shared User type
declare global {
  namespace Express {
    interface Request {
      user?: User; // Use the imported shared User type
    }
  }
}

// Export only necessary local types
export * from './agent-config.js'; 