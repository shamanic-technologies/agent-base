// test-import.js
// Simple script to test if we can import the Google Cloud SQL client

console.log('Attempting to import GoogleCloudSqlClient...');

try {
  // Try different import paths
  console.log('Trying import #1');
  const client1 = require('./apps/utility-service/src/lib/utilities/google-cloud-sql-client');
  console.log('Import #1 successful. Client:', client1);
} catch (err) {
  console.error('Import #1 failed:', err.message);
}

try {
  console.log('Trying import #2');
  const client2 = require('./apps/utility-service/src/lib/utilities/google-cloud-sql-client.js');
  console.log('Import #2 successful. Client:', client2);
} catch (err) {
  console.error('Import #2 failed:', err.message);
}

try {
  console.log('Trying import #3');
  const client3 = require('./apps/utility-service/src/lib/utilities/google-cloud-sql-client.ts');
  console.log('Import #3 successful. Client:', client3);
} catch (err) {
  console.error('Import #3 failed:', err.message);
}

console.log('Import test complete.'); 