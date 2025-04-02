/**
 * Database Cleanup Script
 * 
 * This script removes all tables except those in the whitelist.
 */
import { cleanupTables } from './db.js';

// Tables to keep in whitelist - all others will be removed
// Add table names to this array to keep them
const WHITELIST_TABLES: string[] = [
  // Only keep essential tables - all others will be removed
  "settings"
];

async function main() {
  console.log("Starting database cleanup...");
  console.log(`Tables in whitelist (these will be kept): [${WHITELIST_TABLES.join(', ')}]`);
  
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
}

// Execute the cleanup
main(); 