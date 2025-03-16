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
import routes from './routes';
import { testConnection } from './db';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3006;

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