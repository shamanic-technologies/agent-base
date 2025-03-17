// test-google-cloud-sql.js
// Test script for Google Cloud SQL Client

// Import the client
// Note: For testing purposes, we're using require since this is a JavaScript file
// In TypeScript files, use the import statement
const { googleCloudSqlClient } = require('./apps/utility-service/src/lib/utilities/google-cloud-sql-client');

// Configure environment variables for testing
process.env.GOOGLE_CLOUD_PROJECT = 'your-project-id';
process.env.GOOGLE_CLOUD_REGION = 'us-central1';
process.env.GOOGLE_CLOUD_ACCESS_TOKEN = 'your-access-token'; // OAuth2 token with proper permissions
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'your-db-password';

// Main test function
async function main() {
  console.log('Testing Google Cloud SQL Client...');
  
  try {
    // Generate test user IDs
    const userId1 = 'test-user-' + Date.now();
    const userId2 = 'test-user-' + (Date.now() + 100); // Add number instead of Date.now() + 1
    const projectId = 'test-project-' + Date.now();
    
    console.log('Test user IDs:', userId1, userId2);
    console.log('Test project ID:', projectId);
    
    // Test 1: Create a user environment (instance + database)
    console.log('\nTest 1: Creating user environment');
    try {
      const environment = await googleCloudSqlClient.getOrCreateUserEnvironment(userId1, 'Test User 1');
      console.log('Created environment:', environment);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 1:', typedError.message);
    }
    
    // Test 2: Create a table for the user
    console.log('\nTest 2: Creating a table');
    try {
      const tableName = 'test_table';
      const tableDefinition = `(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      const success = await googleCloudSqlClient.createTable(userId1, tableName, tableDefinition);
      console.log('Table created:', success);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 2:', typedError.message);
    }
    
    // Test 3: Execute a query to insert data
    console.log('\nTest 3: Inserting data');
    try {
      const insertQuery = 'INSERT INTO test_table (name) VALUES ($1) RETURNING *';
      const result = await googleCloudSqlClient.executeQuery(userId1, insertQuery, ['Test Entry 1']);
      console.log('Inserted data:', result);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 3:', typedError.message);
    }
    
    // Test 4: Query the data
    console.log('\nTest 4: Querying data');
    try {
      const selectQuery = 'SELECT * FROM test_table';
      const results = await googleCloudSqlClient.executeQuery(userId1, selectQuery);
      console.log('Query results:', results);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 4:', typedError.message);
    }
    
    // Test 5: Get database schema information
    console.log('\nTest 5: Getting database info');
    try {
      const dbInfo = await googleCloudSqlClient.getDatabaseInfo(userId1);
      console.log('Database info:', dbInfo);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 5:', typedError.message);
    }
    
    // Test 6: Create a second user and test multi-user isolation
    console.log('\nTest 6: Testing multi-user isolation');
    try {
      // Create second user environment
      const environment2 = await googleCloudSqlClient.getOrCreateUserEnvironment(userId2, 'Test User 2');
      console.log('Created second environment:', environment2);
      
      // Create the same table for second user
      const tableName = 'test_table';
      const tableDefinition = `(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      await googleCloudSqlClient.createTable(userId2, tableName, tableDefinition);
      
      // Insert different data for second user
      const insertQuery = 'INSERT INTO test_table (name) VALUES ($1) RETURNING *';
      await googleCloudSqlClient.executeQuery(userId2, insertQuery, ['Test Entry 2']);
      
      // Query data for both users to confirm isolation
      console.log('Data for User 1:');
      const user1Data = await googleCloudSqlClient.executeQuery(userId1, 'SELECT * FROM test_table');
      console.log(user1Data);
      
      console.log('Data for User 2:');
      const user2Data = await googleCloudSqlClient.executeQuery(userId2, 'SELECT * FROM test_table');
      console.log(user2Data);
      
      // Verify data isolation
      const isIsolated = user1Data[0].name !== user2Data[0].name;
      console.log('Data isolation confirmed:', isIsolated);
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 6:', typedError.message);
    }
    
    // Test 7: Test utility service integration
    console.log('\nTest 7: Testing utility service integration');
    try {
      // This test simulates how the utility service will use the client
      // First, create an environment for the project
      await googleCloudSqlClient.getOrCreateUserEnvironment(projectId, 'Test Project');
      
      // Create a table for the project
      const tableName = 'project_data';
      const tableDefinition = `(
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      await googleCloudSqlClient.createTable(projectId, tableName, tableDefinition);
      
      // Insert some project data
      const insertQuery = 'INSERT INTO project_data (key, value) VALUES ($1, $2) RETURNING *';
      await googleCloudSqlClient.executeQuery(projectId, insertQuery, ['setting1', 'value1']);
      await googleCloudSqlClient.executeQuery(projectId, insertQuery, ['setting2', 'value2']);
      
      // Query project data
      const projectData = await googleCloudSqlClient.executeQuery(
        projectId, 
        'SELECT * FROM project_data ORDER BY key'
      );
      
      console.log('Project data:', projectData);
      
      // Get database schema info
      const dbInfo = await googleCloudSqlClient.getDatabaseInfo(projectId);
      console.log('Project database schema:', dbInfo.map(t => t.table_name));
    } catch (error) {
      // Type the error to handle TypeScript linter errors
      const typedError = /** @type {Error} */ (error);
      console.error('Error in Test 7:', typedError.message);
    }
    
    // Cleanup: Usually you would delete the database/instance when done testing
    // But since these are expensive operations, we'll comment these out
    // You can uncomment them if needed for cleanup
    
    /* 
    // Cleanup section
    console.log('\nCleanup: Deleting databases and instances');
    try {
      // Delete user 1 resources
      const deleted1 = await googleCloudSqlClient.deleteDatabase(userId1);
      console.log('User 1 database deleted:', deleted1);
      const deleted2 = await googleCloudSqlClient.deleteInstance(userId1);
      console.log('User 1 instance deleted:', deleted2);
      
      // Delete user 2 resources
      const deleted3 = await googleCloudSqlClient.deleteDatabase(userId2);
      console.log('User 2 database deleted:', deleted3);
      const deleted4 = await googleCloudSqlClient.deleteInstance(userId2);
      console.log('User 2 instance deleted:', deleted4);
      
      // Delete project resources
      const deleted5 = await googleCloudSqlClient.deleteDatabase(projectId);
      console.log('Project database deleted:', deleted5);
      const deleted6 = await googleCloudSqlClient.deleteInstance(projectId);
      console.log('Project instance deleted:', deleted6);
    } catch (error) {
      const typedError = /** @type {Error} */ (error);
      console.error('Error during cleanup:', typedError.message);
    }
    */
    
    console.log('\nTests completed!');
  } catch (error) {
    // Type the error to handle TypeScript linter errors
    const typedError = /** @type {Error} */ (error);
    console.error('Global error:', typedError);
  }
}

// Run tests
main().catch(error => {
  // Type the error to handle TypeScript linter errors
  const typedError = /** @type {Error} */ (error);
  console.error('Unhandled error:', typedError);
}); 