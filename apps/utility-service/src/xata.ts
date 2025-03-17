/**
 * Simple Xata Client
 * 
 * A minimal implementation of a Xata client for testing
 */

import { BaseClient } from '@xata.io/client';

/**
 * Get a configured Xata client
 * @returns A configured Xata client for the Helloworld database
 */
export function getXataClient() {
  // Create a simple client
  return new BaseClient({
    databaseURL: process.env.XATA_DATABASE_URL || 'https://helloworld-database-url.us-east-1.xata.sh/db/helloworld',
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH || 'main'
  });
} 