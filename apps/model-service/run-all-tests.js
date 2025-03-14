/**
 * Model Service All Tests Runner
 * 
 * This script runs all available tests for the model service.
 * It will first check if the server is running, then run the tests in sequence.
 */

const { spawn } = require('child_process');
const http = require('http');

// Configuration
const tests = [
  { name: 'Integration Tests', cmd: 'npm', args: ['run', 'test:integration'] },
  { name: 'Simple API Test', cmd: 'npm', args: ['run', 'test:simple'] },
  { name: 'ReAct Agent Test', cmd: 'npm', args: ['run', 'test:react'] },
  { name: 'Streaming Test', cmd: 'npm', args: ['run', 'test:stream'] }
];

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Check if the service is running
async function checkServiceIsRunning() {
  console.log('Checking if the Model Service is running...');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Model Service is running');
          resolve(true);
        } else {
          console.log('❌ Model Service responded with status code:', res.statusCode);
          resolve(false);
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌ Model Service is not running at http://localhost:3001');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Connection to Model Service timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Run a single test
async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running ${test.name}...`);
    
    const process = spawn(test.cmd, test.args, { stdio: 'inherit' });
    
    process.on('close', (code) => {
      const success = code === 0;
      
      if (success) {
        results.passed++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name} FAILED (exit code: ${code})`);
      }
      
      results.details.push({
        name: test.name,
        success,
        exitCode: code
      });
      
      resolve(success);
    });
  });
}

// Print test results
function printResults() {
  console.log('\n=====================');
  console.log('🧪 TEST RESULTS 🧪');
  console.log('=====================');
  console.log(`Total: ${results.passed + results.failed + results.skipped}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.details.filter(t => !t.success).forEach(test => {
      console.log(`- ${test.name} (exit code: ${test.exitCode})`);
    });
  }
  
  if (results.skipped > 0) {
    console.log('\nSkipped Tests:');
    console.log('- Integration Tests (server not running)');
    console.log('- Simple API Test (server not running)');
  }
  
  console.log('\n=====================');
}

// Main function
async function main() {
  console.log('🧪 RUNNING ALL MODEL SERVICE TESTS 🧪');
  
  const isServiceRunning = await checkServiceIsRunning();
  
  if (!isServiceRunning) {
    console.log('\n⚠️ Model Service is not running!');
    console.log('Integration tests and API tests will be skipped.');
    console.log('To run all tests, please start the service with: npm run dev');
    
    // Skip integration and API tests
    results.skipped += 2;
    
    // Run only self-contained tests that don't need the server
    for (const test of tests.slice(2)) {
      await runTest(test);
    }
  } else {
    // Run all tests
    for (const test of tests) {
      await runTest(test);
    }
  }
  
  // Print results
  printResults();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 