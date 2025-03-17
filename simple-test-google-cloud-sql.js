// simple-test-google-cloud-sql.js
// Simplified test for Google Cloud SQL Client

// Import the client
const { googleCloudSqlClient } = require('./apps/utility-service/src/lib/utilities/google-cloud-sql-client');

// Configure environment variables for testing
process.env.GOOGLE_CLOUD_PROJECT = 'your-project-id';
process.env.GOOGLE_CLOUD_REGION = 'us-central1';
process.env.GOOGLE_CLOUD_ACCESS_TOKEN = 'your-access-token';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'your-db-password';

// Test function
async function runTest() {
  try {
    console.log('Testing Google Cloud SQL Client...');
    
    // Create a test user ID
    const userId = 'test-user-' + Date.now();
    console.log('Test user ID:', userId);
    
    // Test 1: Create user environment
    console.log('\nTest 1: Creating user environment');
    try {
      const environment = await googleCloudSqlClient.getOrCreateUserEnvironment(
        userId, 
        'Test User'
      );
      console.log('Environment created:', environment);
    } catch (err) {
      console.error('Error creating environment:', err.message);
    }
    
    // Test 2: Create a table
    console.log('\nTest 2: Creating a table');
    try {
      const tableName = 'test_table';
      const tableDefinition = `(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      const success = await googleCloudSqlClient.createTable(
        userId, 
        tableName, 
        tableDefinition
      );
      console.log('Table created:', success);
    } catch (err) {
      console.error('Error creating table:', err.message);
    }
    
    // Test 3: Insert data
    console.log('\nTest 3: Inserting data');
    try {
      const insertQuery = 'INSERT INTO test_table (name) VALUES ($1) RETURNING *';
      const result = await googleCloudSqlClient.executeQuery(
        userId, 
        insertQuery, 
        ['Test Entry']
      );
      console.log('Data inserted:', result);
    } catch (err) {
      console.error('Error inserting data:', err.message);
    }
    
    // Test 4: Query data
    console.log('\nTest 4: Querying data');
    try {
      const selectQuery = 'SELECT * FROM test_table';
      const results = await googleCloudSqlClient.executeQuery(userId, selectQuery);
      console.log('Query results:', results);
    } catch (err) {
      console.error('Error querying data:', err.message);
    }
    
    // Test 5: Get database info
    console.log('\nTest 5: Getting database info');
    try {
      const dbInfo = await googleCloudSqlClient.getDatabaseInfo(userId);
      console.log('Database info:', dbInfo);
    } catch (err) {
      console.error('Error getting database info:', err.message);
    }
    
    console.log('\nTests completed!');
  } catch (err) {
    console.error('Global error:', err);
  }
}

// Run the test
runTest().catch(err => {
  console.error('Unhandled error:', err);
}); 