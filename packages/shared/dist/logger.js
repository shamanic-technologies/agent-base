"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
exports.getLogger = getLogger;
/**
 * Shared logger utility for consistent logging across microservices
 */
const pino_1 = __importDefault(require("pino"));
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
function createLogger(name, config = {}) {
    return (0, pino_1.default)({
        ...defaultConfig,
        ...config,
        name
    });
}
/**
 * Pre-configured logger for common use cases
 */
exports.logger = createLogger('hello-world');
/**
 * Async function to get a logger instance
 * This is the preferred method for getting a logger in server actions and services
 * @param name The name of the service/module using the logger (optional)
 * @param config Custom logger configuration (optional)
 * @returns A promise that resolves to a configured pino logger instance
 */
async function getLogger(name = 'hello-world', config = {}) {
    return createLogger(name, config);
}
