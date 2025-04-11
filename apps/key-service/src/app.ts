/**
 * Express application setup
 */
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import routes from './routes/index.js';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add startup debug logging
console.log('====== KEY SERVICE APP SETUP ======');
console.log('Initializing middleware and routes...');

// Mount route handlers
app.use(healthRoutes);
app.use(routes); // Mount all routes from the routes index

console.log('Routes mounted: /health, /keys');
console.log('==================================');

export default app; 