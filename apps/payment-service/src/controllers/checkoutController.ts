/**
 * Controller for Stripe Checkout session operations
 */
import { ExpressRequest, ExpressResponse } from '../types';
import * as customerService from '../services/customerService';
import { stripe } from '../config';

/**
 * Create a Stripe Checkout session for adding credit to a user's account
 */
export async function createCheckoutSession(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { userId, amount, successUrl, cancelUrl } = req.body;
    
    // Validate required parameters
    if (!userId || amount === undefined || !successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, amount, successUrl, and cancelUrl are required'
      });
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount < 5) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a number and at least 5'
      });
    }
    
    console.log(`Creating checkout session for user: ${userId}, amount: $${amount}`);
    
    // Find or create customer for the user
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`No customer found for user ID: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    console.log(`Found customer: ${customer.id} for user: ${userId}`);
    
    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer: customer.id,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credits',
            description: 'Credit for API usage'
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        purpose: 'add_credit',
        creditAmount: amount.toString()
      }
    });
    
    console.log(`Created checkout session: ${session.id}`);
    
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating the checkout session'
    });
  }
} 