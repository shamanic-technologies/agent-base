/**
 * Integration test for the Utility Service
 * 
 * Tests basic functionality of the API endpoints
 */
const fetch = require('node-fetch');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testHealthEndpoint() {
  console.log('Testing health endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (response.status !== 200) {
      console.error('❌ Health check failed with status', response.status);
      console.error(data);
      return false;
    }
    
    if (data.status !== 'healthy') {
      console.error('❌ Health check returned unexpected status:', data.status);
      return false;
    }
    
    console.log('✅ Health check passed');
    return true;
  } catch (error) {
    console.error('❌ Health check failed with error:', error.message);
    return false;
  }
}

async function testEchoEndpoint() {
  console.log('Testing echo endpoint...');
  
  const testData = { message: 'Hello, world!' };
  
  try {
    const response = await fetch(`${BASE_URL}/utility/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'echo',
        data: testData
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      console.error('❌ Echo test failed with status', response.status);
      console.error(data);
      return false;
    }
    
    if (!data.data || data.data.message !== testData.message) {
      console.error('❌ Echo returned unexpected data:', JSON.stringify(data));
      return false;
    }
    
    console.log('✅ Echo test passed');
    return true;
  } catch (error) {
    console.error('❌ Echo test failed with error:', error.message);
    return false;
  }
}

async function testTimestampEndpoint() {
  console.log('Testing timestamp endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/utility/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'timestamp'
      })
    });
    
    const data = await response.json();
    
    if (response.status !== 200) {
      console.error('❌ Timestamp test failed with status', response.status);
      console.error(data);
      return false;
    }
    
    if (!data.timestamp) {
      console.error('❌ Timestamp returned unexpected data:', JSON.stringify(data));
      return false;
    }
    
    console.log('✅ Timestamp test passed');
    return true;
  } catch (error) {
    console.error('❌ Timestamp test failed with error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Running Utility Service integration tests...');
  console.log(`API URL: ${BASE_URL}`);
  
  const healthResult = await testHealthEndpoint();
  const echoResult = await testEchoEndpoint();
  const timestampResult = await testTimestampEndpoint();
  
  const allPassed = healthResult && echoResult && timestampResult;
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed');
    process.exit(1);
  }
}

runTests(); 