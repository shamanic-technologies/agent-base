/**
 * Type definitions for API Gateway Service
 * 
 * This file contains shared interfaces and type definitions used throughout the service.
 */

import express from 'express';

/**
 * Extend Express Request type to include user
 */
declare global {
  namespace Express {
    interface Request {
      platformUserId?: string;
      platformApiKey?: string;
      clientUserId?: string;
    }
  }
} 