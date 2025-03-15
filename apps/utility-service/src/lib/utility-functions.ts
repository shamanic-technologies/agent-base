/**
 * Utility Functions
 * 
 * Core functionality for the utility service
 */
import { DateTimeRequest, UtilityOperation, UtilityResponse } from '../types';
import { UtilityGetCurrentDateTime } from './utilities/utility_get_current_datetime';

/**
 * Get current date and time in different formats
 * @param data Request with optional format
 * @returns Promise with the formatted date and time response
 */
export async function getCurrentDateTime(data?: DateTimeRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const dateTimeUtility = new UtilityGetCurrentDateTime({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with the provided format
    const result = await dateTimeUtility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("DateTime utility error:", error);
    return {
      error: "Failed to get current date and time",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process utility operation
 * @param operation Operation to perform
 * @param data Optional data for the operation
 * @returns Promise with the response from the operation
 */
export async function processUtilityOperation(
  operation: UtilityOperation, 
  data?: any
): Promise<UtilityResponse> {
  switch (operation) {
    case 'utility_get_current_datetime':
      return getCurrentDateTime(data);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
} 