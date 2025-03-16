/**
 * Database Connection Module
 * 
 * Handles PostgreSQL connection and shared database operations
 */
import { Pool, QueryResult } from 'pg';

// Initialize PostgreSQL client
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If DATABASE_URL is not set, the Pool will use the PG* env variables
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await pgPool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
    return false;
  }
};

/**
 * List all database tables
 */
export const listTables = async (): Promise<string[]> => {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `;
  
  const result = await pgPool.query(query);
  return result.rows.map(row => row.table_name);
}; 