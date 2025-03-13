"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowser = isBrowser;
exports.formatCurrency = formatCurrency;
exports.formatError = formatError;
exports.createResponse = createResponse;
exports.sleep = sleep;
/**
 * Check if the code is running in a browser environment.
 */
function isBrowser() {
    return typeof window !== 'undefined';
}
/**
 * @name formatCurrency
 * @description Format the currency based on the currency code
 */
function formatCurrency(params) {
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
function formatError(error) {
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
function createResponse(success, data, error) {
    const response = {
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
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
