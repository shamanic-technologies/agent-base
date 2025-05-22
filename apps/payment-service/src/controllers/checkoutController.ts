/**
 * Controller for Stripe Checkout session operations
 */
import { Request, Response } from 'express';
import * as customerService from '../services/customerService.js';
import { stripe } from '../config/index.js';
import { CreateCheckoutSessionRequest } from '@agent-base/types';
import Stripe from 'stripe';
/**
 * Create a Stripe Checkout session for adding credit to a user's account
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;
    const { amountInUSDCents, successUrl, cancelUrl }: CreateCheckoutSessionRequest = req.body;
    
    // Validate required parameters
    if (amountInUSDCents === undefined || !successUrl || !cancelUrl) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: amountInUSDCents, successUrl, and cancelUrl are required'
      });
      return;
    }
    
    // Validate amount
    if (typeof amountInUSDCents !== 'number' || amountInUSDCents < 500) {
      res.status(400).json({
        success: false,
        error: 'Amount must be a number and at least $5'
      });
      return;
    }
    
    console.log(`Creating checkout session for user: ${platformUserId}, amount: $${(amountInUSDCents/100).toFixed(2)}`);
    
    // Find or create customer for the user
    const stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!stripeCustomer) {
      console.error(`No customer found for user ID: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    console.log(`Found customer: ${stripeCustomer.id} for user: ${platformUserId}`);
    
    // Create a Stripe Checkout session
    const stripeCheckoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer: stripeCustomer.id,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credits',
            description: 'Credit for API usage'
          },
          unit_amount: Math.round(amountInUSDCents), // Convert to cents
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        platformUserId: platformUserId,
        purpose: 'add_credit',
        creditAmountInUSDCents: amountInUSDCents.toString()
      }
    });
    
    console.log(`Created checkout session: ${stripeCheckoutSession.id}`);
    
    res.status(200).json({
      success: true,
      data: stripeCheckoutSession
    });
    return;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating the checkout session'
    });
    return;
  }
} 