/**
 * Dashboard Service
 *
 * A simple service to handle dashboard-related queries.
 */
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { initDbPool } from './lib/db.js';

// --- Database Initialization ---
// Ensure the DATABASE_URL is loaded from .env and initialize the pool
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}
initDbPool(databaseUrl);


const app = express();
const PORT = process.env.PORT || 3090; // Fallback port

// --- Middleware ---
app.use(cors()); // Basic CORS for now
app.use(express.json()); // Body parser

// --- Routes ---
app.use(authMiddleware);
// Mount the main router
app.use('/', routes);

// --- Server ---
app.listen(PORT, () => {
  console.log(`🚀 Dashboard Service running on port ${PORT}`);
});