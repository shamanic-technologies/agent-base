/**
 * Database Connection Module
 * 
 * Handles PostgreSQL connection and operations for the database service.
 */
import pg from 'pg';
const { Pool } = pg;
import { PoolClient } from 'pg';

// Declare pgPool but do not initialize it here.
// It will be initialized by initDbPool() called from index.ts
export let pgPool: pg.Pool | null = null;

/**
 * Initializes the PostgreSQL connection pool.
 * This function should be called once at application startup after environment variables are loaded.
 * @param {string} connectionString - The PostgreSQL connection string.
 */
export function initDbPool(connectionString: string): void {
  if (pgPool) {
    console.warn('Database pool already initialized.');
    return;
  }

  if (!connectionString) {
    console.error('FATAL: Connection string is missing. Cannot initialize database pool.');
    // Exit the process because this is a critical failure
    process.exit(1);
  }

  console.log('Initializing database pool...');
  pgPool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Event handlers for the connection pool
  pgPool.on('connect', () => {
    console.log('New client connected to PostgreSQL pool');
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Consider attempting to reconnect or handle error appropriately
  });

  console.log('Database pool initialized successfully.');
}

// Helper function to ensure pool is initialized before use
function ensurePoolInitialized(): pg.Pool {
  if (!pgPool) {
    // This should ideally not happen if initDbPool is called correctly at startup
    console.error('FATAL: Database pool accessed before initialization.');
    throw new Error('Database pool not initialized. Call initDbPool first.');
  }
  return pgPool;
}

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    const pool = ensurePoolInitialized(); // Get initialized pool
    console.log('Attempting to connect to PostgreSQL...'); // Message simplified
    client = await pool.connect();
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
    const pool = ensurePoolInitialized(); // Get initialized pool
    client = await pool.connect();
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
    const pool = ensurePoolInitialized(); // Get initialized pool
    return await pool.connect();
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
}

// /**
//  * Create a new collection (table) if it doesn't exist
//  * @param {string} collectionName - Name of the collection to create
//  * @returns {Promise<void>}
//  */
// export async function createCollection(collectionName: string): Promise<void> {
//   let client: PoolClient | null = null;
//   try {
//     const pool = ensurePoolInitialized(); // Get initialized pool
//     client = await pool.connect();
    
//     const query = `
//       CREATE TABLE IF NOT EXISTS "${collectionName}" (
//         id UUID PRIMARY KEY,
//         data JSONB DEFAULT '{}'::jsonb,
//         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
//       )
//     `;
    
//     await client.query(query);
//     console.log(`Collection "${collectionName}" created or already exists`);
//   } catch (error) {
//     console.error(`Error creating collection "${collectionName}":`, error);
//     throw error;
//   } finally {
//     if (client) client.release();
//   }
// }

/**
 * Remove all tables that are not in the whitelist
 * @param {string[]} whitelistedTables - Array of table names to keep
 * @returns {Promise<string[]>} Array of dropped table names
 */
export async function removeNonWhitelistedTables(whitelistedTables: string[]): Promise<string[]> {
  let client: PoolClient | null = null;
  const droppedTables: string[] = [];
  
  try {
    const pool = ensurePoolInitialized(); // Ensure pool is ready
    const allTables = await listTables(); 
    const tablesToDrop = allTables.filter(table => !whitelistedTables.includes(table));
    
    if (tablesToDrop.length === 0) {
      console.log('No tables to drop - all tables are whitelisted');
      return [];
    }
    
    client = await pool.connect(); 
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

// No longer need to export pgPool directly if initDbPool is the entry point
// export { pgPool }; // Keep it exported so routes can still import it after init 