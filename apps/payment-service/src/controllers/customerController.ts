/**
 * Controller for customer-related endpoints
 */
import { Request, Response } from 'express';
import { AgentBaseAutoRechargeSettings, AgentBaseCustomerCredits, AgentBasePricing, AgentBaseStripeCustomerInformation, AgentBaseCreateCustomerRequest } from '@agent-base/types';
import * as customerService from '../services/customerService.js';
import * as creditService from '../services/creditService.js';
import { stripe } from '../config/index.js';
import Stripe from 'stripe';
// // /**
//  * Get or create a Stripe customer
//  * 
//  * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
//  */
// export async function getOrCreateCustomer(req: Request, res: Response): Promise<void> {
//   try {
//     // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
//     const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;

//     // Try to find existing customer
//     let stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
//     // If customer exists, return it
//     if (!stripeCustomer) {
//       // If no customer exists, create one in Stripe
//       stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
      
//       // Add initial $5 free credit
//       await customerService.addFreeSignupCredit(stripeCustomer.id);
//     }

//     // Get the updated credit balance
//     const credits: CustomerCredits = await customerService.calculateCustomerCredits(stripeCustomer.id);
//     const stripeCustomerInformation: StripeCustomerInformation = customerService.formatCustomerData(stripeCustomer, credits);
        
//     res.status(201).json({
//       success: true,
//       data: stripeCustomerInformation,
//     });
//     return;
//   } catch (error) {
//     console.error('Error in get/create customer endpoint:', error);
//     res.status(500).json({
//       success: false,
//       error: 'An unexpected error occurred',
//       details: error
//     });
//     return;
//   }
// }

/**
 * Get a customer's credit balance by user ID
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getStripeCustomerCreditByPlatformUserId(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;

    console.log(`Getting credit balance for userId: ${platformUserId}`);
    
    // Find the customer
    const stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!stripeCustomer) {
      console.error(`Customer not found with userId: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found',
        details: `Customer not found with userId: ${platformUserId}`
      });
      return;
    }
    
    // Get credit balance
    const credits: AgentBaseCustomerCredits = await customerService.calculateCustomerCredits(stripeCustomer.id);
    
    res.status(200).json({
      success: true,
      data: credits
    });
    return;
  } catch (error) {
    console.error('Error retrieving credit balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit balance',
      details: error
    });
    return;
  }
}

// /**
//  * Get a customer by direct ID
//  */
// export async function getStripeCustomerByStripeCustomerId(req: Request, res: Response): Promise<void> {
//   try {
//     const { stripeCustomerId } = req.params;
    
//     if (!stripeCustomerId) {
//       res.status(400).json({
//         success: false,
//         error: 'Stripe Customer ID is required'
//       });
//       return;
//     }
    
//     // Get customer directly
//     try {
//       const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
      
//       if ('deleted' in stripeCustomer) {
//         res.status(404).json({
//           success: false,
//           error: 'Customer has been deleted'
//         });
//         return;
//       }
      
//       // Get credit balance
//       const credits: CustomerCredits = await customerService.calculateCustomerCredits(stripeCustomer.id);
//       const stripeCustomerInformation: StripeCustomerInformation = customerService.formatCustomerData(stripeCustomer, credits);
      
//       res.status(200).json({
//         success: true,
//         data: stripeCustomerInformation
//       });
//       return;
//     } catch (error) {
//       console.error('Error retrieving customer by ID:', error);
//       res.status(404).json({
//         success: false,
//         error: 'Customer not found',
//         details: error
//       });
//       return;
//     }
//   } catch (error) {
//     console.error('Error in customer by ID endpoint:', error);
//     res.status(500).json({
//       success: false,
//       error: 'An unexpected error occurred',
//       details: error
//     });
//     return;
//   }
// }

// /**
//  * Get a customer's credit balance by direct ID
//  */
// export async function getStripeCustomerCreditByStripeCustomerId(req: Request, res: Response): Promise<void> {
//   try {
//     const { stripeCustomerId } = req.params;
    
//     if (!stripeCustomerId) {
//       res.status(400).json({
//         success: false,
//         error: 'Stripe Customer ID is required',
//         details: 'Missing stripeCustomerId in request to /payment/customers/:stripeCustomerId/credit'
//       });
//       return;
//     }
    
//     try {
//       // Get customer and check if it exists
//       const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
      
//       if ('deleted' in stripeCustomer) {
//         res.status(404).json({
//           success: false,
//           error: 'Customer has been deleted',
//           details: `Customer has been deleted with stripeCustomerId: ${stripeCustomerId}`
//         });
//         return;
//       }
      
//       // Get credit balance
//       const credits: CustomerCredits = await customerService.calculateCustomerCredits(stripeCustomer.id);
      
//       res.status(200).json({
//         success: true,
//         data: credits
//       });
//       return;
//     } catch (error) {
//       console.error('Error retrieving credit by ID:', error);
//       res.status(404).json({
//         success: false,
//         error: 'Customer not found',
//         details: error
//       });
//       return;
//     }
//   } catch (error) {
//     console.error('Error in credit by ID endpoint:', error);
//     res.status(500).json({
//       success: false,
//       error: 'An unexpected error occurred',
//       details: error
//     });
//     return;
//   }
// }

