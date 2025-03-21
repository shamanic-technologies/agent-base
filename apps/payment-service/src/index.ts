/**
 * HelloWorld Payment Service
 * 
 * A simple service for handling payments and subscriptions.
 * Uses in-memory storage for demonstration purposes.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

// Initialize Stripe with API key
const stripeApiKey = process.env.STRIPE_API_KEY || '';
if (!stripeApiKey) {
  console.warn('Warning: STRIPE_API_KEY not set. Stripe functionality will not work.');
}
const stripe = new Stripe(stripeApiKey);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3007;

// In-memory storage
const plans = [
  {
    id: 'plan_basic',
    name: 'Basic',
    price: 9.99,
    tokenLimit: 100000,
    description: 'Basic plan with limited tokens',
    active: true
  },
  {
    id: 'plan_pro',
    name: 'Professional',
    price: 29.99,
    tokenLimit: 500000,
    description: 'Professional plan with more tokens',
    active: true
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 99.99,
    tokenLimit: 2000000,
    description: 'Enterprise plan with maximum tokens',
    active: true
  }
];

const subscriptions: any[] = [];
const transactions: any[] = [];

// In-memory storage for customers
const customers: Record<string, any> = {};

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'healthy' });
});

/**
 * Get available plans
 */
app.get('/payment/plans', (req: express.Request, res: express.Response) => {
  try {
    const activePlans = plans.filter(plan => plan.active);
    
    return res.status(200).json({
      success: true,
      data: activePlans
    });
  } catch (error) {
    console.error('Error retrieving plans:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve plans'
    });
  }
});

/**
 * Get a specific plan
 */
app.get('/payment/plans/:id', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const plan = plans.find(p => p.id === id && p.active);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error retrieving plan:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve plan'
    });
  }
});

/**
 * Create a subscription
 * 
 * Request body:
 * - userId: ID of the user
 * - planId: ID of the plan
 * - paymentMethod: Payment method details
 */
app.post('/payment/subscriptions', (req: express.Request, res: express.Response) => {
  try {
    const { userId, planId, paymentMethod } = req.body;
    
    if (!userId || !planId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'User ID, plan ID, and payment method are required'
      });
    }
    
    // Check if plan exists
    const plan = plans.find(p => p.id === planId && p.active);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Check if user already has an active subscription
    const existingSubscription = subscriptions.find(
      sub => sub.userId === userId && sub.status === 'active'
    );
    
    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        error: 'User already has an active subscription',
        data: {
          subscriptionId: existingSubscription.id
        }
      });
    }
    
    // Create subscription
    const subscriptionId = `sub_${uuidv4()}`;
    const now = new Date();
    const subscription = {
      id: subscriptionId,
      userId,
      planId,
      planName: plan.name,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(now.setMonth(now.getMonth() + 1)).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to subscriptions
    subscriptions.push(subscription);
    
    // Create transaction record
    const transactionId = `txn_${uuidv4()}`;
    const transaction = {
      id: transactionId,
      userId,
      subscriptionId,
      amount: plan.price,
      currency: 'USD',
      status: 'succeeded',
      description: `Subscription to ${plan.name} plan`,
      createdAt: new Date().toISOString()
    };
    
    // Add to transactions
    transactions.push(transaction);
    
    return res.status(201).json({
      success: true,
      data: {
        subscription,
        transaction
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

/**
 * Get a user's subscriptions
 */
app.get('/payment/subscriptions/user/:userId', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    const userSubscriptions = subscriptions.filter(sub => sub.userId === userId);
    
    return res.status(200).json({
      success: true,
      data: userSubscriptions
    });
  } catch (error) {
    console.error('Error retrieving subscriptions:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscriptions'
    });
  }
});

/**
 * Cancel a subscription
 */
app.post('/payment/subscriptions/:id/cancel', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const subscriptionIndex = subscriptions.findIndex(sub => sub.id === id);
    
    if (subscriptionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Update subscription status
    subscriptions[subscriptionIndex] = {
      ...subscriptions[subscriptionIndex],
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString()
    };
    
    return res.status(200).json({
      success: true,
      data: subscriptions[subscriptionIndex]
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

/**
 * Get a user's transactions
 */
app.get('/payment/transactions/user/:userId', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    const userTransactions = transactions.filter(txn => txn.userId === userId);
    
    return res.status(200).json({
      success: true,
      data: userTransactions
    });
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transactions'
    });
  }
});

/**
 * Create a one-time payment
 * 
 * Request body:
 * - userId: ID of the user
 * - amount: Amount to charge
 * - description: Description of the payment
 * - paymentMethod: Payment method details
 */
app.post('/payment/charge', (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount, description, paymentMethod } = req.body;
    
    if (!userId || !amount || !description || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'User ID, amount, description, and payment method are required'
      });
    }
    
    // Create transaction record
    const transactionId = `txn_${uuidv4()}`;
    const transaction = {
      id: transactionId,
      userId,
      amount,
      currency: 'USD',
      status: 'succeeded',
      description,
      createdAt: new Date().toISOString()
    };
    
    // Add to transactions
    transactions.push(transaction);
    
    return res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating charge:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create charge'
    });
  }
});

