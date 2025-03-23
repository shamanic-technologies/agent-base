"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Auth Service with Passport.js Integration
 *
 * A modern authentication service that leverages Passport.js
 * for user authentication and management.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("./utils/passport"));
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
// Explicitly cast middleware to avoid TypeScript errors
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// Session configuration - explicitly cast to RequestHandler
app.use((0, express_session_1.default)({
    secret: env_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env_1.config.isProduction,
        httpOnly: true,
        maxAge: env_1.config.session.maxAge
    }
}));
// Initialize Passport - explicitly cast to RequestHandler
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Register all routes
app.use('/', routes_1.default);
// Start the server
app.listen(PORT, () => {
    console.log(`🔐 Auth Service running on port ${PORT} (using Passport.js)`);
});
