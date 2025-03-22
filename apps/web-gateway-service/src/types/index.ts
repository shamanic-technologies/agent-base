/**
 * Type definitions for web-gateway-service
 * Extends Express types to include user information
 */

// Define User interface for authenticated users
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
} 