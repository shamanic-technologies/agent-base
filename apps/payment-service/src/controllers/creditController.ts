/**
 * Controller for credit-related endpoints
 */
import { Request, Response } from 'express';
import * as customerService from '../services/customerService.js';
import * as creditService from '../services/creditService.js';
import { stripe } from '../config/index.js';
import {
  DeductCreditRequest,
  DeductCreditResponse,
  ValidateCreditRequest,
  ValidateCreditResponse,
} from "@agent-base/types";
/**
 * Validate if a customer has sufficient credit for a specific operation
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function validateCredit(req: Request, res: Response): Promise<void> {
  try {
    const platformUserId = req.headers['x-platform-user-id'] as string;
    const { amountInUSDCents }: ValidateCreditRequest = req.body;
    
    if (!platformUserId) {
      console.log('Missing x-platform-user-id header in request to /payment/validate-credit');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    if (amountInUSDCents === undefined) {
      res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
      return;
    }
    
    console.log(`Validating credit for userId: ${platformUserId}, amount: $${(amountInUSDCents/100).toFixed(2)}`);
    
    // Find the customer
    const customer = await customerService.findStripeCustomerByPlatformUserId(platformUserId);
    
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
      } as ValidateCreditResponse
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
    const platformUserId = req.headers['x-platform-user-id'] as string;
    const { amountInUSDCents, description }: DeductCreditRequest = req.body;
    
    if (!platformUserId) {
      console.log('Missing x-platform-user-id header in request to /payment/deduct-credit');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    if (amountInUSDCents === undefined) {
      res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
      return;
    }
    
    console.log(`Deducting ${amountInUSDCents} credit from user: ${platformUserId}`);
    
    // Find the customer
    const stripeCustomer = await customerService.findStripeCustomerByPlatformUserId(platformUserId);
    
    if (!stripeCustomer) {
      console.error(`No customer found for user ID: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Stripe customer not found'
      });
      return;
    }
    
    // Check if customer has enough credit
    const stripeCustomerCredits = await customerService.calculateCustomerCredits(stripeCustomer.id);
    
    if (stripeCustomerCredits.remainingInUSDCents < amountInUSDCents) {
      console.warn(`Insufficient credit for user: ${platformUserId}. Requested: ${amountInUSDCents}, Available: ${stripeCustomerCredits.remainingInUSDCents}`);
      res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        details: `Remaining credit: $${(stripeCustomerCredits.remainingInUSDCents/100).toFixed(2)}, Requested amount: $${(amountInUSDCents/100).toFixed(2)}`
      });
      return;
    }
    
    // Deduct credit by updating the customer's balance
    const deductCreditResult: DeductCreditResponse = await creditService.deductCredit(
      stripeCustomer.id, 
      amountInUSDCents, 
      description
    );

    res.status(200).json({
      success: true,
      data: deductCreditResult
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

/**
 * Deduct credit from a customer's balance by customer ID
 * 
 * Used for direct access by admins or other services
 */
export async function deductCreditByStripeCustomerId(req: Request, res: Response): Promise<void> {
  try {
    const { stripeCustomerId } = req.params;

    const { amountInUSDCents, description } : DeductCreditRequest = req.body;
    
    if (!stripeCustomerId) {
      res.status(400).json({
        success: false,
        error: 'Stripe customer ID is required'
      });
      return;
    }
    
    if (amountInUSDCents === undefined) {
      res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
      return;
    }
    
    console.log(`Deducting ${amountInUSDCents} credit from customer: ${stripeCustomerId}`);
    
    // Check if customer exists
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    
    if (!customer || customer.deleted) {
      console.error(`Customer not found with ID: ${stripeCustomerId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Check if customer has enough credit
    const credits = await customerService.calculateCustomerCredits(stripeCustomerId);
    
    if (credits.remainingInUSDCents < amountInUSDCents) {
      console.warn(`Insufficient credit for customer: ${stripeCustomerId}. Requested: $${(amountInUSDCents/100).toFixed(2)}, Available: $${(credits.remainingInUSDCents/100).toFixed(2)}`);
      res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        details: `Remaining credit: $${(credits.remainingInUSDCents/100).toFixed(2)}, Requested amount: $${(amountInUSDCents/100).toFixed(2)}`
      });
      return;
    }
    
    // Deduct credit by updating the customer's balance
    const deductCreditResult: DeductCreditResponse = await creditService.deductCredit(
      stripeCustomerId, 
      amountInUSDCents, 
      description || 'API usage'
    );
    

    res.status(200).json({
      success: true,
      data: deductCreditResult
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