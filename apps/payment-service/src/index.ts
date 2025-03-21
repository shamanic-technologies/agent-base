/**
 * HelloWorld Payment Service
 * 
 * A simple service for handling payments and credits based on Stripe.
 * Manages customer credit balances via Stripe Customer Balance API.
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
  throw new Error('STRIPE_API_KEY is required to run the payment service');
}
const stripe = new Stripe(stripeApiKey);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3007;

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
app.get('/payment/plans', async (req: express.Request, res: express.Response) => {
  try {
    // Fetch products from Stripe
    const products = await stripe.products.list({ active: true, limit: 10 });
    
    // Get prices for each product
    const pricePromises = products.data.map(product => 
      stripe.prices.list({ product: product.id, active: true })
    );
    const priceResults = await Promise.all(pricePromises);
    
    // Combine products with their prices
    const plans = products.data.map((product, idx) => {
      const price = priceResults[idx].data[0]; // Get the first price for simplicity
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price ? price.unit_amount! / 100 : 0,
        active: product.active,
        metadata: product.metadata
      };
    });
    
    return res.status(200).json({
      success: true,
      data: plans
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
app.get('/payment/plans/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    // Get the product details from Stripe
    const product = await stripe.products.retrieve(id);
    if (!product.active) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found or inactive'
      });
    }
    
    // Get prices for this product
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const price = prices.data[0]; // Get the first price for simplicity
    
    const plan = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: price ? price.unit_amount! / 100 : 0,
      active: product.active,
      metadata: product.metadata
    };
    
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

    console.log(`Searching for customer with userId: ${userId}`);
    
    // Search for existing customers with this userId in metadata using proper query format
    try {
      const searchQuery = `metadata['userId']:'${userId}'`;
      console.log(`Using search query: ${searchQuery}`);
      
      const existingCustomers = await stripe.customers.search({
        query: searchQuery,
        limit: 1
      });

      console.log(`Found ${existingCustomers.data.length} customers for userId: ${userId}`);

      // If customer exists, return it
      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        
        // Retrieve customer cash balance 
        const customerWithCashBalance = await stripe.customers.retrieve(
          customer.id, 
          { expand: ['cash_balance'] }
        ) as Stripe.Customer & { cash_balance: Stripe.CashBalance };
        
        // Handle cash balance and calculate the remaining credit
        const cashBalance = customerWithCashBalance.cash_balance;
        const balanceAmount = 
          Math.abs(cashBalance?.available?.find(b => b.currency === 'usd')?.amount || 0) / 100;
        
        const customerData = {
          id: customer.id,
          userId: customer.metadata.userId,
          email: customer.email,
          name: customer.name,
          createdAt: new Date(customer.created * 1000),
          credits: {
            total: balanceAmount,
            used: 0,
            remaining: balanceAmount
          }
        };
        
        return res.status(200).json({
          success: true,
          data: customerData,
          message: 'Retrieved existing customer'
        });
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve customer'
      });
    }

    // If no customer exists, create one in Stripe
    const customerParams: Stripe.CustomerCreateParams = {
      metadata: {
        userId: userId
      }
    };

    // Add email and name if available
    if (email) customerParams.email = email;
    if (name) customerParams.name = name;

    console.log(`Creating new customer with params:`, customerParams);
    const customer = await stripe.customers.create(customerParams);
    
    // Add initial $5 free credit as cash balance
    const freeCredits = -500; // $5.00 in cents (negative for customer credit)
    
    await stripe.customers.createBalanceTransaction(customer.id, {
      amount: freeCredits,
      currency: 'usd',
      description: 'Free Sign-up Credit'
    });
    
    // Get the updated balance
    const customerWithCashBalance = await stripe.customers.retrieve(
      customer.id, 
      { expand: ['cash_balance'] }
    ) as Stripe.Customer & { cash_balance: Stripe.CashBalance };
    
    // Calculate remaining credit
    const cashBalance = customerWithCashBalance.cash_balance;
    const balanceAmount = 
      Math.abs(cashBalance?.available?.find(b => b.currency === 'usd')?.amount || 0) / 100;
    
    const customerData = {
      id: customer.id,
      userId: userId,
      email: customer.email,
      name: customer.name,
      createdAt: new Date(customer.created * 1000),
      credits: {
        total: balanceAmount,
        used: 0,
        remaining: balanceAmount
      }
    };
    
    console.log(`Created new Stripe customer for userId: ${userId} with $5 free credit`);
    
    return res.status(201).json({
      success: true,
      data: customerData,
      message: 'Created new customer with $5 free credit'
    });
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
app.get('/payment/customers/:userId/credit', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    console.log(`Getting credit balance for userId: ${userId}`);
    
    // Find the customer in Stripe with proper query format
    try {
      const searchQuery = `metadata['userId']:'${userId}'`;
      console.log(`Using search query: ${searchQuery}`);
      
      const customers = await stripe.customers.search({
        query: searchQuery,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        console.error(`Customer not found with userId: ${userId}. This may be due to Stripe search indexing delay.`);
      return res.status(404).json({
        success: false,
          error: 'Customer not found. If the customer was just created, please wait a few minutes for Stripe to index the data.',
          errorCode: 'STRIPE_SEARCH_INDEXING_DELAY'
        });
      }
      
      const customer = customers.data[0];
      
      // Get transaction history to calculate used credits and total credits
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Calculate total credits granted (all negative transactions)
      const totalCredits = balanceTransactions.data
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
      
      // Calculate used credits (all positive transactions)
      const usedCredits = balanceTransactions.data
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0) / 100;
      
      // Calculate remaining credits
      const remainingCredits = totalCredits - usedCredits;
      
      console.log(`Credit calculation for ${userId}:`, {
        totalCredits,
        usedCredits,
        remainingCredits
      });
      
      return res.status(200).json({
        success: true,
        data: {
          total: totalCredits,
          used: usedCredits,
          remaining: remainingCredits
        }
      });
    } catch (error) {
      console.error('Error retrieving credit balance:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve credit balance'
      });
    }
  } catch (error) {
    console.error('Error retrieving credit balance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit balance'
    });
  }
});

/**
 * Validate if a customer has sufficient credit for a specific operation
 */
