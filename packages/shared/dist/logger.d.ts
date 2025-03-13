/**
 * Creates a logger instance with default configuration
 * @param name The name of the service/module using the logger
 * @param config Custom logger configuration (optional)
 * @returns A configured pino logger instance
 */
export declare function createLogger(name: string, config?: {}): import("pino").Logger<never, boolean>;
/**
 * Pre-configured logger for common use cases
 */
export declare const logger: import("pino").Logger<never, boolean>;
/**
 * Async function to get a logger instance
 * This is the preferred method for getting a logger in server actions and services
 * @param name The name of the service/module using the logger (optional)
 * @param config Custom logger configuration (optional)
 * @returns A promise that resolves to a configured pino logger instance
 */
export declare function getLogger(name?: string, config?: {}): Promise<import("pino").Logger<never, boolean>>;
