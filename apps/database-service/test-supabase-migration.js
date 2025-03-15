/**
 * Supabase Migration Test Script
 * 
 * This script tests the database service after migration to Supabase.
 * It performs basic CRUD operations to verify functionality.
 * 
 * Usage: node test-supabase-migration.js
 */

const axios = require('axios');
const assert = require('assert').strict;

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3006';
const TEST_COLLECTION = 'test_items';

// Test data
const testItem = {
  name: 'Test Item',
  description: 'This is a test item',
  value: 42
};

// Utility function to log test steps
function log(message) {
  console.log(`🧪 ${message}`);
}

// Utility function to handle errors
function handleError(error, message) {
  console.error(`❌ ${message}`);
  if (error.response) {
    console.error('Response:', error.response.data);
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
}

// Main test function
async function runTests() {
  let createdItemId;
  
  try {
    // 1. Check health
    log('Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    assert.equal(healthResponse.status, 200);
    assert.equal(healthResponse.data.status, 'healthy');
    assert.equal(healthResponse.data.provider, 'supabase');
    log('Health check passed ✅');
    
    // 2. List collections/tables
    log('Listing tables...');
    const tablesResponse = await axios.get(`${API_URL}/db`);
    assert.equal(tablesResponse.status, 200);
    assert.ok(Array.isArray(tablesResponse.data.data));
    log(`Found ${tablesResponse.data.data.length} tables ✅`);
    
    // 3. Create item
    log(`Creating test item in ${TEST_COLLECTION}...`);
    const createResponse = await axios.post(`${API_URL}/db/${TEST_COLLECTION}`, testItem);
    assert.equal(createResponse.status, 201);
    assert.ok(createResponse.data.success);
    createdItemId = createResponse.data.data.id;
    log(`Item created with ID: ${createdItemId} ✅`);
    
    // 4. Get item
    log(`Retrieving item ${createdItemId}...`);
    const getResponse = await axios.get(`${API_URL}/db/${TEST_COLLECTION}/${createdItemId}`);
    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.data.data.name, testItem.name);
    assert.equal(getResponse.data.data.description, testItem.description);
    assert.equal(getResponse.data.data.value, testItem.value);
    log('Item retrieved successfully ✅');
    
    // 5. Update item
    log(`Updating item ${createdItemId}...`);
    const updateResponse = await axios.put(`${API_URL}/db/${TEST_COLLECTION}/${createdItemId}`, {
      name: 'Updated Test Item',
      value: 100
    });
    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.data.data.name, 'Updated Test Item');
    assert.equal(updateResponse.data.data.value, 100);
    assert.equal(updateResponse.data.data.description, testItem.description); // Should be unchanged
    log('Item updated successfully ✅');
    
    // 6. List items with query
    log('Testing query functionality...');
    const queryResponse = await axios.get(
      `${API_URL}/db/${TEST_COLLECTION}?query=${encodeURIComponent(JSON.stringify({ name: 'Updated Test Item' }))}`
    );
    assert.equal(queryResponse.status, 200);
    assert.ok(Array.isArray(queryResponse.data.data.items));
    assert.ok(queryResponse.data.data.items.length > 0);
    assert.equal(queryResponse.data.data.items[0].name, 'Updated Test Item');
    log('Query functionality working ✅');
    
    // 7. Delete item
    log(`Deleting item ${createdItemId}...`);
    const deleteResponse = await axios.delete(`${API_URL}/db/${TEST_COLLECTION}/${createdItemId}`);
    assert.equal(deleteResponse.status, 200);
    assert.ok(deleteResponse.data.success);
    log('Item deleted successfully ✅');
    
    // 8. Verify deletion
    log('Verifying deletion...');
    try {
      await axios.get(`${API_URL}/db/${TEST_COLLECTION}/${createdItemId}`);
      assert.fail('Item should have been deleted');
    } catch (error) {
      assert.equal(error.response.status, 404);
      log('Item correctly shows as deleted ✅');
    }
    
    console.log('\n✅ All tests passed! The Supabase migration is working correctly.');
    
  } catch (error) {
    if (error.code === 'ERR_ASSERTION') {
      console.error(`❌ Assertion failed: ${error.message}`);
    } else {
      handleError(error, 'Test failed');
    }
  } finally {
    // Cleanup: ensure the test item is deleted if it exists
    if (createdItemId) {
      try {
        await axios.delete(`${API_URL}/db/${TEST_COLLECTION}/${createdItemId}`);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  }
}

// Run the tests
console.log('🧪 Starting Supabase Migration Tests 🧪');
runTests(); 