app.post('/payment/validate-credit', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and amount are required'
      });
    }
    
    console.log(`Validating credit for userId: ${userId}, amount: ${amount}`);
    
    // Find the customer in Stripe with proper query format
    try {
      const searchQuery = `metadata['userId']:'${userId}'`;
      console.log(`Using search query: ${searchQuery}`);
      
      const customers = await stripe.customers.search({
        query: searchQuery,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        console.error(`Customer not found with userId: ${userId}. This may be due to Stripe search indexing delay.`);
        return res.status(404).json({
          success: false,
          error: 'Customer not found. If the customer was just created, please wait a few minutes for Stripe to index the data.',
          errorCode: 'STRIPE_SEARCH_INDEXING_DELAY'
        });
      }
      
      const customer = customers.data[0];
      
      // Get customer cash balance
      const customerWithCashBalance = await stripe.customers.retrieve(
        customer.id, 
        { expand: ['cash_balance'] }
      ) as Stripe.Customer & { cash_balance: Stripe.CashBalance };
        
      // Calculate remaining credit
      const cashBalance = customerWithCashBalance.cash_balance;
      const remainingCredit = 
        Math.abs(cashBalance?.available?.find(b => b.currency === 'usd')?.amount || 0) / 100;
      
      const hasEnoughCredit = remainingCredit >= amount;
      
      return res.status(200).json({
      success: true,
      data: {
          hasEnoughCredit,
          remainingCredit
      }
    });
  } catch (error) {
      console.error('Error validating credit:', error);
    return res.status(500).json({
      success: false,
        error: 'Failed to validate credit'
      });
    }
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
app.post('/payment/deduct-credit', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, amount, description = 'API usage' } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and amount are required'
      });
    }
    
    console.log(`Deducting ${amount} credit from user: ${userId}`);
    
    // Find the customer by userId
    const customers = await stripe.customers.list({
      limit: 1,
      metadata: { userId }
    });
    
    if (customers.data.length === 0) {
      console.error(`No customer found for user ID: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const customer = customers.data[0];
    console.log(`Found customer: ${customer.id} for user: ${userId}`);
    
    // Check if customer has enough credit
    const balanceTransactions = await stripe.customers.listBalanceTransactions(
      customer.id,
      { limit: 100 }
    );
    
    // Calculate total credits granted (all negative transactions)
    const totalCredits = balanceTransactions.data
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
    
    // Calculate used credits (all positive transactions)
    const usedCredits = balanceTransactions.data
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0) / 100;
    
    // Calculate remaining credits
    const remainingCredit = totalCredits - usedCredits;
    
    console.log(`Credit check for ${userId}:`, {
      totalCredits,
      usedCredits,
      remainingCredit,
      requestedAmount: amount
    });
    
    if (remainingCredit < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit',
        data: {
          remainingCredit,
          requestedAmount: amount
        }
      });
    }
    
    // Create a positive balance transaction to deduct credit
    const balanceTransaction = await stripe.customers.createBalanceTransaction(customer.id, {
      amount: Math.round(amount * 100), // Convert to cents (positive for deduction)
      currency: 'usd',
      description: description
    });
    
    // Calculate new balance after deduction
    const newUsedCredits = usedCredits + amount;
    const newBalance = totalCredits - newUsedCredits;
    
    console.log(`Deducted ${amount} credit from customer ${customer.id} (${userId}). Remaining: ${newBalance}`);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: {
          id: balanceTransaction.id,
          customerId: customer.id,
          userId,
          type: 'debit',
          amount,
          description,
          timestamp: new Date(balanceTransaction.created * 1000)
        },
        newBalance
      }
    });
  } catch (error) {
    console.error('Error in deduct credit endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
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
    
    console.log(`Adding ${amount} credit to user: ${userId}`);
    
    // Find the customer by userId
    const customers = await stripe.customers.list({
      limit: 1,
      metadata: { userId }
    });
    
    if (customers.data.length === 0) {
      console.error(`No customer found for user ID: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const customer = customers.data[0];
    console.log(`Found customer: ${customer.id} for user: ${userId}`);
    
    let paymentSuccessful = false;
    
    // Process payment through Stripe if a payment method is provided
    if (stripePaymentMethodId && amount > 0) {
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          customer: customer.id,
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
      // Get existing balance transactions to calculate current balance
      const existingTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Calculate total credits granted (all negative transactions)
      const existingTotalCredits = existingTransactions.data
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
      
      // Calculate used credits (all positive transactions)
      const existingUsedCredits = existingTransactions.data
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0) / 100;
      
      // Create a negative balance transaction to add credit
      const balanceTransaction = await stripe.customers.createBalanceTransaction(customer.id, {
        amount: Math.round(amount * -100), // Convert to cents (negative for credit)
        currency: 'usd',
        description: description || 'Added credit'
      });
      
      // Calculate new balance after adding credit
      const newTotalCredits = existingTotalCredits + amount;
      const newBalance = newTotalCredits - existingUsedCredits;
      
      console.log(`Credit calculation after adding ${amount}:`, {
        previousTotalCredits: existingTotalCredits,
        newTotalCredits,
        usedCredits: existingUsedCredits,
        newBalance
      });
      
      console.log(`Added ${amount} credit to user ${userId}. New balance: ${newBalance}`);
  
      return res.status(200).json({
        success: true,
        data: {
          transaction: {
            id: balanceTransaction.id,
            customerId: customer.id,
            userId,
            type: 'credit',
            amount,
            description: description || 'Added credit',
            timestamp: new Date(balanceTransaction.created * 1000)
          },
          newBalance
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
});

/**
 * Get a customer's transaction history
 */
app.get('/payment/customers/:userId/transactions', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, type } = req.query;
    
    console.log(`Getting transaction history for userId: ${userId}`);
    
    // Find the customer in Stripe with proper query format
    try {
      const searchQuery = `metadata['userId']:'${userId}'`;
      console.log(`Using search query: ${searchQuery}`);
      
      const customers = await stripe.customers.search({
        query: searchQuery,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        console.error(`Customer not found with userId: ${userId}. This may be due to Stripe search indexing delay.`);
        return res.status(404).json({
          success: false,
          error: 'Customer not found. If the customer was just created, please wait a few minutes for Stripe to index the data.',
          errorCode: 'STRIPE_SEARCH_INDEXING_DELAY'
        });
      }
      
      const customer = customers.data[0];
      
      // Get transaction history from Stripe
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Format transactions
      let userTransactions = balanceTransactions.data.map(tx => ({
        id: tx.id,
        userId,
        type: tx.amount < 0 ? 'credit' : 'debit',
        amount: Math.abs(tx.amount) / 100, // Convert to dollars and make positive
        description: tx.description,
        timestamp: new Date(tx.created * 1000)
      }));
      
      // Filter by type if specified
      if (type && (type === 'credit' || type === 'debit')) {
        userTransactions = userTransactions.filter(t => t.type === type);
      }
      
      // Sort by timestamp (newest first)
      userTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
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
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction history'
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
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !('deleted' in customer)) {
            // Get the userId from metadata
            const userId = customer.metadata.userId;
            
            console.log(`Webhook: Confirming payment for user ${userId} - amount: ${paymentIntent.amount / 100}`);
          }
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        
        // Find the customer by Stripe customer ID
        const customerId = paymentIntent.customer as string;
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !('deleted' in customer)) {
            // Get the userId from metadata
            const userId = customer.metadata.userId;
            
            console.log(`Webhook: Payment failed for user ${userId} - amount: ${paymentIntent.amount / 100}`);
          }
        }
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

/**
 * Get customer by direct ID (bypasses search)
 */
app.get('/payment/customers-direct/:customerId', async (req: express.Request, res: express.Response) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    console.log(`Getting customer by direct ID: ${customerId}`);
    
    // Get the customer directly from Stripe
    try {
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      // Get transaction history to calculate credits
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Calculate total credits granted (all negative transactions)
      const totalCredits = balanceTransactions.data
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
      
      // Calculate used credits (all positive transactions)
      const usedCredits = balanceTransactions.data
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0) / 100;
      
      // Calculate remaining credits
      const remainingCredits = totalCredits - usedCredits;
      
      const customerData = {
        id: customer.id,
        userId: customer.metadata.userId || 'unknown',
        email: customer.email,
        name: customer.name,
        createdAt: new Date(customer.created * 1000),
        credits: {
          total: totalCredits,
          used: usedCredits,
          remaining: remainingCredits
        }
      };
      
      return res.status(200).json({
        success: true,
        data: customerData
      });
    } catch (error) {
      console.error('Error retrieving customer by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in get customer by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Get a customer's credit balance by direct ID
 */
app.get('/payment/customers-direct/:customerId/credit', async (req: express.Request, res: express.Response) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    console.log(`Getting credit balance for customer ID: ${customerId}`);
    
    try {
      // Get customer directly
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      // Get transaction history to calculate used credits and total credits
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Calculate total credits granted (all negative transactions)
      const totalCredits = balanceTransactions.data
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
      
      // Calculate used credits (all positive transactions)
      const usedCredits = balanceTransactions.data
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0) / 100;
      
      // Calculate remaining credits
      const remainingCredits = totalCredits - usedCredits;
      
      console.log(`Credit calculation for ${customerId}:`, {
        totalCredits,
        usedCredits,
        remainingCredits
      });
      
      return res.status(200).json({
      success: true,
        data: {
          total: totalCredits,
          used: usedCredits,
          remaining: remainingCredits
        }
    });
  } catch (error) {
      console.error('Error retrieving credit balance by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in get credit balance by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Add credit to a customer's balance by direct ID
 */
app.post('/payment/add-credit-direct', async (req: express.Request, res: express.Response) => {
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
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            customer: customer.id,
            payment_method: stripePaymentMethodId,
            confirm: true,
            description: description || 'Add credit to account'
          });
          
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
        // (e.g., promotional credit) and not require a Stripe payment
        paymentSuccessful = true;
      }
      
      if (paymentSuccessful) {
        // Get existing balance transactions to calculate current balance
        const existingTransactions = await stripe.customers.listBalanceTransactions(
          customer.id,
          { limit: 100 }
        );
        
        // Calculate total credits granted (all negative transactions)
        const existingTotalCredits = existingTransactions.data
          .filter(tx => tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
        
        // Calculate used credits (all positive transactions)
        const existingUsedCredits = existingTransactions.data
          .filter(tx => tx.amount > 0)
          .reduce((sum, tx) => sum + tx.amount, 0) / 100;
        
        // Create a negative balance transaction to add credit
        const balanceTransaction = await stripe.customers.createBalanceTransaction(customer.id, {
          amount: Math.round(amount * -100), // Convert to cents (negative for credit)
          currency: 'usd',
          description: description || 'Added credit'
        });
        
        // Calculate new balance after adding credit
        const newTotalCredits = existingTotalCredits + amount;
        const newBalance = newTotalCredits - existingUsedCredits;
        
        console.log(`Credit calculation after adding ${amount}:`, {
          previousTotalCredits: existingTotalCredits,
          newTotalCredits,
          usedCredits: existingUsedCredits,
          newBalance
        });
        
        const userId = customer.metadata.userId || 'unknown';
        console.log(`Added ${amount} credit to customer ${customerId} (${userId}). New balance: ${newBalance}`);
        
        return res.status(200).json({
          success: true,
          data: {
            transaction: {
              id: balanceTransaction.id,
              customerId,
              userId,
              type: 'credit',
              amount,
              description: description || 'Added credit',
              timestamp: new Date(balanceTransaction.created * 1000)
            },
            newBalance
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
});

/**
 * Deduct credit from a customer's balance by direct ID
 */
app.post('/payment/deduct-credit-direct', async (req: express.Request, res: express.Response) => {
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
      
      // Check if customer has enough credit
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Calculate total credits granted (all negative transactions)
      const totalCredits = balanceTransactions.data
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
      
      // Calculate used credits (all positive transactions)
      const usedCredits = balanceTransactions.data
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0) / 100;
      
      // Calculate remaining credits
      const remainingCredit = totalCredits - usedCredits;
      
      console.log(`Credit check for ${customerId}:`, {
        totalCredits,
        usedCredits,
        remainingCredit,
        requestedAmount: amount
      });
      
      if (remainingCredit < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credit',
          data: {
            remainingCredit,
            requestedAmount: amount
          }
        });
      }
      
      // Create a positive balance transaction to deduct credit
      const balanceTransaction = await stripe.customers.createBalanceTransaction(customer.id, {
        amount: Math.round(amount * 100), // Convert to cents (positive for deduction)
        currency: 'usd',
        description: description
      });
      
      // Calculate new balance after deduction
      const newUsedCredits = usedCredits + amount;
      const newBalance = totalCredits - newUsedCredits;
      
      const userId = customer.metadata.userId || 'unknown';
      console.log(`Deducted ${amount} credit from customer ${customerId} (${userId}). Remaining: ${newBalance}`);
      
      return res.status(200).json({
        success: true,
        data: {
          transaction: {
            id: balanceTransaction.id,
            customerId,
            userId,
            type: 'debit',
            amount,
            description,
            timestamp: new Date(balanceTransaction.created * 1000)
          },
          newBalance
        }
      });
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
});

/**
 * Get a customer's transaction history by direct ID
 */
app.get('/payment/customers-direct/:customerId/transactions', async (req: express.Request, res: express.Response) => {
  try {
    const { customerId } = req.params;
    const { limit = 20, offset = 0, type } = req.query;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    console.log(`Getting transaction history for customer ID: ${customerId}`);
    
    try {
      // Get customer directly
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
      return res.status(404).json({
        success: false,
          error: 'Customer has been deleted'
        });
      }
      
      const userId = customer.metadata.userId || 'unknown';
      
      // Get transaction history from Stripe
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customer.id,
        { limit: 100 }
      );
      
      // Format transactions
      let userTransactions = balanceTransactions.data.map(tx => ({
        id: tx.id,
        customerId,
      userId,
        type: tx.amount < 0 ? 'credit' : 'debit',
        amount: Math.abs(tx.amount) / 100, // Convert to dollars and make positive
        description: tx.description,
        timestamp: new Date(tx.created * 1000)
      }));
      
      // Filter by type if specified
      if (type && (type === 'credit' || type === 'debit')) {
        userTransactions = userTransactions.filter(t => t.type === type);
      }
      
      // Sort by timestamp (newest first)
      userTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
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
      console.error('Error retrieving transaction history by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in get transaction history by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`💰 Payment Service running on port ${PORT}`);
  console.log(`Stripe integration ENABLED using API key: ${stripeApiKey.substring(0, 7)}...`);
}); 