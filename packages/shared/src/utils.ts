/**
 * Check if the code is running in a browser environment.
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * @name formatCurrency
 * @description Format the currency based on the currency code
 */
export function formatCurrency(params: {
  currencyCode: string;
  locale: string;
  value: string | number;
}) {
  return new Intl.NumberFormat(params.locale, {
    style: 'currency',
    currency: params.currencyCode,
  }).format(Number(params.value));
}

/**
 * Common utility functions shared across microservices
 */

/**
 * Formats an error object for consistent error handling
 */
export function formatError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  
  return {
    message: String(error),
    name: 'UnknownError'
  };
}

/**
 * Creates a standardized response object
 */
export function createResponse<T>(
  success: boolean,
  data?: T,
  error?: unknown
): { success: boolean; data?: T; error?: Record<string, any> } {
  const response: { success: boolean; data?: T; error?: Record<string, any> } = {
    success
  };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (error) {
    response.error = formatError(error);
  }
  
  return response;
}

/**
 * Sleep utility for implementing delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
