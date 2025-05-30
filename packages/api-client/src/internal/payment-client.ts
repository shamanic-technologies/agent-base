import { getPaymentServiceUrl } from "../utils/config.js";
import { makeInternalRequest, makeWebAuthenticatedServiceRequest } from "../utils/service-client.js";
import { ServiceResponse, AgentBaseCreateCheckoutSessionRequest, AgentBaseValidateCreditResponse, AgentBaseValidateCreditRequest, AgentBaseDeductCreditRequest, AgentBaseDeductCreditResponse, PlatformUserId } from "@agent-base/types";
import Stripe from "stripe";

/**
 * Validates credit via the payment service using API key authentication.
 * 
 * @param platformUserId The platform user ID (for x-platform-user-id header).
 * @param platformApiKey The platform API key (for x-platform-api-key header).
 * @param clientUserId The client user ID (for x-client-user-id header).
 * @param clientOrganizationId The client organization ID (for x-client-organization-id header).
 * @param validateCreditRequest The request body containing details for credit validation.
 * @returns ServiceResponse containing a success message or error.
 */
export async function validateCreditInternalService(
    platformUserId: string,
    platformApiKey: string,
    clientUserId: string,
    clientOrganizationId: string,
    validateCreditRequest: AgentBaseValidateCreditRequest
  ): Promise<ServiceResponse<AgentBaseValidateCreditResponse>> {
  
    // POST requests send data in the body.
    return await makeInternalRequest<AgentBaseValidateCreditResponse>(
      getPaymentServiceUrl(), // Use dynamic getter
      'post',
      '/validate-credit', // Endpoint for validating credit
      platformUserId, // ID value for x-platform-user-id header
      clientUserId,   // ID value for x-client-user-id header
      clientOrganizationId,
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
 * @param clientOrganizationId The client organization ID (for x-client-organization-id header).
 * @param deductCreditRequest The request body containing details for credit deduction.
 * @returns ServiceResponse containing a success message or error.
 */
export async function deductCreditByPlatformUserIdInternalService(
  platformUserId: string,
  platformApiKey: string,
  clientUserId: string,
  clientOrganizationId: string,
  deductCreditRequest: AgentBaseDeductCreditRequest
): Promise<ServiceResponse<AgentBaseDeductCreditResponse>> {
  // POST requests send data in the body.
  return await makeInternalRequest<AgentBaseDeductCreditResponse>(
    getPaymentServiceUrl(), // Use dynamic getter
    'post',
    '/deduct-credit', // Endpoint for deducting credit
    platformUserId, // ID value for x-platform-user-id header
    clientUserId, // ID value for x-client-user-id header
    clientOrganizationId, // ID value for x-client-organization-id header
    platformApiKey, // API key for x-platform-api-key header
    deductCreditRequest, // Request body (data)
    undefined // No query parameters (params)
  );
}

/**
 * Retrieves transactions for a specific platform user.
 * GET /customer/transactions
 *
 * @param platformUserId - The ID of the platform user whose transactions to retrieve.
 * @returns A promise resolving to ServiceResponse<Stripe.CustomerBalanceTransaction[]>.
 */
export const getPlatformUserTransations = async (
  platformUserId: string
): Promise<ServiceResponse<Stripe.CustomerBalanceTransaction[]>> => {

  return await makeWebAuthenticatedServiceRequest<Stripe.CustomerBalanceTransaction[]>(
    getPaymentServiceUrl(), // Use dynamic getter
    'get',
    '/customer/transactions',
    platformUserId,
    undefined, // No body
    undefined // No query parameters
  );
};