/**
 * Get customer transaction history
 */
export async function getStripeTransactions(req: Request, res: Response): Promise<void> {
   // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
   const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;
   const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
   
   try {
      // Find the customer
    const stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!stripeCustomer) {
      console.error(`Customer not found with userId: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found',
        details: `Customer not found with userId: ${platformUserId}`
      });
      return;
    }

    // Get customer and check if it exists    
    if ('deleted' in stripeCustomer) {
      console.error(`Customer has been deleted with stripeCustomerId: ${stripeCustomer.id}`);
      res.status(404).json({
        success: false,
        error: 'Customer has been deleted',
        details: `Customer has been deleted with stripeCustomerId: ${stripeCustomer.id}`
      });
      return;
    }
    
    // Get transaction history
    const transactions: Stripe.CustomerBalanceTransaction[] = await creditService.getTransactionHistory(stripeCustomer.id, limit);

    res.status(200).json({
      success: true,
      data: transactions
    });
    return;

  } catch (error) {
    console.error('Error in transactions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      details: error
    });
    return;
  }
}


/**
 * Get customer transaction history
 */
export async function getStripeTransactionsByStripeCustomerId(req: Request, res: Response): Promise<void> {
  try {
    const { stripeCustomerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    try {
      // Get customer and check if it exists
      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
      
      if ('deleted' in stripeCustomer) {
        console.error(`Customer has been deleted with stripeCustomerId: ${stripeCustomerId}`);
        res.status(404).json({
          success: false,
          error: 'Customer has been deleted',
          details: `Customer has been deleted with stripeCustomerId: ${stripeCustomerId}`
        });
        return;
      }
      
      // Get transaction history
      const transactions: Stripe.CustomerBalanceTransaction[] = await creditService.getTransactionHistory(stripeCustomer.id, limit);

      res.status(200).json({
        success: true,
        data: transactions
      });
      return;
    } catch (error) {
      console.error('Error retrieving transactions by ID:', error);
      res.status(404).json({
        success: false,
        error: 'Customer not found',
        details: error
      });
      return;
    }
  } catch (error) {
    console.error('Error in transactions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      details: error
    });
    return;
  }
}

/**
 * Get auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function getAutoRechargeSettings(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;

    console.log(`Getting auto-recharge settings for userId: ${platformUserId}`);
    
    // Find customer associated with this user
    const stripeCustomer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!stripeCustomer) {
      console.error(`Customer not found with userId: ${platformUserId}`);
      res.status(404).json({
        success: false,
        error: 'Customer not found',
        details: `Customer not found with userId: ${platformUserId}`
      });
      return;
    }
    
    // Get auto-recharge settings
    const settings = await customerService.getAutoRechargeSettings(stripeCustomer.id);
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings: AgentBaseAutoRechargeSettings = {
        platformUserId: platformUserId,
        enabled: false,
        thresholdAmountInUSDCents: 500, // Default to $5
        rechargeAmountInUSDCents: 1000 // Default to $10
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
      error: 'An unexpected error occurred',
      details: error
    });
    return;
  }
}

/**
 * Update auto-recharge settings for a customer
 * 
 * Gets the user ID from x-user-id header (set by web-gateway auth middleware)
 */
export async function updateAutoRechargeSettings(req: Request, res: Response): Promise<void> {
  try {
    // The authMiddleware ensures platformUser and platformUser.platformUserId are present.
    const { platformUserId, platformUserEmail, platformUserName } = req.platformUser!;
    const { enabled, thresholdAmountInUSDCents, rechargeAmountInUSDCents } : AgentBaseAutoRechargeSettings = req.body;
    
    console.log(`Updating auto-recharge settings for userId: ${platformUserId}`);
    
    // Validate inputs
    if (enabled === undefined) {
      res.status(400).json({
        success: false,
        error: 'Enabled flag is required',
        details: 'Enabled flag is required'
      });
      return;
    }
    
    if (enabled && (thresholdAmountInUSDCents === undefined || rechargeAmountInUSDCents === undefined)) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Threshold amount and recharge amount are required'
      });
      return;
    }
    
    // Find customer associated with this user
    const customer = await customerService.getOrCreateStripeCustomer(platformUserId, platformUserEmail, platformUserName);
    
    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
      return;
    }
    
    // Prepare settings object
    const settings: AgentBaseAutoRechargeSettings = {
      platformUserId: platformUserId,
      enabled: Boolean(enabled),
      thresholdAmountInUSDCents,
      rechargeAmountInUSDCents
    };
    
    // Update settings in Stripe
    await customerService.updateAutoRechargeSettings(customer.id, settings);
    
    res.status(200).json({
      success: true,
      data: settings,
    });
    return;
  } catch (error) {
    console.error('Error updating auto-recharge settings:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      details: error
    });
    return;
  }
} 