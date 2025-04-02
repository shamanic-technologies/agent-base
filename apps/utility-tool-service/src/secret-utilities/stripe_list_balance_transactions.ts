/**
 * Stripe List Balance Transactions Utility
 * 
 * Lists all balance transactions from Stripe using the user's API keys
 * This provides a comprehensive view of money moving in and out of the Stripe account
 * If keys are not available, provides an API endpoint for the user to submit their keys
 */
import axios from 'axios';
import { 
  UtilityTool,
  StripeListTransactionsRequest, 
  StripeListTransactionsResponse,
  StripeAuthNeededResponse,
  StripeTransactionsSuccessResponse,
  StripeTransactionsErrorResponse,
  StripeTransaction
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import {
  getStripeEnvironmentVariables,
  checkStripeApiKeys,
  generateAuthNeededResponse,
  getStripeApiKeys,
  formatStripeErrorResponse
} from './stripe-utils.js';

/**
 * Available transaction types to filter by
 */
type StripeTransactionType = 
  'charge' | 
  'refund' | 
  'adjustment' | 
  'application_fee' | 
  'application_fee_refund' | 
  'dispute' | 
  'payment' | 
  'payout' | 
  'transfer';

/**
 * Implementation of the Stripe List Balance Transactions utility
 */
const stripeListBalanceTransactionsUtility: UtilityTool = {
  id: 'utility_stripe_list_balance_transactions',
  description: 'List all balance transactions (money in/out) from Stripe',
  schema: {
    limit: {
      type: 'number',
      optional: true,
      description: 'Maximum number of transactions to return (default: 10)'
    },
    starting_after: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to start after'
    },
    ending_before: {
      type: 'string',
      optional: true,
      description: 'Cursor for pagination, transaction ID to end before'
    },
    type: {
      type: 'string',
      optional: true,
      description: 'Filter by transaction type (e.g. "charge,refund" for both charges and refunds)'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: StripeListTransactionsRequest & { type?: string }): Promise<StripeListTransactionsResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        limit = 10,
        starting_after,
        ending_before,
        type
      } = params || {};
      
      console.log(`💳 [STRIPE_LIST_BALANCE_TRANSACTIONS] Listing balance transactions for user: ${userId}`);
      
      // Get environment variables
      const { secretServiceUrl, apiGatewayUrl } = getStripeEnvironmentVariables();
      
      // Check if user has the required API keys
      const { exists } = await checkStripeApiKeys(userId, secretServiceUrl);
      
      // If we don't have the API keys, return auth needed response
      if (!exists) {
        return generateAuthNeededResponse(apiGatewayUrl, '💳 [STRIPE_LIST_BALANCE_TRANSACTIONS]');
      }
      
      // Get the API keys
      const stripeKeys = await getStripeApiKeys(userId, secretServiceUrl);
      
      // Call the Stripe API with the secret key
      console.log(`💳 [STRIPE_LIST_BALANCE_TRANSACTIONS] Calling Stripe API to list balance transactions`);
      
      // Build query parameters
      const queryParams: any = {
        limit,
        starting_after: starting_after || undefined,
        ending_before: ending_before || undefined
      };
      
      // Add type filter if provided
      if (type) {
        queryParams.type = type;
      } else {
        // By default, show charges and refunds only (most useful for users)
        queryParams.type = 'charge,refund';
      }
      
      const stripeResponse = await axios.get(
        'https://api.stripe.com/v1/balance_transactions',
        {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${stripeKeys.apiSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const balanceTransactions = stripeResponse.data.data || [];
      
      // Map the Stripe balance transactions to our transaction format
      const transactions: StripeTransaction[] = balanceTransactions.map((transaction: any) => {
        // Determine if this is an inflow or outflow for display purposes
        const isOutflow = transaction.amount < 0;
        
        // Build a human-readable description
        let description = '';
        
        switch(transaction.type) {
          case 'charge':
            description = `Charge: ${transaction.description || transaction.source}`;
            break;
          case 'refund':
            description = `Refund: ${transaction.description || transaction.source}`;
            break;
          case 'payment':
            description = `Payment: ${transaction.description || transaction.source}`;
            break;
          case 'payout':
            description = `Payout to bank: ${transaction.description || transaction.source}`;
            break;
          case 'transfer':
            description = `Transfer: ${transaction.description || transaction.source}`;
            break;
          case 'adjustment':
            description = `Adjustment: ${transaction.description || transaction.source}`;
            break;
          case 'dispute':
            description = `Dispute: ${transaction.description || transaction.source}`;
            break;
          default:
            description = `${transaction.type}: ${transaction.description || transaction.source}`;
        }
        
        return {
          id: transaction.id,
          amount: transaction.amount / 100, // Already has correct sign (negative for outflow)
          currency: transaction.currency,
          description: description,
          status: transaction.status,
          created: transaction.created,
          customer: null, // Balance API doesn't include customer directly
          metadata: {},
          type: transaction.type,
          source: transaction.source,
          fee: transaction.fee ? transaction.fee / 100 : 0, // Convert fee to dollars
          available_on: transaction.available_on
        };
      });
      
      // Return the transactions
      const successResponse: StripeTransactionsSuccessResponse = {
        success: true,
        count: transactions.length,
        transactions,
        has_more: stripeResponse.data.has_more || false
      };
      
      return successResponse;
    } catch (error) {
      console.error("❌ [STRIPE_LIST_BALANCE_TRANSACTIONS] Error:", error);
      return formatStripeErrorResponse(error);
    }
  }
};

// Register the utility
registry.register(stripeListBalanceTransactionsUtility);

// Export the utility
export default stripeListBalanceTransactionsUtility; 