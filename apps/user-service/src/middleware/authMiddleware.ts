/**
 * Authentication Middleware
 *
 * Extracts HumanInternalCredentials from request headers and validates them.
 * Attaches credentials to the request object for downstream handlers.
 * `x-agent-id` is optional.
 */
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse, HumanInternalCredentials } from '@agent-base/types';

// Define a custom request type that includes the credentials
export interface AuthenticatedRequest extends Request {
  humanInternalCredentials: HumanInternalCredentials;
}

// Constants for header names
const HEADER_PLATFORM_API_KEY = 'x-platform-api-key';
const HEADER_PLATFORM_USER_ID = 'x-platform-user-id';
const HEADER_CLIENT_USER_ID = 'x-client-user-id';
const HEADER_CLIENT_ORGANIZATION_ID = 'x-client-organization-id';
const HEADER_AGENT_ID = 'x-agent-id'; // Optional

/**
 * Express middleware to extract and validate HumanInternalCredentials.
 *
 * Expects headers:
 * - `x-platform-api-key`: Required
 * - `x-platform-user-id`: Required
 * - `x-client-user-id`: Required
 * - `x-client-organization-id`: Required
 * - `x-agent-id`: Optional
 *
 * If required headers are missing or invalid, sends a 401 Unauthorized response.
 * Otherwise, attaches credentials to `req.humanInternalCredentials` and calls `next()`.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const platformApiKey = req.headers[HEADER_PLATFORM_API_KEY] as string;
  const platformUserId = req.headers[HEADER_PLATFORM_USER_ID] as string;
  const clientUserId = req.headers[HEADER_CLIENT_USER_ID] as string;
  const clientOrganizationId = req.headers[HEADER_CLIENT_ORGANIZATION_ID] as string;
  const agentId = req.headers[HEADER_AGENT_ID] as string | undefined;

  // Basic validation: Check for required headers
  if (!platformApiKey || !platformUserId || !clientUserId || !clientOrganizationId) {
    const missingHeaders = [];
    if (!platformApiKey) missingHeaders.push(HEADER_PLATFORM_API_KEY);
    if (!platformUserId) missingHeaders.push(HEADER_PLATFORM_USER_ID);
    if (!clientUserId) missingHeaders.push(HEADER_CLIENT_USER_ID);
    if (!clientOrganizationId) missingHeaders.push(HEADER_CLIENT_ORGANIZATION_ID);

    console.error(`[Auth Middleware] Authentication failed: Missing required headers: ${missingHeaders.join(', ')}`);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Unauthorized',
      details: `Missing required headers: ${missingHeaders.join(', ')}`,
      hint: `This error should not happen. Contact support`
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Attach credentials to the request object
  (req as AuthenticatedRequest).humanInternalCredentials = {
    platformApiKey,
    platformUserId,
    clientUserId,
    clientOrganizationId,
    agentId,      // Will be undefined if header not present
  };

  // Proceed to the next middleware or route handler
  next();
}; 