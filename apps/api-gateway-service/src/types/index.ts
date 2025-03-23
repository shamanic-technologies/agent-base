/**
 * Type definitions for API Gateway Service
 * 
 * This file contains shared interfaces and type definitions used throughout the service.
 */

import express from 'express';

/**
 * User interface
 * Represents a user that has been authenticated through the API Gateway
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
}

/**
 * Extend Express Request type to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: string; // Added to store the extracted API key
    }
  }
} 