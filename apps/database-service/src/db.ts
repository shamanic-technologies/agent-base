/**
 * Database Connection Module
 * 
 * Handles PostgreSQL connection and operations for the database service.
 */
import { Pool, PoolClient } from 'pg';
import 'dotenv/config';

// Initialize PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
});

// Event handlers for the connection pool
pgPool.on('connect', () => {
  console.log('New client connected to PostgreSQL pool');
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    // Log connection parameters for debugging (excluding password)
    console.log('Connecting to PostgreSQL with:');
    console.log(`- Host: ${process.env.PGHOST}`);
    console.log(`- Port: ${process.env.PGPORT}`);
    console.log(`- Database: ${process.env.PGDATABASE}`);
    console.log(`- User: ${process.env.PGUSER}`);
    
    client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('PostgreSQL connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * List all tables in the database
 * @returns {Promise<string[]>} Array of table names
 */
export async function listTables(): Promise<string[]> {
  let client: PoolClient | null = null;
  try {
    client = await pgPool.connect();
    const result = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' 
      AND schemaname != 'information_schema'
    `);
    return result.rows.map(row => row.tablename);
  } catch (error) {
    console.error('Error listing tables:', error);
    return [];
  } finally {
    if (client) client.release();
  }
}

/**
 * Get a database client from the pool
 * @returns {Promise<PoolClient>} Database client
 */
export async function getClient(): Promise<PoolClient> {
  try {
    return await pgPool.connect();
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
}

/**
 * Remove all tables that are not in the whitelist
 * @param {string[]} whitelistedTables - Array of table names to keep
 * @returns {Promise<string[]>} Array of dropped table names
 */
export async function removeNonWhitelistedTables(whitelistedTables: string[]): Promise<string[]> {
  let client: PoolClient | null = null;
  const droppedTables: string[] = [];
  
  try {
    // Get all current tables
    const allTables = await listTables();
    
    // Find tables that aren't in the whitelist
    const tablesToDrop = allTables.filter(table => !whitelistedTables.includes(table));
    
    if (tablesToDrop.length === 0) {
      console.log('No tables to drop - all tables are whitelisted');
      return [];
    }
    
    // Drop each non-whitelisted table
    client = await pgPool.connect();
    for (const tableName of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        console.log(`Dropped table: ${tableName}`);
        droppedTables.push(tableName);
      } catch (dropError) {
        console.error(`Error dropping table ${tableName}:`, dropError);
      }
    }
    
    return droppedTables;
  } catch (error) {
    console.error('Error removing non-whitelisted tables:', error);
    return droppedTables;
  } finally {
    if (client) client.release();
  }
}

/**
 * Execute removal of non-whitelisted tables
 * @param {string[]} whitelistedTables - Tables to keep, all others will be removed
 * @returns {Promise<string[]>} List of dropped tables
 */
export async function cleanupTables(whitelistedTables: string[] = []): Promise<string[]> {
  console.log(`Removing all tables except whitelist: [${whitelistedTables.join(', ')}]`);
  return removeNonWhitelistedTables(whitelistedTables);
}

export { pgPool }; 