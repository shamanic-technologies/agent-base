/**
 * Authentication Middleware (simplified for Dashboard Service)
 *
 * Extracts HumanInternalCredentials from request headers and validates their presence.
 * Attaches credentials to res.locals for downstream handlers.
 */
import express from 'express';
import { HumanInternalCredentials } from '@agent-base/types';

// Constants for header names
const HEADER_PLATFORM_API_KEY = 'x-platform-api-key';
const HEADER_PLATFORM_USER_ID = 'x-platform-user-id';
const HEADER_CLIENT_USER_ID = 'x-client-user-id';
const HEADER_CLIENT_ORGANIZATION_ID = 'x-client-organization-id';
const HEADER_AGENT_ID = 'x-agent-id'; // Optional

/**
 * Express middleware to extract and validate the presence of required credentials.
 * If successful, attaches credentials to `res.locals.credentials`.
 */
export const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const platformApiKey = req.headers[HEADER_PLATFORM_API_KEY] as string;
    const platformUserId = req.headers[HEADER_PLATFORM_USER_ID] as string;
    const clientUserId = req.headers[HEADER_CLIENT_USER_ID] as string;
    const clientOrganizationId = req.headers[HEADER_CLIENT_ORGANIZATION_ID] as string;
    const agentId = req.headers[HEADER_AGENT_ID] as string | undefined;

    // Basic validation
    if (!platformApiKey || !platformUserId || !clientUserId || !clientOrganizationId) {
      const missingHeaders = [];
      if (!platformApiKey) missingHeaders.push(HEADER_PLATFORM_API_KEY);
      if (!platformUserId) missingHeaders.push(HEADER_PLATFORM_USER_ID);
      if (!clientUserId) missingHeaders.push(HEADER_CLIENT_USER_ID);
      if (!clientOrganizationId) missingHeaders.push(HEADER_CLIENT_ORGANIZATION_ID);

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: `Missing required headers: ${missingHeaders.join(', ')}`,
      });
      return;
    }

    // Attach credentials to res.locals for use in controllers
    res.locals.credentials = {
      platformApiKey,
      platformUserId,
      clientUserId,
      clientOrganizationId,
      agentId,
    } as HumanInternalCredentials;

    next();
  } catch (error) {
    console.error(`[Auth Middleware] Unexpected error:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal authentication processing error',
    });
  }
}; 