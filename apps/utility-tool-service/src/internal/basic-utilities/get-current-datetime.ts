/**
 * Current DateTime Utility
 * 
 * Returns the current date and time in various formats
 */
import { format } from 'date-fns';
import {
  InternalUtilityTool,
  ErrorResponse,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { registry } from '../../registry/registry.js';

// --- Local Type Definitions ---
export interface DateTimeRequest {
  format?: string;
}
// --- End Local Definitions ---

/**
 * Implementation of the Current DateTime utility
 */
const getCurrentDateTimeUtility: InternalUtilityTool = {
  id: 'utility_get_current_datetime',
  description: 'Get current date and time in various formats',
  schema: {
    type: 'object',
    properties: {
      format: { 
        type: 'string',
        description: 'Optional date format. Can be ISO, UTC, Locale, Date, Time, Unix/Timestamp, or a custom format string like YYYY-MM-DD HH:mm:ss',
        default: 'ISO',
        examples: ['ISO', 'UTC', 'YYYY-MM-DD', 'HH:mm']
      }
    }
  },
  
  execute: async (clientUserId: string, clientOrganizationId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: DateTimeRequest): Promise<ServiceResponse<ExecuteToolResult>> => {
    try {
      const { format = 'ISO' } = params || {};
            
      const now = new Date();
      
      let formattedDate;
      let formatType = 'ISO';
      
      if (format.toUpperCase() === 'ISO') {
        formattedDate = now.toISOString();
        formatType = 'ISO';
      } else if (format.toUpperCase() === 'UTC') {
        formattedDate = now.toUTCString();
        formatType = 'UTC';
      } else if (format.toUpperCase() === 'LOCALE') {
        formattedDate = now.toLocaleString();
        formatType = 'Locale';
      } else if (format.toUpperCase() === 'DATE') {
        formattedDate = now.toDateString();
        formatType = 'Date';
      } else if (format.toUpperCase() === 'TIME') {
        formattedDate = now.toTimeString();
        formatType = 'Time';
      } else if (format.toUpperCase() === 'UNIX' || format.toUpperCase() === 'TIMESTAMP') {
        formattedDate = Math.floor(now.getTime() / 1000).toString();
        formatType = 'Unix Timestamp';
      } else {
        try {
          formattedDate = formatDate(now, format);
          formatType = 'Custom';
        } catch (error) {
          console.error("Error with custom date format:", error);
          formattedDate = now.toISOString(); 
          formatType = 'ISO (fallback)';
        }
      }
      
      const resultData = {
        timestamp: now.getTime(),
        formatted: formattedDate,
        format_type: formatType,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        timezone_offset_minutes: now.getTimezoneOffset()
      };
      
      return {
        success: true,
        data: resultData
      };

    } catch (error: any) {
      console.error("❌ [DATETIME] Error:", error);
      const errorResponse: ErrorResponse = {
        success: false, 
        error: "Failed to get current date and time",
        details: error instanceof Error ? error.message : String(error),
        hint: 'Contact support if the problem persists.'
      };
      return errorResponse;
    }
  }
};

/**
 * Helper function to format date with a custom format string
 * Supports: YYYY, MM, DD, HH, mm, ss, etc.
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Month is 0-indexed in JS
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  // Replace tokens in the format string
  return format
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, (year % 100).toString().padStart(2, '0'))
    .replace(/MM/g, month.toString().padStart(2, '0'))
    .replace(/DD/g, day.toString().padStart(2, '0'))
    .replace(/HH/g, hours.toString().padStart(2, '0'))
    .replace(/mm/g, minutes.toString().padStart(2, '0'))
    .replace(/ss/g, seconds.toString().padStart(2, '0'));
}

// Register the utility
registry.register(getCurrentDateTimeUtility);

// Export the utility
export default getCurrentDateTimeUtility; 