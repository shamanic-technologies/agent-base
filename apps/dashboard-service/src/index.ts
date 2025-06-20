/**
 * Dashboard Service
 *
 * A simple service to handle dashboard-related queries.
 */
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
// import { authMiddleware } from './middleware/authMiddleware.js'; // Auth temporarily disabled due to TS issues

const app = express();
const PORT = process.env.PORT || 3090; // Fallback port

// --- Middleware ---
app.use(cors()); // Basic CORS for now
app.use(express.json()); // Body parser

// --- Routes ---
// app.use(authMiddleware); // Auth temporarily disabled
// Mount the main router
app.use('/', routes);

// --- Server ---
app.listen(PORT, () => {
  console.log(`🚀 Dashboard Service running on port ${PORT}`);
});