"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Payment Service
 *
 * A simple service for handling payments and credits based on Stripe.
 * Manages customer credit balances via Stripe Customer Balance API.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
// Initialize Express app
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Register routes
app.use(routes_1.default);
// Start the server
app.listen(config_1.PORT, () => {
    console.log(`Payment service running on port ${config_1.PORT}`);
    console.log(`Health check: http://localhost:${config_1.PORT}/health`);
});
