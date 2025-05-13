/**
 * Controller for customer-related endpoints
 */
import { ExpressRequest, ExpressResponse, AutoRechargeSettings } from '../types';
import * as customerService from '../services/customerService';
import * as creditService from '../services/creditService';
import { stripe } from '../config';

/**
 * Get or create a Stripe customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getOrCreateCustomer(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { email, name } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/customers');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    console.log(`Searching for customer with userId: ${userId}`);
    
    // Try to find existing customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    // If customer exists, return it
    if (customer) {
      const credits = await customerService.calculateCustomerCredits(customer.id);
      const customerData = customerService.formatCustomerData(customer, credits);
      
      res.status(200).json({
        success: true,
        data: customerData,
        message: 'Retrieved existing customer'
      });
      return;
    }

    // If no customer exists, create one in Stripe
    const newCustomer = await customerService.createCustomer(userId, email, name);
    
    // Add initial $5 free credit
    await customerService.addFreeSignupCredit(newCustomer.id);
    
    // Get the updated credit balance
    const credits = await customerService.calculateCustomerCredits(newCustomer.id);
    const customerData = customerService.formatCustomerData(newCustomer, credits);
    
    console.log(`Created new Stripe customer for userId: ${userId} with $5 free credit`);
    
    res.status(201).json({
      success: true,
      data: customerData,
      message: 'Created new customer with $5 free credit'
    });
    return;
  } catch (error) {
    console.error('Error in get/create customer endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
}

/**
 * Get a customer's credit balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getCustomerCreditByUserId(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/customers/:userId/credit');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    console.log(`Getting credit balance for userId: ${userId}`);
    
    // Find the customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Get credit balance
    const credits = await customerService.calculateCustomerCredits(customer.id);
    
    res.status(200).json({
      success: true,
      data: credits
    });
    return;
  } catch (error) {
    console.error('Error retrieving credit balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit balance'
    });
    return;
  }
}

/**
 * Get a customer by direct ID
 */
export async function getCustomerById(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
      return;
    }
    
    // Get customer directly
    try {
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
        return;
      }
      
      // Get credit balance
      const credits = await customerService.calculateCustomerCredits(customer.id);
      const customerData = customerService.formatCustomerData(customer, credits);
      
      res.status(200).json({
        success: true,
        data: customerData
      });
      return;
    } catch (error) {
      console.error('Error retrieving customer by ID:', error);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
  } catch (error) {
    console.error('Error in customer by ID endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
}

/**
 * Get a customer's credit balance by direct ID
 */
export async function getCustomerCreditById(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
      return;
    }
    
    try {
      // Get customer and check if it exists
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
        return;
      }
      
      // Get credit balance
      const credits = await customerService.calculateCustomerCredits(customer.id);
      
      res.status(200).json({
        success: true,
        data: credits
      });
      return;
    } catch (error) {
      console.error('Error retrieving credit by ID:', error);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
  } catch (error) {
    console.error('Error in credit by ID endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
}

/**
 * Get customer transaction history
 */
export async function getCustomerTransactions(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    try {
      // Get customer and check if it exists
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
        return;
      }
      
      // Get transaction history
      const transactions = await creditService.getTransactionHistory(customer.id, limit);
      
      // Add userId to each transaction
      const userId = customer.metadata.userId || 'unknown';
      const transactionsWithUserId = transactions.map(tx => ({
        ...tx,
        userId
      }));
      
      res.status(200).json({
        success: true,
        data: transactionsWithUserId
      });
      return;
    } catch (error) {
      console.error('Error retrieving transactions by ID:', error);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
  } catch (error) {
    console.error('Error in transactions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
}

/**
 * Get auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getAutoRechargeSettings(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/auto-recharge');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    console.log(`Getting auto-recharge settings for userId: ${userId}`);
    
    // Find customer associated with this user
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Get auto-recharge settings
    const settings = await customerService.getAutoRechargeSettings(customer.id);
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings: AutoRechargeSettings = {
        enabled: false,
        thresholdAmount: 5,
        rechargeAmount: 10
      };
      
      res.status(200).json({
        success: true,
        data: defaultSettings
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
    return;
  } catch (error) {
    console.error('Error getting auto-recharge settings:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
}

/**
 * Update auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function updateAutoRechargeSettings(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { enabled, thresholdAmount, rechargeAmount } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/auto-recharge');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    console.log(`Updating auto-recharge settings for userId: ${userId}`);
    
    // Validate inputs
    if (enabled === undefined) {
      res.status(400).json({
        success: false,
        error: 'Enabled flag is required'
      });
      return;
    }
    
    if (enabled && (thresholdAmount === undefined || rechargeAmount === undefined)) {
      res.status(400).json({
        success: false,
        error: 'Threshold amount and recharge amount are required'
      });
      return;
    }
    
    // Find customer associated with this user
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Prepare settings object
    const settings: AutoRechargeSettings = {
      enabled: Boolean(enabled),
      thresholdAmount: parseFloat(thresholdAmount) || 5,
      rechargeAmount: parseFloat(rechargeAmount) || 10
    };
    
    // Update settings in Stripe
    await customerService.updateAutoRechargeSettings(customer.id, settings);
    
    res.status(200).json({
      success: true,
      data: settings,
      message: 'Auto-recharge settings updated successfully'
    });
    return;
  } catch (error) {
    console.error('Error updating auto-recharge settings:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
    return;
  }
} 