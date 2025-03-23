/**
 * Controller for credit-related endpoints
 */
import { ExpressRequest, ExpressResponse } from '../types';
import * as customerService from '../services/customerService';
import * as creditService from '../services/creditService';
import { stripe } from '../config';

/**
 * Validate if a customer has sufficient credit for a specific operation
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function validateCredit(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { amount } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/validate-credit');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }
    
    console.log(`Validating credit for userId: ${userId}, amount: ${amount}`);
    
    // Find the customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Check if customer has enough credit
    const credits = await customerService.calculateCustomerCredits(customer.id);
    const hasEnoughCredit = credits.remaining >= amount;
    
    return res.status(200).json({
      success: true,
      data: {
        hasEnoughCredit,
        remainingCredit: credits.remaining
      }
    });
  } catch (error) {
    console.error('Error validating credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate credit'
    });
  }
}

/**
 * Deduct credit from a customer's balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function deductCreditByUserId(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { amount, description } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/deduct-credit');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }
    
    console.log(`Deducting ${amount} credit from user: ${userId}`);
    
    // Find the customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`No customer found for user ID: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Check if customer has enough credit
    const credits = await customerService.calculateCustomerCredits(customer.id);
    
    if (credits.remaining < amount) {
      console.warn(`Insufficient credit for user: ${userId}. Requested: ${amount}, Available: ${credits.remaining}`);
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        data: {
          remainingCredit: credits.remaining,
          requestedAmount: amount
        }
      });
    }
    
    // Deduct credit by updating the customer's balance
    const transaction = await creditService.deductCredit(
      customer.id, 
      amount, 
      description || 'API usage'
    );
    
    // Get updated credit balance
    const updatedCredits = await customerService.calculateCustomerCredits(customer.id);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: updatedCredits.remaining
      }
    });
  } catch (error) {
    console.error('Error deducting credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deduct credit'
    });
  }
}

/**
 * Deduct credit from a customer's balance by customer ID
 * 
 * Used for direct access by admins or other services
 */
export async function deductCreditById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId, amount, description } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }
    
    console.log(`Deducting ${amount} credit from customer: ${customerId}`);
    
    // Check if customer exists
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      console.error(`Customer not found with ID: ${customerId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Check if customer has enough credit
    const credits = await customerService.calculateCustomerCredits(customerId);
    
    if (credits.remaining < amount) {
      console.warn(`Insufficient credit for customer: ${customerId}. Requested: ${amount}, Available: ${credits.remaining}`);
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        data: {
          remainingCredit: credits.remaining,
          requestedAmount: amount
        }
      });
    }
    
    // Deduct credit by updating the customer's balance
    const transaction = await creditService.deductCredit(
      customerId, 
      amount, 
      description || 'API usage'
    );
    
    // Get updated credit balance
    const updatedCredits = await customerService.calculateCustomerCredits(customerId);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: updatedCredits.remaining
      }
    });
  } catch (error) {
    console.error('Error deducting credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deduct credit'
    });
  }
} 