/**
 * Model Service Test Runner
 * 
 * This is the main entry point for running all tests for the Model Service.
 * It can be called directly or via npm scripts.
 */

import { runAllTests } from './model-service.test';
import http from 'http';

// Check if the service is running, with a timeout of 5 seconds
async function checkServiceIsRunning(): Promise<boolean> {
  console.log('Checking if the Model Service is running...');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 1000
    }, (res: http.IncomingMessage) => {
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

// Main function
async function main() {
  const isRunning = await checkServiceIsRunning();
  
  if (!isRunning) {
    console.error('\n⚠️ Please start the Model Service before running tests:');
    console.error('  cd apps/model-service');
    console.error('  pnpm dev  # or npm run dev');
    process.exit(1);
  }
  
  // Run all tests
  await runAllTests();
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}

export { main as runTests }; 