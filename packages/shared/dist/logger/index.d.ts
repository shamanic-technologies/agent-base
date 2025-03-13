import { Logger as LoggerInstance } from './logger';
/**
 * @name getLogger
 * @description Retrieves the logger implementation based on the LOGGER environment variable using the registry API.
 */
export declare function getLogger(): Promise<LoggerInstance>;
