/**
 * Database Service Test Script
 * 
 * Tests the Database Service CRUD operations and collection management.
 */
const http = require('http');

// Configuration
const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 3006; // Database Service runs on port 3006

// Test data
const TEST_COLLECTION = `test_collection_${Date.now()}`;
const TEST_ITEM = {
  name: 'Test Item',
  description: 'This is a test item',
  active: true
};

// Utility function to make HTTP requests
function makeRequest(path, method, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: SERVICE_HOST,
      port: SERVICE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody || ''),
        ...headers
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            error: `Failed to parse response: ${error.message}`
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(requestBody);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🧪 DATABASE SERVICE TEST SUITE 🧪');
  console.log(`Testing service at http://${SERVICE_HOST}:${SERVICE_PORT}\n`);
  
  let testItemId = null;
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await makeRequest('/health', 'GET');
    
    if (healthResponse.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('Available collections:', healthResponse.body.collections);
    } else {
      console.log(`❌ Health check failed with status: ${healthResponse.statusCode}`);
      console.log('Response:', healthResponse.body);
      console.log('\nIs the Database Service running? Make sure to start it with: cd apps/database-service && npm run dev');
      return;
    }
    
    // Test 2: Create a new collection
    console.log(`\n2️⃣ Creating a test collection: ${TEST_COLLECTION}...`);
    const createCollectionResponse = await makeRequest('/db', 'POST', {}, {
      name: TEST_COLLECTION
    });
    
    if (createCollectionResponse.statusCode === 201 && createCollectionResponse.body.success) {
      console.log('✅ Collection created successfully');
    } else {
      console.log(`❌ Collection creation failed with status: ${createCollectionResponse.statusCode}`);
      console.log('Response:', createCollectionResponse.body);
      return;
    }
    
    // Test 3: List all collections
    console.log('\n3️⃣ Listing all collections...');
    const listCollectionsResponse = await makeRequest('/db', 'GET');
    
    if (listCollectionsResponse.statusCode === 200 && listCollectionsResponse.body.success) {
      console.log('✅ Collections listed successfully');
      console.log('Collections:', listCollectionsResponse.body.data);
      
      // Verify our test collection is in the list
      const hasTestCollection = listCollectionsResponse.body.data.some(
        collection => collection.name === TEST_COLLECTION
      );
      
      if (hasTestCollection) {
        console.log(`✅ Found our test collection '${TEST_COLLECTION}'`);
      } else {
        console.log(`❌ Test collection '${TEST_COLLECTION}' not found in the list`);
      }
    } else {
      console.log(`❌ Listing collections failed with status: ${listCollectionsResponse.statusCode}`);
      console.log('Response:', listCollectionsResponse.body);
    }
    
    // Test 4: Create a new item in the collection
    console.log('\n4️⃣ Creating a test item in the collection...');
    const createItemResponse = await makeRequest(`/db/${TEST_COLLECTION}`, 'POST', {}, TEST_ITEM);
    
    if (createItemResponse.statusCode === 201 && createItemResponse.body.success) {
      console.log('✅ Item created successfully');
      console.log('Item:', createItemResponse.body.data);
      testItemId = createItemResponse.body.data.id;
    } else {
      console.log(`❌ Item creation failed with status: ${createItemResponse.statusCode}`);
      console.log('Response:', createItemResponse.body);
      return;
    }
    
    // Test 5: Get items from the collection
    console.log('\n5️⃣ Getting items from the collection...');
    const getItemsResponse = await makeRequest(`/db/${TEST_COLLECTION}`, 'GET');
    
    if (getItemsResponse.statusCode === 200 && getItemsResponse.body.success) {
      console.log('✅ Items retrieved successfully');
      console.log('Items:', getItemsResponse.body.data);
      
      // Verify our test item is in the list
      const hasTestItem = getItemsResponse.body.data.items.some(
        item => item.id === testItemId
      );
      
      if (hasTestItem) {
        console.log(`✅ Found our test item with ID '${testItemId}'`);
      } else {
        console.log(`❌ Test item with ID '${testItemId}' not found in the list`);
      }
    } else {
      console.log(`❌ Getting items failed with status: ${getItemsResponse.statusCode}`);
      console.log('Response:', getItemsResponse.body);
    }
    
    // Test 6: Get a single item
    if (testItemId) {
      console.log('\n6️⃣ Getting a single item by ID...');
      const getItemResponse = await makeRequest(`/db/${TEST_COLLECTION}/${testItemId}`, 'GET');
      
      if (getItemResponse.statusCode === 200 && getItemResponse.body.success) {
        console.log('✅ Item retrieved successfully');
        console.log('Item:', getItemResponse.body.data);
      } else {
        console.log(`❌ Getting item failed with status: ${getItemResponse.statusCode}`);
        console.log('Response:', getItemResponse.body);
      }
      
      // Test 7: Update an item
      console.log('\n7️⃣ Updating an item...');
      const updateItemResponse = await makeRequest(`/db/${TEST_COLLECTION}/${testItemId}`, 'PUT', {}, {
        name: 'Updated Test Item',
        updatedField: 'New Value'
      });
      
      if (updateItemResponse.statusCode === 200 && updateItemResponse.body.success) {
        console.log('✅ Item updated successfully');
        console.log('Updated item:', updateItemResponse.body.data);
      } else {
        console.log(`❌ Updating item failed with status: ${updateItemResponse.statusCode}`);
        console.log('Response:', updateItemResponse.body);
      }
      
      // Test 8: Delete an item
      console.log('\n8️⃣ Deleting an item...');
      const deleteItemResponse = await makeRequest(`/db/${TEST_COLLECTION}/${testItemId}`, 'DELETE');
      
      if (deleteItemResponse.statusCode === 200 && deleteItemResponse.body.success) {
        console.log('✅ Item deleted successfully');
      } else {
        console.log(`❌ Deleting item failed with status: ${deleteItemResponse.statusCode}`);
        console.log('Response:', deleteItemResponse.body);
      }
    }
    
    console.log('\n✅ Test suite completed');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.log('Is the Database Service running at the correct port?');
  }
}

// Run the tests
runTests().catch(console.error);

console.log('\n📋 Running this test:');
console.log('1. Make sure the Database Service is running (cd apps/database-service && npm run dev)');
console.log('2. Execute this test with: node test-database-service.js'); 