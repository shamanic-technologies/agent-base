import { getPaymentServiceUrl } from "@/utils/config.js";
import { makeInternalAPIServiceRequest } from "@/utils/service-client.js";
import { ServiceResponse, ValidateCreditRequest, ValidateCreditResponse } from "@agent-base/types";

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