/**
 * Shared logger utility for consistent logging across microservices
 */
import pino from 'pino';

// Default logger configuration
const defaultConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
};

/**
 * Creates a logger instance with default configuration
 * @param name The name of the service/module using the logger
 * @param config Custom logger configuration (optional)
 * @returns A configured pino logger instance
 */
export function createLogger(name: string, config = {}) {
  return pino({
    ...defaultConfig,
    ...config,
    name
  });
}

/**
 * Pre-configured logger for common use cases
 */
export const logger = createLogger('hello-world');

/**
 * Async function to get a logger instance
 * This is the preferred method for getting a logger in server actions and services
 * @param name The name of the service/module using the logger (optional)
 * @param config Custom logger configuration (optional)
 * @returns A promise that resolves to a configured pino logger instance
 */
export async function getLogger(name = 'hello-world', config = {}) {
  return createLogger(name, config);
} 