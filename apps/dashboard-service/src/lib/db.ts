/**
 * Database Connection Module
 *
 * This module handles the PostgreSQL connection pool for the dashboard service.
 * It is designed to be initialized at application startup.
 */
import pg from 'pg';
const { Pool } = pg;

export let pgPool: pg.Pool | null = null;

/**
 * Initializes the PostgreSQL connection pool.
 * This should be called once when the application starts.
 *
 * @param {string} connectionString - The PostgreSQL connection string from environment variables.
 */
export function initDbPool(connectionString: string): void {
  if (pgPool) {
    console.warn('Database pool for dashboard-service already initialized.');
    return;
  }

  if (!connectionString) {
    console.error('FATAL: DASHBOARD_DATABASE_URL is missing. Cannot initialize database pool.');
    process.exit(1);
  }

  console.log('Initializing dashboard-service database pool...');

  pgPool = new Pool({
    connectionString: connectionString,
    // This logic is critical for handling SSL correctly in different environments
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } // For production (e.g., Supabase), require SSL but don't fail on self-signed certs
      : false, // For local development, disable SSL entirely
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('connect', () => {
    console.log('New client connected to dashboard-service PostgreSQL pool');
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle dashboard-service PostgreSQL client', err);
  });

  console.log('Dashboard-service database pool initialized successfully.');
}

/**
 * A helper function to ensure the pool has been initialized before use.
 * @returns {pg.Pool} The initialized pool.
 * @throws {Error} If the pool has not been initialized.
 */
export function getDbPool(): pg.Pool {
  if (!pgPool) {
    throw new Error('Database pool not initialized. Call initDbPool() first.');
  }
  return pgPool;
} 