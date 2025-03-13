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
