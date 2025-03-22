/**
 * Common type definitions for the web gateway service
 */

/**
 * User information retrieved from authenticated tokens
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
} 