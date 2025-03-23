/**
 * Data Sanitization Utilities
 * 
 * Functions for sanitizing sensitive data before storage.
 */
import pino from 'pino';

// Get the logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

/**
 * Sanitize log data to prevent storing sensitive information
 * Keeps token information visible for debugging while masking other sensitive data
 * @param data The data to sanitize
 * @returns Sanitized data object
 */
export function sanitizeLogData(data: any): any {
  if (!data) return null;
  
  // If it's not an object, return as is
  if (typeof data !== 'object') return data;
  
  // Clone the data to avoid modifying the original
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  // List of sensitive fields to redact (keep this minimal but comprehensive)
  const sensitiveFields = [
    'password', 'passwd', 'secret', 'api_key', 'apiKey', 'key',
    'credit_card', 'creditCard', 'card', 'cvv', 'cvc', 'expiry',
    'ssn', 'social_security', 'socialSecurity',
    'auth', 'token', 'jwt', 'bearer',
    'private', 'access_token', 'accessToken', 'refresh_token',
    'email', 'phone', 'address'
  ];
  
  // Exceptions - fields that match sensitive patterns but should NOT be redacted
  const exceptions = [
    'input_tokens', 'output_tokens', 'total_tokens',
    'token_usage', 'usage_tokens'
  ];
  
  // Function to recursively sanitize an object with depth limit for efficiency
  const sanitizeObject = (obj: any, depth = 0) => {
    // Limit recursion depth for efficiency - most sensitive data isn't nested deeply
    if (!obj || typeof obj !== 'object' || depth > 5) return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // First check exceptions - fields we want to preserve
      const isException = exceptions.some(field => lowerKey.includes(field));
      
      // Then check for sensitive fields
      if (!isException && sensitiveFields.some(field => lowerKey.includes(field))) {
        // Preserve token counts which are needed for pricing
        if ((lowerKey.includes('token') && typeof obj[key] === 'number') || 
            lowerKey === 'price') {
          // Keep these fields as-is for pricing calculations
        } else {
          obj[key] = '[REDACTED]';
        }
      } 
      // Recursively sanitize nested objects
      else if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key], depth + 1);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
} 