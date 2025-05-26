/**
 * Controller for credit-related endpoints
 */
import { Request, Response } from 'express';
import * as customerService from '../services/customerService.js';
import * as creditService from '../services/creditService.js';
import { stripe } from '../config/index.js';
import {
  AgentBaseValidateCreditResponse,
  AgentBaseDeductCreditRequest,
  AgentBaseCreditConsumptionItem,
  AgentBaseCreditConsumption,
  AgentBaseCreateCheckoutSessionRequest,
  AgentBaseDeductCreditResponse,
  AgentBasePricing,
  AgentBaseCreditConsumptionType,
  AgentBaseValidateCreditRequest
} from "@agent-base/types";
/**
 * Validate if a customer has sufficient credit for a specific operation
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function validateCredit(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;
    const { amountInUSDCents }: AgentBaseValidateCreditRequest = req.body;
    
    if (amountInUSDCents === undefined) {
      res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
      return;
    }
    
    console.log(`Validating credit for userId: ${platformUserId}, amount: $${(amountInUSDCents/100).toFixed(2)}`);
    
    // Find the customer
    const customer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Check if customer has enough credit
    const credits = await customerService.calculateCustomerCredits(customer.id);
    const hasEnoughCredit = credits.remainingInUSDCents >= amountInUSDCents;
    
    res.status(200).json({
      success: true,
      data: {
        hasEnoughCredit,
        remainingCreditInUSDCents: credits.remainingInUSDCents
      } as AgentBaseValidateCreditResponse
    });
    return;
  } catch (error) {
    console.error('Error validating credit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate credit'
    });
    return;
  }
}

/**
 * Deduct credit from a customer's balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function deductCreditByPlatformUserId(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;
    const { toolCalls, inputTokens, outputTokens }: AgentBaseDeductCreditRequest = req.body;
    console.debug('DeductCreditByPlatformUserIdInternalService', JSON.stringify(req.body, null, 2));
    
    if (toolCalls === undefined || inputTokens === undefined || outputTokens === undefined) {
      res.status(400).json({
        success: false,
        error: 'Tool calls, input tokens, and output tokens are required'
      });
      return;
    }
    
    console.debug(`Deducting ${toolCalls.length} tool calls, ${inputTokens} input tokens, ${outputTokens} output tokens from user: ${platformUserId}`);
    
    // Find the customer
    const stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!stripeCustomer) {
      console.error(`No customer found for user ID: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Stripe customer not found'
      });
      return;
    }

    // Calculate the credit consumption
    const toolCallsConsumption : AgentBaseCreditConsumptionItem = {
      totalAmountInUSDCents: Math.round(toolCalls.length * AgentBasePricing.AGENT_BASE_TOOL_CALL_PRICE_IN_USD_CENTS),
      consumptionType: AgentBaseCreditConsumptionType.TOOL_CALL,
      consumptionUnits: toolCalls.length
    }
    const inputTokensConsumption : AgentBaseCreditConsumptionItem = {
      totalAmountInUSDCents: Math.max(1, Math.round(inputTokens/1000000 * AgentBasePricing.AGENT_BASE_MILLION_INPUT_TOKENS_PRICE_IN_USD_CENTS)),
      consumptionType: AgentBaseCreditConsumptionType.INPUT_TOKEN,
      consumptionUnits: inputTokens
    }
    const outputTokensConsumption : AgentBaseCreditConsumptionItem = {
      totalAmountInUSDCents: Math.max(1, Math.round(outputTokens/1000000 * AgentBasePricing.AGENT_BASE_MILLION_OUTPUT_TOKENS_PRICE_IN_USD_CENTS)),
      consumptionType: AgentBaseCreditConsumptionType.OUTPUT_TOKEN,
      consumptionUnits: outputTokens
    }
    const creditConsumption : AgentBaseCreditConsumption = {
      items: [toolCallsConsumption, inputTokensConsumption, outputTokensConsumption],
      totalAmountInUSDCents: toolCallsConsumption.totalAmountInUSDCents + inputTokensConsumption.totalAmountInUSDCents + outputTokensConsumption.totalAmountInUSDCents
    }

    // Deduct credit by updating the customer's balance
    const newBalanceInUSDCents: number = await creditService.deductCredit(
      stripeCustomer.id, 
      creditConsumption.totalAmountInUSDCents,
      'API usage'
    );
    const response: AgentBaseDeductCreditResponse = {
      creditConsumption,
      newBalanceInUSDCents
    }
    console.debug('DeductCreditByPlatformUserIdInternalService response', JSON.stringify(response, null, 2));

    res.status(200).json({
      success: true,
      data: response
    });
    return;
  } catch (error) {
    console.error('Error deducting credit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deduct credit:' + error
    });
    return;
  }
}

// /**
//  * Deduct credit from a customer's balance by customer ID
//  * 
//  * Used for direct access by admins or other services
//  */
// export async function deductCreditByStripeCustomerId(req: Request, res: Response): Promise<void> {
//   try {
//     const { stripeCustomerId } = req.params;

//     const { amountInUSDCents, description } : DeductCreditRequest = req.body;
    
//     if (!stripeCustomerId) {
//       res.status(400).json({
//         success: false,
//         error: 'Stripe customer ID is required'
//       });
//       return;
//     }
    
//     if (amountInUSDCents === undefined) {
//       res.status(400).json({
//         success: false,
//         error: 'Amount is required'
//       });
//       return;
//     }
    
//     console.log(`Deducting ${amountInUSDCents} credit from customer: ${stripeCustomerId}`);
    
//     // Check if customer exists
//     const customer = await stripe.customers.retrieve(stripeCustomerId);
    
//     if (!customer || customer.deleted) {
//       console.error(`Customer not found with ID: ${stripeCustomerId}`);
//       res.status(404).json({
//         success: false,
//         error: 'Customer not found'
//       });
//       return;
//     }
    
//     // Check if customer has enough credit
//     const credits = await customerService.calculateCustomerCredits(stripeCustomerId);
    
//     if (credits.remainingInUSDCents < amountInUSDCents) {
//       console.warn(`Insufficient credit for customer: ${stripeCustomerId}. Requested: $${(amountInUSDCents/100).toFixed(2)}, Available: $${(credits.remainingInUSDCents/100).toFixed(2)}`);
//       res.status(400).json({
//         success: false,
//         error: 'Insufficient credit',
//         details: `Remaining credit: $${(credits.remainingInUSDCents/100).toFixed(2)}, Requested amount: $${(amountInUSDCents/100).toFixed(2)}`
//       });
//       return;
//     }
    
//     // Deduct credit by updating the customer's balance
//     const deductCreditResult: DeductCreditResponse = await creditService.deductCredit(
//       stripeCustomerId, 
//       amountInUSDCents, 
//       description || 'API usage'
//     );
    

//     res.status(200).json({
//       success: true,
//       data: deductCreditResult
//     });
//     return;
//   } catch (error) {
//     console.error('Error deducting credit:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to deduct credit:' + error
//     });
//     return;
//   }
// } 