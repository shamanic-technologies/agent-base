"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const pino_1 = require("pino");
/**
 * @name Logger
 * @description A logger implementation using Pino
 */
const Logger = (0, pino_1.pino)({
    browser: {
        asObject: true,
    },
    level: 'debug',
    base: {
        env: process.env.NODE_ENV,
    },
    errorKey: 'error',
});
exports.Logger = Logger;
