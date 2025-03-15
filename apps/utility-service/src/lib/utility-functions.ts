/**
 * Utility Functions
 * 
 * Core functionality for the utility service
 */
import { UtilityResponse } from '../types';

/**
 * Process echo operation
 * @param data Any data to echo back
 * @returns Response with the data echoed back
 */
export function processEcho(data: any): UtilityResponse {
  return {
    message: 'Echo service',
    data
  };
}

/**
 * Get current timestamp
 * @returns Response with the current timestamp
 */
export function getCurrentTimestamp(): UtilityResponse {
  return {
    timestamp: new Date().toISOString()
  };
}

/**
 * Process utility operation
 * @param operation Operation to perform
 * @param data Optional data for the operation
 * @returns Response from the operation
 */
export function processUtilityOperation(operation: string, data?: any): UtilityResponse {
  switch (operation) {
    case 'echo':
      return processEcho(data);
    case 'timestamp':
      return getCurrentTimestamp();
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
} 