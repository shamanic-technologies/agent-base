/**
 * Utilities Registry Index
 * 
 * Export the registry and all utility files for easier imports
 */

// Export the registry
export * from './registry.js';

// Database utilities
import getDatabase from '../api-utilities/database/get-database.js';
import createTable from '../api-utilities/database/create-table.js';
import getTable from '../api-utilities/database/get-table.js';
import queryTable from '../api-utilities/database/query-table.js';
import alterTable from '../api-utilities/database/alter-table.js';
import deleteTable from '../api-utilities/database/delete-table.js';

// Google utilities
import googleSearch from '../api-utilities/google/search.js';
import googleMaps from '../api-utilities/google/maps.js';
import googleFlights from '../api-utilities/google/flights.js';

// Web utilities
import readWebPage from '../api-utilities/web/read-webpage.js';

// Time utilities
import getCurrentDatetime from '../basic-utilities/get-current-datetime.js';

// Export all utilities
export {
  // Database utilities
  getDatabase,
  createTable,
  getTable,
  queryTable,
  alterTable,
  deleteTable,
  
  // Google utilities
  googleSearch,
  googleMaps,
  googleFlights,
  
  // Web utilities
  readWebPage as firecrawlExtractContent,
  
  // Time utilities
  getCurrentDatetime
}; 