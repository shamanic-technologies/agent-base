import { Request, Response, NextFunction } from 'express';
import { ValidateCreditRequest, ValidateCreditResponse } from '@agent-base/types';
import { validateCreditInternalService } from '@agent-base/api-client';

/**
 * Middleware to validate if the user has enough credits before proceeding with the request.
 * It calls the payment-service's /validate-credit endpoint via the api-client SDK.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const creditValidationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      // This should ideally be caught by an auth middleware first.
      // If no auth header, and the endpoint requires auth, it will fail later anyway.
      // For now, we proceed if no auth header, assuming some routes might not need credit validation
      // or are public. A more robust solution would be to check if the route itself requires auth.
      return next();
    }
    
    const amountToValidateInUSDCents = 0; // Validate credit is positive

    const validateCreditPayload: ValidateCreditRequest = {
      amountInUSDCents: amountToValidateInUSDCents,
    };

    console.log(`Validating credit via SDK for request to: ${req.originalUrl}, amount: ${amountToValidateInUSDCents} cents`);

    const serviceResponse = await validateCreditInternalService(
      req.platformUserId,
      req.platformApiKey,
      req.clientUserId,
      validateCreditPayload
    );

    if (serviceResponse.success && serviceResponse.data?.hasEnoughCredit) {
      console.log('Credit validation successful via SDK. Proceeding with request.');
      next();
    } else {
      console.warn('Insufficient credits or validation failed via SDK.', serviceResponse.error, serviceResponse.details);
      const statusCode = serviceResponse.data?.hasEnoughCredit === false ? 402 : (serviceResponse.error?.includes("status 404") ? 404 : 503);
      let errorMessage = 'Insufficient credits or credit validation failed.';
      if (!serviceResponse.success) {
        errorMessage = serviceResponse.error || 'Credit validation service encountered an issue.';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: {
          hasEnoughCredit: serviceResponse.data?.hasEnoughCredit,
          remainingCreditInUSDCents: serviceResponse.data?.remainingCreditInUSDCents,
          originalError: serviceResponse.details || serviceResponse.error
        }
      });
      return;
    }
  } catch (error) {
    console.error('Unexpected error in creditValidationMiddleware:', error);
    res.status(500).json({ success: false, error: 'Internal server error during credit validation' });
    return;
  }
}; 