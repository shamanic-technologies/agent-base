/**
 * Integration test for the Utility Service
 * 
 * Tests basic functionality of the API endpoints
 */
const fetch = require('node-fetch');

const BASE_URL = process.env.API_URL || 'http://localhost:3008';

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

async function testDateTimeEndpoint() {
  console.log('Testing utility_get_current_datetime endpoint...');
  
  try {
    // Test with default format (ISO)
    const response = await fetch(`${BASE_URL}/utility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'utility_get_current_datetime'
      })
    });
    
    if (response.status !== 200) {
      console.error('❌ DateTime check failed with status', response.status);
      console.error(await response.json());
      return false;
    }
    
    const data = await response.json();
    
    // Verify that the data field exists and contains a string that looks like an ISO date
    if (!data.data || typeof data.data !== 'string' || !data.data.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      console.error('❌ DateTime check returned invalid data:', data);
      return false;
    }
    
    // Test with custom format (unix)
    const unixResponse = await fetch(`${BASE_URL}/utility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'utility_get_current_datetime',
        data: {
          format: 'unix'
        }
      })
    });
    
    if (unixResponse.status !== 200) {
      console.error('❌ DateTime (unix) check failed with status', unixResponse.status);
      console.error(await unixResponse.json());
      return false;
    }
    
    const unixData = await unixResponse.json();
    
    // Verify that the data field exists and contains a number-like string
    if (!unixData.data || typeof unixData.data !== 'string' || !/^\d+$/.test(unixData.data)) {
      console.error('❌ DateTime (unix) check returned invalid data:', unixData);
      return false;
    }
    
    console.log('✅ DateTime check passed');
    return true;
  } catch (error) {
    console.error('❌ DateTime check failed with error:', error.message);
    return false;
  }
}

async function runTests() {
  let failures = 0;
  
  if (!(await testHealthEndpoint())) {
    failures++;
  }
  
  if (!(await testDateTimeEndpoint())) {
    failures++;
  }
  
  if (failures > 0) {
    console.error(`❌ ${failures} test(s) failed`);
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Run the tests
runTests(); 