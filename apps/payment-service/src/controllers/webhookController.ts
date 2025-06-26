/**
 * Controller for handling Stripe webhook events
 */
import { Request, Response } from 'express';
import { stripe } from '../config/index.js';
import * as creditService from '../services/creditService.js';

// Webhook secret from environment variable
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Process Stripe webhook events
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];
  
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook error: Missing signature or webhook secret');
    res.status(400).json({
      success: false,
      error: 'Webhook error',
      details: 'Missing signature or webhook secret'
    });
    return;
  }
  
  try {
    // Verify and parse the webhook event
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    
    console.log(`Received webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Handle completed checkout session
        if (session.mode === 'payment' && session.payment_status === 'paid') {
          // Get metadata
          const metadata = session.metadata || {};
          
          if (metadata.purpose === 'add_credit' && metadata.platformUserId && metadata.creditAmountInUSDCents) {
            const userId = metadata.platformUserId;
            const creditAmount = parseInt(metadata.creditAmountInUSDCents, 10);
            
            if (!isNaN(creditAmount) && creditAmount > 0) {
              console.log(`Processing successful payment for user ${userId}, adding ${creditAmount} credits`);
              
              // Add credits to customer's account
              await creditService.addCredit(
                session.customer as string,
                creditAmount,
                'Payment via Stripe Checkout'
              );
              
              console.log(`Successfully added ${creditAmount} credits to user ${userId}`);
            }
          }
        }
        break;
      }
      
      // Handle other webhook events as needed
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
    return;
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({
      success: false,
      error: 'Webhook processing failed',
      details: err
    });
    return;
  }
} 