/**
 * @file Authentication middleware for verifying platform user credentials.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to authenticate requests based on platform user headers.
 *
 * This middleware checks for the presence of the 'x-platform-user-id' header.
 * If present, it populates `req.platformUser` with the ID, and optionally with
 * 'x-platform-user-email' and 'x-platform-user-name' if they are also present in the headers.
 *
 * If 'x-platform-user-id' is missing, it sends a 401 Unauthorized response.
 *
 * @param req - The Express request object. Note: The Request object is augmented
 *              via declaration merging in `src/types/index.ts` to include `platformUser`.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract platform user details from request headers.
  const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
  const platformUserEmail = req.headers['x-platform-user-email'] as string | undefined;
  const platformUserName = req.headers['x-platform-user-name'] as string | undefined;

  // Check if the mandatory platform user ID is present.
  if (!platformUserId) {
    // Log the missing header and send an unauthorized response.
    console.log('Missing x-platform-user-id header in request.');
    res.status(401).json({
      success: false,
      error: 'Authentication required: Missing x-platform-user-id header.',
    });
    return; // Stop further processing.
  }

  // Initialize platformUser with the mandatory ID.
  // The type for req.platformUser comes from the declaration merging in `src/types/index.ts`
  req.platformUser = {
    platformUserId: platformUserId,
    platformUserEmail: platformUserEmail || null, // Ensure it's null if undefined
    platformUserName: platformUserName || null, // Ensure it's null if undefined
  };

  next();
} 