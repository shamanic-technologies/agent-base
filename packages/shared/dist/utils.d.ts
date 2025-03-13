/**
 * Check if the code is running in a browser environment.
 */
export declare function isBrowser(): boolean;
/**
 * @name formatCurrency
 * @description Format the currency based on the currency code
 */
export declare function formatCurrency(params: {
    currencyCode: string;
    locale: string;
    value: string | number;
}): string;
/**
 * Common utility functions shared across microservices
 */
/**
 * Formats an error object for consistent error handling
 */
export declare function formatError(error: unknown): Record<string, any>;
/**
 * Creates a standardized response object
 */
export declare function createResponse<T>(success: boolean, data?: T, error?: unknown): {
    success: boolean;
    data?: T;
    error?: Record<string, any>;
};
/**
 * Sleep utility for implementing delays
 */
export declare function sleep(ms: number): Promise<void>;
