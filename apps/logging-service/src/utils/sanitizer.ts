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
  
  // List of sensitive fields to redact, excluding token fields
  const sensitiveFields = [
    'password', 'secret', 'api_key', 'apiKey', 
    'credit_card', 'creditCard', 'ssn', 'social_security', 'socialSecurity'
  ];
  
  // Function to recursively sanitize an object
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field (but keep token fields visible)
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } 
      // Recursively sanitize nested objects
      else if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
} 