/**
 * Get token usage for a user
 * 
 * Query params:
 * - period: 'day', 'week', 'month' (default: 'month')
 */
app.get('/payment/usage/:userId', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { period = 'month' } = req.query;
    
    // Find active subscription for the user
    const subscription = subscriptions.find(
      sub => sub.userId === userId && sub.status === 'active'
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    // Find the plan
    const plan = plans.find(p => p.id === subscription.planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Generate example usage data
    const totalUsage = Math.floor(Math.random() * plan.tokenLimit * 0.8);
    
    // Create mock usage data
    const usage = {
      userId,
      planId: plan.id,
      planName: plan.name,
      period: period as string,
      tokenLimit: plan.tokenLimit,
      tokenUsage: totalUsage,
      remainingTokens: plan.tokenLimit - totalUsage,
      usagePercentage: (totalUsage / plan.tokenLimit) * 100,
      lastUpdated: new Date().toISOString()
    };
    
    return res.status(200).json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Error retrieving usage:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve usage'
    });
  }
});

/**
 * Get or create a Stripe customer
 * 
 * This endpoint is called when a new user logs in to either retrieve
 * an existing Stripe customer or create a new one if it doesn't exist.
 */
app.post('/payment/customers', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, email, name } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if we already have a customer record for this user
    if (customers[userId]) {
      return res.status(200).json({
        success: true,
        data: customers[userId],
        message: 'Retrieved existing customer'
      });
    }

    // If no customer exists, create one in Stripe
    try {
      const customerParams: Stripe.CustomerCreateParams = {
        metadata: {
          userId: userId
        }
      };

      // Add email and name if available
      if (email) customerParams.email = email;
      if (name) customerParams.name = name;

      const customer = await stripe.customers.create(customerParams);

      // Store the customer data in memory (in production, this would be stored in a database)
      customers[userId] = {
        id: customer.id,
        userId: userId,
        email: customer.email,
        name: customer.name,
        createdAt: new Date(),
        // Add initial free credit for new customers
        credits: {
          total: 5.00, // $5 free credit
          used: 0,
          remaining: 5.00
        }
      };
      
      console.log(`Created new Stripe customer for userId: ${userId}`);
      
      return res.status(201).json({
        success: true,
        data: customers[userId],
        message: 'Created new customer with $5 free credit'
      });
    } catch (stripeError) {
      console.error('Error creating Stripe customer:', stripeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create Stripe customer'
      });
    }
  } catch (error) {
    console.error('Error in get/create customer endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Get a customer's credit balance
 */
app.get('/payment/customers/:userId/credit', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: customers[userId].credits
    });
  } catch (error) {
    console.error('Error retrieving customer credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer credit'
    });
  }
});

/**
 * Validate if a customer has enough credit
 */
app.post('/payment/validate-credit', (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and amount are required'
      });
    }
    
    // Check if customer exists
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const hasEnoughCredit = customers[userId].credits.remaining >= amount;
    
    return res.status(200).json({
      success: true,
      data: {
        hasEnoughCredit,
        remainingCredit: customers[userId].credits.remaining
      }
    });
  } catch (error) {
    console.error('Error validating credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate credit'
    });
  }
});

/**
 * Deduct credit from a customer's balance
 */
app.post('/payment/deduct-credit', (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and amount are required'
      });
    }
    
    // Check if customer exists
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Check if customer has enough credit
    if (customers[userId].credits.remaining < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        data: {
          remainingCredit: customers[userId].credits.remaining,
          requestedAmount: amount
        }
      });
    }
    
    // Deduct credit
    customers[userId].credits.used += amount;
    customers[userId].credits.remaining -= amount;
    
    // Record transaction
    const transaction = {
      id: uuidv4(),
      userId,
      type: 'debit',
      amount,
      description: 'API usage',
      timestamp: new Date()
    };
    
    transactions.push(transaction);
    
    console.log(`Deducted ${amount} credit from user ${userId}. Remaining: ${customers[userId].credits.remaining}`);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: customers[userId].credits.remaining
      }
    });
  } catch (error) {
    console.error('Error deducting credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deduct credit'
    });
  }
});

/**
 * Add credit to a customer's balance
 */
