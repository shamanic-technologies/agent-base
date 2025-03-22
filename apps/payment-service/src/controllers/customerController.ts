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
export async function getOrCreateCustomer(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { email, name } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/customers');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`Searching for customer with userId: ${userId}`);
    
    // Try to find existing customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    // If customer exists, return it
    if (customer) {
      const credits = await customerService.calculateCustomerCredits(customer.id);
      const customerData = customerService.formatCustomerData(customer, credits);
      
      return res.status(200).json({
        success: true,
        data: customerData,
        message: 'Retrieved existing customer'
      });
    }

    // If no customer exists, create one in Stripe
    const newCustomer = await customerService.createCustomer(userId, email, name);
    
    // Add initial $5 free credit
    await customerService.addFreeSignupCredit(newCustomer.id);
    
    // Get the updated credit balance
    const credits = await customerService.calculateCustomerCredits(newCustomer.id);
    const customerData = customerService.formatCustomerData(newCustomer, credits);
    
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
}

/**
 * Get a customer's credit balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getCustomerCreditByUserId(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/customers/:userId/credit');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log(`Getting credit balance for userId: ${userId}`);
    
    // Find the customer
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Get credit balance
    const credits = await customerService.calculateCustomerCredits(customer.id);
    
    return res.status(200).json({
      success: true,
      data: credits
    });
  } catch (error) {
    console.error('Error retrieving credit balance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit balance'
    });
  }
}

/**
 * Get a customer by direct ID
 */
export async function getCustomerById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    // Get customer directly
    try {
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      // Get credit balance
      const credits = await customerService.calculateCustomerCredits(customer.id);
      const customerData = customerService.formatCustomerData(customer, credits);
      
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
    console.error('Error in customer by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Get a customer's credit balance by direct ID
 */
export async function getCustomerCreditById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }
    
    try {
      // Get customer and check if it exists
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      // Get credit balance
      const credits = await customerService.calculateCustomerCredits(customer.id);
      
      return res.status(200).json({
        success: true,
        data: credits
      });
    } catch (error) {
      console.error('Error retrieving credit by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in credit by ID endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Get customer transaction history
 */
export async function getCustomerTransactions(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    try {
      // Get customer and check if it exists
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer has been deleted'
        });
      }
      
      // Get transaction history
      const transactions = await creditService.getTransactionHistory(customer.id, limit);
      
      // Add userId to each transaction
      const userId = customer.metadata.userId || 'unknown';
      const transactionsWithUserId = transactions.map(tx => ({
        ...tx,
        userId
      }));
      
      return res.status(200).json({
        success: true,
        data: transactionsWithUserId
      });
    } catch (error) {
      console.error('Error retrieving transactions by ID:', error);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
  } catch (error) {
    console.error('Error in transactions endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Get auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getAutoRechargeSettings(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/auto-recharge');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log(`Getting auto-recharge settings for userId: ${userId}`);
    
    // Find customer associated with this user
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      console.error(`Customer not found with userId: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
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
      
      return res.status(200).json({
        success: true,
        data: defaultSettings
      });
    }
    
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting auto-recharge settings:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
}

/**
 * Update auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function updateAutoRechargeSettings(req: ExpressRequest, res: ExpressResponse) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { enabled, thresholdAmount, rechargeAmount } = req.body;
    
    if (!userId) {
      console.log('Missing x-user-id header in request to /payment/auto-recharge');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log(`Updating auto-recharge settings for userId: ${userId}`);
    
    // Validate inputs
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Enabled flag is required'
      });
    }
    
    if (enabled && (thresholdAmount === undefined || rechargeAmount === undefined)) {
      return res.status(400).json({
        success: false,
        error: 'Threshold amount and recharge amount are required'
      });
    }
    
    // Find customer associated with this user
    const customer = await customerService.findCustomerByUserId(userId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Prepare settings object
    const settings: AutoRechargeSettings = {
      enabled: Boolean(enabled),
      thresholdAmount: parseFloat(thresholdAmount) || 5,
      rechargeAmount: parseFloat(rechargeAmount) || 10
    };
    
    // Update settings in Stripe
    await customerService.updateAutoRechargeSettings(customer.id, settings);
    
    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Auto-recharge settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating auto-recharge settings:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
} 