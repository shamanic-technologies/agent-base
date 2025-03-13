/**
 * Model Service Simple Test Script
 * 
 * This script provides a simple way to test the Model Service API without any dependencies.
 * It performs multiple test cases and prints the results to the console.
 * 
 * To run this test:
 * 1. Make sure the Model Service is running (cd apps/model-service && tsx watch src/index.ts)
 * 2. Run: node test-model-service-simple.js
 */

const http = require('http');

// Configuration
const MODEL_SERVICE_HOST = 'localhost';
const MODEL_SERVICE_PORT = 3001;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Makes an HTTP request to the Model Service
 * @param {string} path - The endpoint path
 * @param {object} data - The request payload
 * @returns {Promise<object>} - The response object
 */
function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: MODEL_SERVICE_HOST,
      port: MODEL_SERVICE_PORT,
      path: path,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = responseData ? JSON.parse(responseData) : {};
        } catch (e) {
          parsedBody = { parseError: e.message, raw: responseData };
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedBody
        });
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

/**
 * Run a test case and record the result
 * @param {string} name - The name of the test
 * @param {Function} testFn - The test function that returns true or false
 */
async function runTest(name, testFn) {
  console.log(`\n⏳ RUNNING: ${name}`);
  const startTime = Date.now();
  
  try {
    const passed = await testFn();
    const duration = Date.now() - startTime;
    
    if (passed) {
      results.passed++;
      results.tests.push({ name, passed: true, duration });
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
    } else {
      results.failed++;
      results.tests.push({ name, passed: false, duration });
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
    console.log(`❌ ERROR: ${name} - ${error.message}`);
  }
}

/**
 * Print the final test results summary
 */
function printResults() {
  console.log('\n=== TEST RESULTS ===');
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`- ${test.name}${test.error ? ': ' + test.error : ''}`);
    });
  }
  
  console.log('\n=== END RESULTS ===');
}

// Define test cases
const tests = [
  // Test 1: Health check
  async function testHealthCheck() {
    console.log('  Testing server health endpoint...');
    try {
      const response = await makeRequest('/health', null);
      return response.statusCode === 200;
    } catch (error) {
      console.error('  Server may not be running:', error.message);
      return false;
    }
  },
  
  // Test 2: Basic text generation
  async function testBasicGeneration() {
    console.log('  Testing basic text generation...');
    const response = await makeRequest('/generate', { prompt: 'Hello, World!' });
    
    if (response.statusCode !== 200) {
      console.error(`  Unexpected status code: ${response.statusCode}`);
      return false;
    }
    
    const validResponse = 
      response.body.generated_text && 
      response.body.model && 
      response.body.tokens && 
      response.body.request_id;
    
    if (!validResponse) {
      console.error('  Response is missing expected fields:', response.body);
    } else {
      console.log('  Response:', response.body.generated_text.substring(0, 50) + '...');
      console.log('  Tokens:', response.body.tokens);
    }
    
    return validResponse;
  },
  
  // Test 3: Empty prompt handling
  async function testEmptyPrompt() {
    console.log('  Testing empty prompt handling...');
    const response = await makeRequest('/generate', { prompt: '' });
    return response.statusCode === 200 && response.body.generated_text !== undefined;
  },
  
  // Test 4: Model parameters
  async function testModelParameters() {
    console.log('  Testing model parameters...');
    const response = await makeRequest('/generate', { 
      prompt: 'Write a short story', 
      temperature: 0.2,
      max_tokens: 20
    });
    
    if (response.statusCode !== 200) {
      return false;
    }
    
    // Check if tokens are roughly within our requested limit (allow some margin)
    const tokensWithinLimit = 
      response.body.tokens && 
      response.body.tokens.completion <= 30; // Allowing some margin
      
    if (!tokensWithinLimit) {
      console.error('  Token count exceeded expected limit:', response.body.tokens);
    }
    
    return tokensWithinLimit;
  },
  
  // Test 5: Error handling for missing prompt
  async function testMissingPrompt() {
    console.log('  Testing error handling for missing prompt...');
    const response = await makeRequest('/generate', {});
    return response.statusCode === 400;
  }
];

// Main test runner
async function runAllTests() {
  console.log('🧪 MODEL SERVICE TEST SUITE 🧪');
  console.log(`Testing service at http://${MODEL_SERVICE_HOST}:${MODEL_SERVICE_PORT}`);
  
  // Run each test
  for (let i = 0; i < tests.length; i++) {
    const testName = tests[i].name.replace('test', '').replace(/([A-Z])/g, ' $1').trim();
    await runTest(testName, tests[i]);
  }
  
  // Print results
  printResults();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 