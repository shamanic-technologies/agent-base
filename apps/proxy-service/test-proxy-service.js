/**
 * Proxy Service Test Script
 * 
 * Tests the Proxy Service API gateway functionality.
 */
const http = require('http');

// Configuration
const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 3002; // Proxy Service typically runs on port 3002

// Test prompt for the model service
const TEST_PROMPT = "Hello, testing the proxy service!";

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
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            error: `Failed to parse response: ${e.message}`
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (data) {
      req.write(requestBody);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🧪 PROXY SERVICE TEST SUITE 🧪');
  console.log(`Testing service at http://${SERVICE_HOST}:${SERVICE_PORT}\n`);
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await makeRequest('/health', 'GET');
    
    if (healthResponse.statusCode === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log(`❌ Health check failed with status: ${healthResponse.statusCode}`);
      console.log('Response:', healthResponse.body);
      console.log('\nIs the Proxy Service running? Make sure to start it with: cd apps/proxy-service && npm run dev');
      return;
    }
    
    // Test 2: Try to call API without API key
    console.log('\n2️⃣ Testing API access without API key...');
    const noKeyResponse = await makeRequest('/api/generate', 'POST', {}, {
      prompt: TEST_PROMPT
    });
    
    if (noKeyResponse.statusCode === 401) {
      console.log('✅ Authentication check passed - Correctly rejected request without API key');
    } else {
      console.log(`❌ Authentication check failed - Expected 401, got ${noKeyResponse.statusCode}`);
      console.log('Response:', noKeyResponse.body);
    }
    
    // Test 3: Get an API key from the Key Service (for integration test)
    console.log('\n3️⃣ Creating a test API key from Key Service...');
    let apiKey;
    try {
      const keyResponse = await makeRequest('/get-test-key', 'GET');
      
      if (keyResponse.statusCode === 200 && keyResponse.body.apiKey) {
        apiKey = keyResponse.body.apiKey;
        console.log('✅ Retrieved test API key successfully');
      } else {
        console.log('⚠️ Could not get test key, using placeholder for next test');
        apiKey = 'test-api-key'; // Placeholder for testing
      }
    } catch (e) {
      console.log('⚠️ Could not get test key, using placeholder for next test');
      apiKey = 'test-api-key'; // Placeholder for testing
    }
    
    // Test 4: Call generate endpoint with API key
    console.log('\n4️⃣ Testing generate endpoint with API key...');
    const generateResponse = await makeRequest('/api/generate', 'POST', {
      'x-api-key': apiKey
    }, {
      prompt: TEST_PROMPT
    });
    
    if (generateResponse.statusCode === 200) {
      console.log('✅ Generate endpoint test passed');
      console.log('Response:', JSON.stringify(generateResponse.body, null, 2));
    } else {
      console.log(`❌ Generate endpoint test failed with status: ${generateResponse.statusCode}`);
      console.log('Response:', generateResponse.body);
    }
    
    console.log('\n✅ Test suite completed');
    
  } catch (e) {
    console.error('\n❌ Error during testing:', e.message);
    console.log('Is the Proxy Service running at the correct port?');
  }
}

// Run the tests
runTests().catch(console.error);

console.log('\n📋 Running this test:');
console.log('1. Make sure the Proxy Service is running (cd apps/proxy-service && npm run dev)');
console.log('2. Execute this test with: node test-proxy-service.js'); 