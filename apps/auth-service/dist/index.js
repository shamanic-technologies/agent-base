"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Auth Service with Supabase Auth Integration
 *
 * A modern authentication service that leverages Supabase Auth
 * for user authentication and management.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = __importDefault(require("./routes"));
const env_1 = require("./config/env");
// Initialize Express app
const app = (0, express_1.default)();
const PORT = env_1.config.port;
// Log configuration
(0, env_1.logConfig)();
// Middleware
app.use((0, cors_1.default)({
    origin: env_1.config.clientAppUrl,
    credentials: true, // Allow cookies to be sent with requests
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// Register all routes
app.use('/', routes_1.default);
// Start the server
app.listen(PORT, () => {
    console.log(`🔐 Auth Service running on port ${PORT} (using Supabase Auth)`);
});