app.post('/payment/add-credit', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount, stripePaymentMethodId, description } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and amount are required'
      });
    }
    
    // Check if customer exists
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    let paymentSuccessful = false;
    
    // Process payment through Stripe if a payment method is provided
    if (stripePaymentMethodId && amount > 0) {
      try {
        const stripeCustomerId = customers[userId].id;
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: stripePaymentMethodId,
          confirm: true,
          description: description || 'Add credit to account'
        });
        
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
      // Add credit
      customers[userId].credits.total += amount;
      customers[userId].credits.remaining += amount;
      
      // Record transaction
      const transaction = {
        id: uuidv4(),
        userId,
        type: 'credit',
        amount,
        description: description || 'Added credit',
        timestamp: new Date()
      };
      
      transactions.push(transaction);
      
      console.log(`Added ${amount} credit to user ${userId}. New balance: ${customers[userId].credits.remaining}`);
      
      return res.status(200).json({
        success: true,
        data: {
          transaction,
          newBalance: customers[userId].credits.remaining
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'Failed to process payment'
    });
  } catch (error) {
    console.error('Error adding credit:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Get a customer's transaction history
 */
app.get('/payment/customers/:userId/transactions', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, type } = req.query;
    
    // Check if customer exists
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Filter transactions by userId and optionally by type
    let userTransactions = transactions.filter(t => t.userId === userId);
    
    if (type && (type === 'credit' || type === 'debit')) {
      userTransactions = userTransactions.filter(t => t.type === type);
    }
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    const paginatedTransactions = userTransactions.slice(
      Number(offset), 
      Number(offset) + Number(limit)
    );
    
    return res.status(200).json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        total: userTransactions.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction history'
    });
  }
});

/**
 * Set auto-reload threshold for a customer
 */
app.post('/payment/customers/:userId/auto-reload', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { 
      enabled, 
      thresholdAmount, 
      reloadAmount,
      paymentMethodId 
    } = req.body;
    
    // Check if customer exists
    if (!customers[userId]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Validate required fields when enabling
    if (enabled) {
      if (!thresholdAmount || !reloadAmount || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: 'Threshold amount, reload amount, and payment method are required when enabling auto-reload'
        });
      }
      
      // Ensure threshold and reload amounts are reasonable
      if (thresholdAmount <= 0 || reloadAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Threshold and reload amounts must be greater than zero'
        });
      }
      
      // Ensure the reload amount is greater than threshold
      if (reloadAmount <= thresholdAmount) {
        return res.status(400).json({
          success: false,
          error: 'Reload amount must be greater than threshold amount'
        });
      }
    }
    
    // Update customer's auto-reload settings
    if (!customers[userId].autoReload) {
      customers[userId].autoReload = {};
    }
    
    customers[userId].autoReload = {
      enabled: !!enabled,
      thresholdAmount: thresholdAmount || 0,
      reloadAmount: reloadAmount || 0,
      paymentMethodId: paymentMethodId || null,
      lastUpdated: new Date()
    };
    
    return res.status(200).json({
      success: true,
      data: {
        autoReload: customers[userId].autoReload
      },
      message: enabled 
        ? `Auto-reload enabled with threshold $${thresholdAmount} and reload amount $${reloadAmount}` 
        : 'Auto-reload disabled'
    });
  } catch (error) {
    console.error('Error updating auto-reload settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update auto-reload settings'
    });
  }
});

/**
 * Stripe webhook handler
 * 
 * Processes webhook events from Stripe like successful payments, 
 * failed payments, disputes, etc.
 */
app.post('/payment/webhook', express.raw({type: 'application/json'}), async (req: express.Request, res: express.Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      console.error('Webhook Error: No Stripe signature found');
      return res.status(400).send('Webhook Error: No Stripe signature found');
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Webhook Error: Stripe webhook secret not configured');
      return res.status(500).send('Webhook Error: Stripe webhook secret not configured');
    }
    
    // Verify the event came from Stripe
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent: ${paymentIntent.id} succeeded!`);
        
        // Find the customer by Stripe customer ID
        const customerId = paymentIntent.customer as string;
        const userId = Object.keys(customers).find(
          uid => customers[uid].id === customerId
        );
        
        if (userId) {
          // Note: In a real app, this would trigger the actual credit addition
          // Here we're just logging it as the actual credit would have been added
          // when the add-credit endpoint was called
          console.log(`Webhook: Confirming payment for user ${userId} - amount: ${paymentIntent.amount / 100}`);
        } else {
          console.warn(`Webhook: Customer not found for payment ${paymentIntent.id}`);
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        
        // Find the customer by Stripe customer ID
        const customerId = paymentIntent.customer as string;
        const userId = Object.keys(customers).find(
          uid => customers[uid].id === customerId
        );
        
        if (userId) {
          console.log(`Webhook: Payment failed for user ${userId} - amount: ${paymentIntent.amount / 100}`);
          // In a real app, you would update the user's payment status or send a notification
        }
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription ${event.type}: ${subscription.id}`);
        // Handle subscription changes
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({received: true});
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Webhook Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`💰 Payment Service running on port ${PORT}`);
  console.log(`Stripe integration ${stripeApiKey ? 'ENABLED' : 'DISABLED'}`);
}); 