/**
 * User Interface
 * Represents a user in the model service.
 */

export interface User {
  id: string;
  data: {
    name: string;
    email: string;
    picture: string;
    provider: string;
    created_at: string;
    last_login: string;
    providerId: string;
  };
  created_at: string;
  updated_at: string;
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

/**
 * Generic Service Response Interface
 * Standardized response structure for service calls.
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: UtilityError | string; // Allow either structured error or simple string message
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