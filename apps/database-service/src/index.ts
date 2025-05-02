// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Load .env.local explicitly
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
    // Optionally exit or throw error if .env.local is required for development
  }
} else {
  // In production, expect environment variables to be set externally (e.g., Railway)
  console.log('Production environment detected, using external configuration.');
}

/**
 * HelloWorld Database Service
 * 
 * A PostgreSQL-based database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 * Uses Railway PostgreSQL for data storage.
 */
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js'; 
// Import initDbPool and testConnection from db.js
import { initDbPool, testConnection } from './db.js';
// Import the schema initializer
import { initializeAllSchemas } from './utils/schema-initializer.js';

// Function to start the server
async function startServer() {
  console.log('Starting server process...');

  // Check required environment variables
  // Ensure DATABASE_SERVICE_URL is defined before calling
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('FATAL: DATABASE_URL is not defined in the environment. Cannot start server.');
    process.exit(1); // Exit if the database URL is not configured
  }

  // Initialize the database pool with the correct connection string
  console.log('🔑 Initializing Database Pool...');
  initDbPool(databaseUrl);

  // Test database connection AFTER initializing the pool
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database after initialization, exiting...');
    process.exit(1);
  }

  // Initialize all database schemas
  try {
    await initializeAllSchemas();
    console.log('All database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schemas:', error);
    process.exit(1);
  }

  // Initialize Express app
  const app = express();
  const PORT = process.env.PORT || 3006;

  // Middleware
  app.use(cors());
  // Increase the limit (e.g., to 50mb, adjust as needed)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Simple request logger
  app.use((req, res, next) => {
    console.log(`[DB Service] ${req.method} ${req.path}`);
    next();
  });

  // Configure routes
  app.use(routes); 

  // Start server
  app.listen(PORT, () => {
    console.log(`💾 Database Service running on port ${PORT}. DB Pool initialized.`); 
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 