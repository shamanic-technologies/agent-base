/**
 * HelloWorld Database Service
 * 
 * A PostgreSQL-based database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 * Uses Railway PostgreSQL for data storage.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes/index.js';
import { testConnection } from './db.js';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only load from .env file in development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using Railway configuration.');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use(routes);

// Start the server
const startServer = async () => {
  // Test database connection before starting
  const isConnected = await testConnection();
  
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