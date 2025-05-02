/**
 * Database Cleanup Script
 * 
 * This script removes all tables except those in the whitelist.
 * It will delete the conversations table and any other non-whitelisted tables.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { cleanupTables, initDbPool } from './db.js';

// Load environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load .env.local explicitly for development
if (NODE_ENV === 'development') {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(`Environment file ${envFile} not found, using default environment variables.`);
  }
} else {
  console.log('Production environment detected, using external configuration.');
}

// Tables to keep in whitelist - all others will be removed
// Add table names to this array to keep them
const WHITELIST_TABLES: string[] = [
  // Only keep essential tables - all others will be removed
  "settings"
  // Note: "conversations" is intentionally not in this list so it will be deleted
];

async function main() {
  console.log("Starting database cleanup...");
  
  // Get database URL from environment
  // Use DATABASE_SERVICE_URL instead of DATABASE_URL
  const databaseUrl = process.env.DATABASE_SERVICE_URL;

  // Check if DATABASE_SERVICE_URL is defined
  if (!databaseUrl) {
    console.error('FATAL: DATABASE_SERVICE_URL is not defined in the environment.');
    process.exit(1);
  }
  
  console.log("Initializing database connection...");
  initDbPool(databaseUrl);
  
  console.log(`Tables in whitelist (these will be kept): [${WHITELIST_TABLES.join(', ')}]`);
  console.log("All other tables including 'conversations' will be DELETED");
  
  try {
    const droppedTables = await cleanupTables(WHITELIST_TABLES);
    
    if (droppedTables.length === 0) {
      console.log("No tables were dropped.");
    } else {
      console.log(`Successfully dropped ${droppedTables.length} tables:`);
      console.log(droppedTables);
    }
  } catch (error) {
    console.error("Error executing table cleanup:", error);
    process.exit(1);
  }
  
  console.log("Database cleanup completed successfully.");
  process.exit(0);
}

// Execute the cleanup
main(); 