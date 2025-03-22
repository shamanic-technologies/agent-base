/**
 * Payment Service
 * 
 * Handles payment operations for the logging service, such as
 * debiting usage costs from user accounts.
 */
import fetch from 'node-fetch';
import pino from 'pino';

// Set up logging with pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

// Payment service URL is accessed directly from environment in each function
// to ensure it's always using the current value

/**
 * Debit usage cost from user's account via payment service
 * @param userId The user ID to debit
 * @param amount The amount to debit (in USD)
 * @param description Description of the usage
 * @returns Success status and any error message
 */
export async function debitUsage(userId: string, amount: number, description: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Get payment service URL from environment
    const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
    if (!PAYMENT_SERVICE_URL) {
      throw new Error('PAYMENT_SERVICE_URL environment variable is not defined');
    }

    // Skip debiting if amount is too small
    if (amount < 0.001) {
      logger.info(`Skipping payment debit for user ${userId} - amount ${amount} is too small (less than $0.001)`);
      return { success: true };
    }

    logger.info(`Debiting ${amount.toFixed(6)} USD from user ${userId} for ${description}`);
    
    // Direct connection to payment service
    const debitUrl = `${PAYMENT_SERVICE_URL}/payment/deduct-credit`;
    
    try {
      const response = await fetch(debitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': userId // Using standard header format instead of body parameter
        },
        body: JSON.stringify({
          amount,
          description
        })
      });
      
      // Check for network or connection errors
      if (!response) {
        throw new Error('No response received from payment service');
      }
      
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data?: {
          transaction?: { id: string };
          newBalance?: number;
        }
      };
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Failed to debit usage: ${response.status}`;
        logger.error(`Payment service error: ${errorMessage}`, data);
        return { success: false, error: errorMessage };
      }
      
      logger.info(`Successfully debited ${amount.toFixed(6)} USD from user ${userId}`, {
        transaction: data.data?.transaction?.id,
        newBalance: data.data?.newBalance
      });
      
      return { success: true };
    } catch (fetchError) {
      // Specific handling for network/connection errors
      const errorMessage = fetchError instanceof Error 
        ? `Network error connecting to payment service: ${fetchError.message}`
        : 'Unknown network error connecting to payment service';
      
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    logger.error(`Failed to debit usage for user ${userId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error debiting usage'
    };
  }
} 