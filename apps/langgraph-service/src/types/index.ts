/**
 * Agent service local types
 */

/**
 * Claude model names
 * Available Claude model identifiers
 */
export enum ModelName {
  CLAUDE_3_7_SONNET_20250219 = 'claude-3-7-sonnet-20250219',
  CLAUDE_SONNET_4_20250514 = 'claude-sonnet-4-20250514'
}
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
  details?: string; // Add optional details field
}



// Removed local User interface
// Removed local ServiceResponse interface

// Extend Express Request interface to include the shared User type
declare global {
  namespace Express {
    interface Request {
      clientUserId?: string; // Use the imported shared User type
      clientOrganizationId?: string; // Use the imported shared User type
      platformUserId?: string; // Use the imported shared User type
      platformApiKey?: string; // Use the imported shared User type
    }
  }
}