/**
 * Model Service Integration Tests
 * 
 * This file contains a simple testing framework to verify the Model Service API
 * without requiring additional dependencies.
 */

import http from 'http';

// Configuration
const MODEL_SERVICE_HOST = 'localhost';
const MODEL_SERVICE_PORT = 3001;

// Structure for test response
interface TestResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
}

const results = {
  passed: 0,
  failed: 0,
  tests: [] as TestResult[]
};

/**
 * Makes an HTTP request to the Model Service
 * @param path - The endpoint path
 * @param data - The request payload
 * @returns The response object
 */
function makeRequest(path: string, data?: Record<string, any>): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const requestBody = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: MODEL_SERVICE_HOST,
      port: MODEL_SERVICE_PORT,
      path,
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
        } catch (e: any) {
          parsedBody = { parseError: e.message, raw: responseData };
        }
        
        resolve({
          statusCode: res.statusCode || 500,
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
 * @param name - The name of the test
 * @param testFn - The test function that returns true or false
 */
async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
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
  } catch (error: any) {
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
    console.log(`❌ ERROR: ${name} - ${error.message}`);
  }
}

/**
 * Print the final test results summary
 */
function printResults(): void {
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
  async function testHealthCheck(): Promise<boolean> {
    console.log('  Testing server health endpoint...');
    try {
      const response = await makeRequest('/health');
      return response.statusCode === 200;
    } catch (error: any) {
      console.error('  Server may not be running:', error.message);
      return false;
    }
  },
  
  // Test 2: Basic text generation
  async function testBasicGeneration(): Promise<boolean> {
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
  
  // Test 3: Error handling for missing prompt
  async function testMissingPrompt(): Promise<boolean> {
    console.log('  Testing error handling for missing prompt...');
    const response = await makeRequest('/generate', {});
    return response.statusCode === 400;
  },
  
  // Test 4: Claude ReAct Agent with reasoning task
  async function testClaudeReActAgent(): Promise<boolean> {
    console.log('  Testing Claude ReAct Agent with a reasoning task...');
    const complexPrompt = 'If a train travels at 120 km/h, how long will it take to travel 450 km?';
    const response = await makeRequest('/generate', { prompt: complexPrompt });
    
    if (response.statusCode !== 200) {
      console.error(`  Unexpected status code: ${response.statusCode}`);
      return false;
    }
    
    // Check for valid response structure
    const validResponse = 
      response.body.generated_text && 
      response.body.model && 
      response.body.model.includes('claude') &&
      response.body.tokens && 
      response.body.request_id;
    
    if (!validResponse) {
      console.error('  Response is missing expected fields or incorrect model:', response.body);
      return false;
    }
    
    // Check for reasoning patterns in the response
    const responseText = response.body.generated_text;
    const hasReasoning = 
      responseText.includes('Reasoning') || 
      responseText.includes('reasoning') || 
      responseText.includes('think') || 
      responseText.includes('calculate');
    
    const hasCalculation = 
      responseText.includes('calculator') || 
      responseText.includes('calculation') || 
      responseText.includes('divide') || 
      responseText.includes('450') && responseText.includes('120');
    
    const hasAnswer = 
      responseText.includes('3.75') || 
      responseText.includes('3.75 hours') || 
      responseText.includes('3 hours and 45 minutes');
    
    console.log('  Response contains reasoning:', hasReasoning);
    console.log('  Response contains calculation:', hasCalculation);
    console.log('  Response contains correct answer:', hasAnswer);
    console.log('  Response excerpt:', responseText.substring(0, 100) + '...');
    
    return validResponse && (hasReasoning || hasCalculation) && hasAnswer;
  }
];

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('🧪 MODEL SERVICE TEST SUITE 🧪');
  console.log(`Testing service at http://${MODEL_SERVICE_HOST}:${MODEL_SERVICE_PORT}`);
  
  // Run each test
  for (const test of tests) {
    const testName = test.name.replace('test', '').replace(/([A-Z])/g, ' $1').trim();
    await runTest(testName, test);
  }
  
  // Print results
  printResults();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Export the runner for npm tests
export { runAllTests };

// If this file is run directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
} 