"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Database Service
 *
 * A PostgreSQL-based database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 * Uses Railway PostgreSQL for data storage.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const db_1 = require("./db");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3006;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Register routes
app.use(routes_1.default);
// Start the server
const startServer = async () => {
    // Test database connection before starting
    const isConnected = await (0, db_1.testConnection)();
    if (!isConnected) {
        console.error('Failed to connect to database, exiting...');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`💾 Database Service running on port ${PORT} with Railway PostgreSQL storage`);
    });
};
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
