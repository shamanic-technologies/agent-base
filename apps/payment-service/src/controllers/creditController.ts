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
 * Add credit to a customer's balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function addCreditByUserId(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { amount, stripePaymentMethodId, description } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/add-credit');
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
    
    console.log(`Adding ${amount} credit to user: ${userId}`);
    
    // Find the customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`No customer found for user ID: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    console.log(`Found customer: ${customer.id} for user: ${userId}`);
    
    let paymentSuccessful = false;
    
    // Process payment through Stripe if a payment method is provided
    if (stripePaymentMethodId && amount > 0) {
      try {
        // Create a payment intent
        const paymentIntent = await creditService.processPayment(
          customer.id,
          amount,
          stripePaymentMethodId,
          description || 'Add credit to account'
        );
        
        if (paymentIntent.status === 'succeeded') {
          paymentSuccessful = true;
          console.log(`Payment successful for user ${userId}, amount: $${amount}`);
        } else {
          return res.status(400).json({
            success: false,
            error: `Payment failed with status: ${paymentIntent.status}`
          });
        }
      } catch (stripeError) {
        console.error('Stripe payment error:', stripeError);
        return res.status(400).json({
          success: false,
          error: 'Payment processing failed',
          details: stripeError
        });
      }
    } else {
      // If no payment method provided, we'll assume this is an internal adjustment
      // (e.g., promotional credit) and not require a Stripe payment
      paymentSuccessful = true;
    }
    
    if (paymentSuccessful) {
      // Add credit to customer's balance
      const result = await creditService.addCredit(
        customer.id,
        amount,
        description || 'Added credit'
      );
      
      console.log(`Added ${amount} credit to user ${userId}. New balance: ${result.newBalance}`);
  
      return res.status(200).json({
        success: true,
        data: {
          transaction: {
            id: result.transaction.id,
            customerId: customer.id,
            userId,
            type: 'credit',
            amount,
            description: description || 'Added credit',
            timestamp: new Date(result.transaction.created * 1000)
          },
          newBalance: result.newBalance
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'Failed to process payment'
    });
  } catch (error) {
    console.error('Error in add credit endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Add credit to a customer's balance by direct ID
 */
export async function addCreditById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId, amount, stripePaymentMethodId, description } = req.body;
    
    if (!customerId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID and amount are required'
      });
    }
    
    console.log(`Adding ${amount} credit to customer ID: ${customerId}`);
    
    try {
      // Get customer directly
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      let paymentSuccessful = false;
      
      // Process payment through Stripe if a payment method is provided
      if (stripePaymentMethodId && amount > 0) {
        try {
          // Create a payment intent
          const paymentIntent = await creditService.processPayment(
            customer.id,
            amount,
            stripePaymentMethodId,
            description || 'Add credit to account'
          );
          
          if (paymentIntent.status === 'succeeded') {
            paymentSuccessful = true;
            console.log(`Payment successful for customer ${customerId}, amount: $${amount}`);
          } else {
            return res.status(400).json({
              success: false,
              error: `Payment failed with status: ${paymentIntent.status}`
            });
          }
        } catch (stripeError) {
          console.error('Stripe payment error:', stripeError);
          return res.status(400).json({
            success: false,
            error: 'Payment processing failed',
            details: stripeError
          });
        }
      } else {
        // If no payment method provided, we'll assume this is an internal adjustment
        paymentSuccessful = true;
      }
      
      if (paymentSuccessful) {
        // Add credit to customer's balance
        const result = await creditService.addCredit(
          customer.id,
          amount,
          description || 'Added credit'
        );
        
        const userId = customer.metadata.userId || 'unknown';
        console.log(`Added ${amount} credit to customer ${customerId} (${userId}). New balance: ${result.newBalance}`);
        
        return res.status(200).json({
          success: true,
          data: {
            transaction: {
              id: result.transaction.id,
              customerId,
              userId,
              type: 'credit',
              amount,
              description: description || 'Added credit',
              timestamp: new Date(result.transaction.created * 1000)
            },
            newBalance: result.newBalance
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Failed to process payment'
      });
    } catch (error) {
      console.error('Error adding credit by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in add credit by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
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
    const { amount, description = 'API usage' } = req.body;
    
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
    
    console.log(`Found customer: ${customer.id} for user: ${userId}`);
    
    try {
      // Deduct credit from customer's balance
      const result = await creditService.deductCredit(customer.id, amount, description);
      
      console.log(`Deducted ${amount} credit from customer ${customer.id} (${userId}). Remaining: ${result.newBalance}`);
    
      return res.status(200).json({
        success: true,
        data: {
          transaction: {
            id: result.transaction.id,
            customerId: customer.id,
            userId,
            type: 'debit',
            amount,
            description,
            timestamp: new Date(result.transaction.created * 1000)
          },
          newBalance: result.newBalance
        }
      });
    } catch (error) {
      // Special handling for insufficient credit
      if (error instanceof Error && error.message.includes('Insufficient credit')) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credit',
          data: {
            remainingCredit: parseFloat(error.message.split(':')[1].trim().split(' ')[0]),
            requestedAmount: amount
          }
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in deduct credit endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Deduct credit from a customer's balance by direct ID
 */
export async function deductCreditById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId, amount, description = 'API usage' } = req.body;
    
    if (!customerId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID and amount are required'
      });
    }
    
    console.log(`Deducting ${amount} credit from customer ID: ${customerId}`);
    
    try {
      // Get customer directly
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      try {
        // Deduct credit from customer's balance
        const result = await creditService.deductCredit(customer.id, amount, description);
        
        const userId = customer.metadata.userId || 'unknown';
        console.log(`Deducted ${amount} credit from customer ${customerId} (${userId}). Remaining: ${result.newBalance}`);
        
        return res.status(200).json({
          success: true,
          data: {
            transaction: {
              id: result.transaction.id,
              customerId,
              userId,
              type: 'debit',
              amount,
              description,
              timestamp: new Date(result.transaction.created * 1000)
            },
            newBalance: result.newBalance
          }
        });
      } catch (error) {
        // Special handling for insufficient credit
        if (error instanceof Error && error.message.includes('Insufficient credit')) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient credit',
            data: {
              remainingCredit: parseFloat(error.message.split(':')[1].trim().split(' ')[0]),
              requestedAmount: amount
            }
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deducting credit by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in deduct credit by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
} 