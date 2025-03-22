/**
 * User interface for authentication
 * Represents a user that has been authenticated through the API Gateway
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
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