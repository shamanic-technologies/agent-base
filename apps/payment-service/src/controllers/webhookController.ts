/**
 * Controller for handling Stripe webhook events
 */
import { ExpressRequest, ExpressResponse } from '../types';
import { stripe } from '../config';
import * as creditService from '../services/creditService';

// Webhook secret from environment variable
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Process Stripe webhook events
 */
export async function handleWebhook(req: ExpressRequest, res: ExpressResponse) {
  const signature = req.headers['stripe-signature'];
  
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook error: Missing signature or webhook secret');
    return res.status(400).json({
      success: false,
      error: 'Missing signature or webhook secret'
    });
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
          
          if (metadata.purpose === 'add_credit' && metadata.userId && metadata.creditAmount) {
            const userId = metadata.userId;
            const creditAmount = parseFloat(metadata.creditAmount);
            
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
    
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
} 