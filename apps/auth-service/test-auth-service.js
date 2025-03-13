/**
 * Auth Service Test Script
 * 
 * Tests the Auth Service authentication and token capabilities.
 */
const http = require('http');

// Configuration
const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 3005; // Auth Service runs on port 3005

// Test data
const TEST_USER = {
  username: `testuser_${Date.now()}`,
  password: 'test_password_123'
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
  console.log('🧪 AUTH SERVICE TEST SUITE 🧪');
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
      console.log('\nIs the Auth Service running? Make sure to start it with: cd apps/auth-service && npm run dev');
      return;
    }
    
    // Test 2: Register a new user
    console.log('\n2️⃣ Testing user registration...');
    const registerResponse = await makeRequest('/auth/register', 'POST', {}, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    if (registerResponse.statusCode === 201 && registerResponse.body.success) {
      console.log('✅ User registration successful');
      console.log('User data:', registerResponse.body.data);
    } else {
      console.log(`❌ User registration failed with status: ${registerResponse.statusCode}`);
      console.log('Response:', registerResponse.body);
      // Continue with tests using demo user...
    }
    
    // Test 3: Login user
    console.log('\n3️⃣ Testing user login...');
    const loginResponse = await makeRequest('/auth/login', 'POST', {}, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    let accessToken;
    let refreshToken;
    
    if (loginResponse.statusCode === 200 && loginResponse.body.success) {
      console.log('✅ User login successful');
      accessToken = loginResponse.body.data.accessToken;
      refreshToken = loginResponse.body.data.refreshToken;
      console.log('Access token:', accessToken.substring(0, 20) + '...');
    } else {
      console.log(`❌ User login failed with status: ${loginResponse.statusCode}`);
      console.log('Response:', loginResponse.body);
      console.log('\nTrying with demo user credentials...');
      
      // Try with demo user
      const demoResponse = await makeRequest('/auth/test-credentials', 'GET');
      if (demoResponse.statusCode === 200 && demoResponse.body.success) {
        const demoLogin = await makeRequest('/auth/login', 'POST', {}, {
          username: demoResponse.body.data.username,
          password: demoResponse.body.data.password
        });
        
        if (demoLogin.statusCode === 200 && demoLogin.body.success) {
          console.log('✅ Demo user login successful');
          accessToken = demoLogin.body.data.accessToken;
          refreshToken = demoLogin.body.data.refreshToken;
          console.log('Access token:', accessToken.substring(0, 20) + '...');
        } else {
          console.log(`❌ Demo user login failed with status: ${demoLogin.statusCode}`);
          console.log('Response:', demoLogin.body);
          return;
        }
      } else {
        console.log(`❌ Could not get demo credentials: ${demoResponse.statusCode}`);
        return;
      }
    }
    
    // Test 4: Validate token
    console.log('\n4️⃣ Testing token validation...');
    const validateResponse = await makeRequest('/auth/validate', 'POST', {}, {
      token: accessToken
    });
    
    if (validateResponse.statusCode === 200 && validateResponse.body.success) {
      console.log('✅ Token validation successful');
      console.log('User data:', validateResponse.body.data);
    } else {
      console.log(`❌ Token validation failed with status: ${validateResponse.statusCode}`);
      console.log('Response:', validateResponse.body);
    }
    
    // Test 5: Refresh token
    if (refreshToken) {
      console.log('\n5️⃣ Testing token refresh...');
      const refreshResponse = await makeRequest('/auth/refresh', 'POST', {}, {
        refreshToken
      });
      
      if (refreshResponse.statusCode === 200 && refreshResponse.body.success) {
        console.log('✅ Token refresh successful');
        console.log('New access token:', refreshResponse.body.data.accessToken.substring(0, 20) + '...');
      } else {
        console.log(`❌ Token refresh failed with status: ${refreshResponse.statusCode}`);
        console.log('Response:', refreshResponse.body);
      }
    }
    
    console.log('\n✅ Test suite completed');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.log('Is the Auth Service running at the correct port?');
  }
}

// Run the tests
runTests().catch(console.error);

console.log('\n📋 Running this test:');
console.log('1. Make sure the Auth Service is running (cd apps/auth-service && npm run dev)');
console.log('2. Execute this test with: node test-auth-service.js'); 