/**
 * Key Service Test Script
 * 
 * A simple script to test if the Key Service is working properly.
 * This sends requests to the service endpoints and logs the responses.
 */
const http = require('http');

// Configuration
const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 3003; // Key Service runs on port 3003

// Utility function to make HTTP requests
function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: SERVICE_HOST,
      port: SERVICE_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody || '')
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
  console.log('🧪 KEY SERVICE TEST SUITE 🧪');
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
      console.log('\nIs the Key Service running? Make sure to start it with: cd apps/key-service && npm run dev');
      return;
    }
    
    // Test 2: Create API key (basic test)
    console.log('\n2️⃣ Testing create API key endpoint...');
    const createKeyPayload = {
      userId: 'test-user-id',
      name: 'Test API Key'
    };
    
    const createKeyResponse = await makeRequest('/keys', 'POST', createKeyPayload);
    
    if (createKeyResponse.statusCode === 200 || createKeyResponse.statusCode === 201) {
      console.log('✅ Create API key test passed');
      console.log('Response:', JSON.stringify(createKeyResponse.body, null, 2));
      
      // If we get an API key, test retrieving it
      if (createKeyResponse.body.data && createKeyResponse.body.data.id) {
        const keyId = createKeyResponse.body.data.id;
        
        // Test 3: Get API key
        console.log('\n3️⃣ Testing get API key endpoint...');
        const getKeyResponse = await makeRequest(`/keys/${keyId}`, 'GET');
        
        if (getKeyResponse.statusCode === 200) {
          console.log('✅ Get API key test passed');
          console.log('Response:', JSON.stringify(getKeyResponse.body, null, 2));
        } else {
          console.log(`❌ Get API key test failed with status: ${getKeyResponse.statusCode}`);
          console.log('Response:', getKeyResponse.body);
        }
      }
    } else {
      console.log(`❌ Create API key test failed with status: ${createKeyResponse.statusCode}`);
      console.log('Response:', createKeyResponse.body);
    }
    
    console.log('\n✅ Test suite completed');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.log('Is the Key Service running at the correct port?');
  }
}

// Run the tests
runTests().catch(console.error);

console.log('\n📋 Running this test:');
console.log('1. Make sure the Key Service is running (cd apps/key-service && npm run dev)');
console.log('2. Execute this test with: node test-key-service.js'); 