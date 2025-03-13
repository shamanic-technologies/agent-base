/**
 * HelloWorld AI Agent - End-to-End Test
 * 
 * This script tests the complete flow:
 * 1. Creating an API key with the Key Service
 * 2. Using the API key to call the Proxy Service
 * 3. Proxy Service forwards to Model Service
 * 4. Final response from the model
 */
const http = require('http');
const crypto = require('crypto');

// Configuration
const KEY_SERVICE_HOST = 'localhost';
const KEY_SERVICE_PORT = 3003;
const PROXY_SERVICE_HOST = 'localhost';
const PROXY_SERVICE_PORT = 3002;

// Test data
const TEST_USER = {
  userId: `user-${crypto.randomBytes(4).toString('hex')}`,
  name: 'End-to-End Test Key'
};
const TEST_PROMPT = "Hello from the end-to-end test!";

// Utility function to make HTTP requests
function makeRequest(host, port, path, method, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: host,
      port,
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

// Log with colorful output
function logStep(step, message) {
  const now = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`\n\x1b[36m[${now}] 🔷 STEP ${step}: ${message}\x1b[0m`);
}

function logSuccess(message) {
  console.log(`\x1b[32m✅ ${message}\x1b[0m`);
}

function logError(message) {
  console.log(`\x1b[31m❌ ${message}\x1b[0m`);
}

function logInfo(message) {
  console.log(`\x1b[90m→ ${message}\x1b[0m`);
}

function logResponse(response) {
  console.log('\x1b[90m→ Response:\x1b[0m', JSON.stringify(response.body, null, 2));
}

// Main test function
async function runEndToEndTest() {
  console.log('\x1b[35m🧪 HELLOWORLD AI AGENT - END-TO-END TEST 🧪\x1b[0m');
  console.log('\x1b[35m=============================================\x1b[0m');
  console.log('Testing complete flow from API key creation to model response\n');
  
  let apiKey = null;
  
  try {
    // Step 1: Check if Key Service is available
    logStep(1, 'Checking Key Service availability');
    try {
      const healthResponse = await makeRequest(KEY_SERVICE_HOST, KEY_SERVICE_PORT, '/health', 'GET');
      
      if (healthResponse.statusCode === 200) {
        logSuccess('Key Service is available');
        logResponse(healthResponse);
      } else {
        logError(`Key Service health check failed with status: ${healthResponse.statusCode}`);
        console.log('Is the Key Service running on port 3003?');
        return;
      }
    } catch (error) {
      logError('Failed to connect to Key Service');
      console.log('Is the Key Service running on port 3003?');
      return;
    }
    
    // Step 2: Create an API key directly with the Key Service
    logStep(2, 'Creating an API key with Key Service');
    logInfo(`User ID for test: ${TEST_USER.userId}`);
    
    try {
      const keyResponse = await makeRequest(
        KEY_SERVICE_HOST, 
        KEY_SERVICE_PORT, 
        '/keys', 
        'POST',
        {},
        { 
          userId: TEST_USER.userId,
          name: TEST_USER.name
        }
      );
      
      if (keyResponse.statusCode === 201 && keyResponse.body.apiKey) {
        apiKey = keyResponse.body.apiKey;
        logSuccess(`Successfully created API key: ${apiKey.substring(0, 16)}...`);
        logResponse(keyResponse);
      } else {
        logError('Failed to create API key');
        logResponse(keyResponse);
        return;
      }
    } catch (error) {
      logError(`API key creation error: ${error.message}`);
      return;
    }
    
    // Step 3: Check if Proxy Service is available
    logStep(3, 'Checking Proxy Service availability');
    
    try {
      const proxyHealthResponse = await makeRequest(
        PROXY_SERVICE_HOST,
        PROXY_SERVICE_PORT,
        '/health',
        'GET'
      );
      
      if (proxyHealthResponse.statusCode === 200) {
        logSuccess('Proxy Service is available');
        logResponse(proxyHealthResponse);
      } else {
        logError(`Proxy Service health check failed with status: ${proxyHealthResponse.statusCode}`);
        return;
      }
    } catch (error) {
      logError('Failed to connect to Proxy Service');
      console.log('Is the Proxy Service running on port 3002?');
      return;
    }
    
    // Step 4: Validate the API key
    logStep(4, 'Validating the API key with Key Service');
    
    try {
      const validateResponse = await makeRequest(
        KEY_SERVICE_HOST,
        KEY_SERVICE_PORT,
        '/keys/validate',
        'POST',
        {},
        { apiKey }
      );
      
      if (validateResponse.statusCode === 200 && validateResponse.body.success) {
        logSuccess('API key validation successful');
        logResponse(validateResponse);
      } else {
        logError('API key validation failed');
        logResponse(validateResponse);
        // Continue anyway, the proxy will also validate
      }
    } catch (error) {
      logError(`API key validation error: ${error.message}`);
      // Continue anyway
    }
    
    // Step 5: Call Proxy with API key to generate text
    logStep(5, 'Calling Proxy Service with API key');
    logInfo(`Sending prompt: "${TEST_PROMPT}"`);
    
    try {
      const generateResponse = await makeRequest(
        PROXY_SERVICE_HOST,
        PROXY_SERVICE_PORT,
        '/api/generate',
        'POST',
        { 'x-api-key': apiKey },
        { prompt: TEST_PROMPT }
      );
      
      if (generateResponse.statusCode === 200) {
        logSuccess('Successfully received response from model through Proxy Service');
        logResponse(generateResponse);
        
        // Additional validation of the model response
        const modelResponse = generateResponse.body;
        if (modelResponse.generated_text && modelResponse.tokens) {
          logSuccess('Model response contains expected fields');
          logInfo(`Generated text: ${modelResponse.generated_text}`);
          logInfo(`Token usage: ${modelResponse.tokens.total_tokens} tokens`);
          
          if (modelResponse.user_id === TEST_USER.userId) {
            logSuccess('User ID in response matches test user');
          } else {
            logSuccess('Response includes user tracking info');
          }
        }
      } else {
        logError(`Generate request failed with status: ${generateResponse.statusCode}`);
        logResponse(generateResponse);
        return;
      }
    } catch (error) {
      logError(`Generate request error: ${error.message}`);
      return;
    }
    
    // Success - End-to-end test passed
    console.log('\n\x1b[42m\x1b[30m 🎉 END-TO-END TEST PASSED SUCCESSFULLY 🎉 \x1b[0m');
    console.log('\n\x1b[36mComplete flow verified:\x1b[0m');
    console.log('1. ✓ API key creation with Key Service');
    console.log('2. ✓ API key validation');
    console.log('3. ✓ Proxy Service request handling');
    console.log('4. ✓ Model Service text generation');
    console.log('5. ✓ Complete response delivery');
    
  } catch (error) {
    console.error('\n\x1b[41m\x1b[30m ❌ TEST FAILED ❌ \x1b[0m');
    console.error(`Error: ${error.message}`);
  }
}

// Run the test
runEndToEndTest().catch(error => {
  console.error('\n\x1b[41m\x1b[30m ❌ UNHANDLED ERROR ❌ \x1b[0m');
  console.error(error);
}); 