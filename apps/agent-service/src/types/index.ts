/**
 * User Interface
 * Represents a user in the model service.
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
}

/**
 * UtilityError Interface
 * Standardized error structure returned by utility tools
 */
export interface UtilityError {
  error: boolean;
  message: string;
  status: string;
  code: string;
  statusCode?: number;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Export all other types from the module
export * from './agent-config.js'; 