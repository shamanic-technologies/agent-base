import { getPaymentServiceUrl } from "@/utils/config.js";
import { makeInternalAPIServiceRequest } from "@/utils/service-client.js";
import { ServiceResponse, ValidateCreditRequest, ValidateCreditResponse, DeductCreditRequest, DeductCreditResponse } from "@agent-base/types";

/**
 * Validates credit via the payment service using API key authentication.
 * 
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @returns ServiceResponse containing a success message or error.
 */
export async function validateCreditInternalService(
    platformUserId: string,
    platformApiKey: string,
    clientUserId: string,
    validateCreditRequest: ValidateCreditRequest
  ): Promise<ServiceResponse<ValidateCreditResponse>> {
  
    // POST requests send data in the body.
    return await makeInternalAPIServiceRequest<ValidateCreditResponse>(
      getPaymentServiceUrl(), // Use dynamic getter
      'post',
      '/validate-credit', // Endpoint for validating credit
      platformUserId, // ID value for x-platform-user-id header
      clientUserId,   // ID value for x-client-user-id header
      platformApiKey, // API key for x-platform-api-key header
      validateCreditRequest, // Request body (data)
      undefined // No query parameters (params)
    );
  }

/**
 * Deducts credit via the payment service using API key authentication.
 *
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @param deductCreditRequest The request body containing details for credit deduction.
 * @returns ServiceResponse containing a success message or error.
 */
export async function deductCreditByPlatformUserIdInternalService(
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string,
  deductCreditRequest: DeductCreditRequest
): Promise<ServiceResponse<DeductCreditResponse>> {
  // POST requests send data in the body.
  return await makeInternalAPIServiceRequest<DeductCreditResponse>(
    getPaymentServiceUrl(), // Use dynamic getter
    'post',
    '/deduct-credit', // Endpoint for deducting credit
    platformUserId, // ID value for x-platform-user-id header
    clientUserId, // ID value for x-client-user-id header
    platformApiKey, // API key for x-platform-api-key header
    deductCreditRequest, // Request body (data)
    undefined // No query parameters (params)
  );
}