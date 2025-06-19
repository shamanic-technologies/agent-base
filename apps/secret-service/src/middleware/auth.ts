/**
 * Authentication Middleware for Secret Service
 *
 * Extracts InternalCredentials from request headers and validates them.
 * Attaches credentials to the request object for downstream handlers.
 */
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@agent-base/types';

// Define a custom request type that includes the credentials
export interface AuthenticatedRequest extends Request {
    platformApiKey: string | undefined;
    platformUserId: string | undefined;
    platformOrganizationId: string | undefined;
    clientUserId: string | undefined;
    clientOrganizationId: string | undefined;
    agentId: string | undefined;
}

// Constants for header names
const HEADER_PLATFORM_API_KEY = 'x-platform-api-key';
const HEADER_PLATFORM_USER_ID = 'x-platform-user-id';
const HEADER_PLATFORM_ORGANIZATION_ID = 'x-platform-organization-id';
const HEADER_CLIENT_USER_ID = 'x-client-user-id';
const HEADER_CLIENT_ORGANIZATION_ID = 'x-client-organization-id';
const HEADER_AGENT_ID = 'x-agent-id'; // Optional

/**
 * Express middleware to extract and validate InternalCredentials.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const platformApiKey = req.headers[HEADER_PLATFORM_API_KEY] as string | undefined;
  const platformUserId = req.headers[HEADER_PLATFORM_USER_ID] as string | undefined;
  const platformOrganizationId = req.headers[HEADER_PLATFORM_ORGANIZATION_ID] as string | undefined;
  const clientUserId = req.headers[HEADER_CLIENT_USER_ID] as string | undefined;
  const clientOrganizationId = req.headers[HEADER_CLIENT_ORGANIZATION_ID] as string | undefined;
  const agentId = req.headers[HEADER_AGENT_ID] as string | undefined;

  // Basic validation from getInternalAuthHeaders
  if (!platformApiKey) {
    const missingHeaders = [];
    if (!platformApiKey) missingHeaders.push(HEADER_PLATFORM_API_KEY);

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Unauthorized',
      details: `Missing required headers: ${missingHeaders.join(', ')}`,
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Attach credentials to the request object
  (req as AuthenticatedRequest).platformApiKey = platformApiKey;
  (req as AuthenticatedRequest).platformUserId = platformUserId;
  (req as AuthenticatedRequest).platformOrganizationId = platformOrganizationId;
  (req as AuthenticatedRequest).clientUserId = clientUserId;
  (req as AuthenticatedRequest).clientOrganizationId = clientOrganizationId;
  (req as AuthenticatedRequest).agentId = agentId;

  next();
}; 