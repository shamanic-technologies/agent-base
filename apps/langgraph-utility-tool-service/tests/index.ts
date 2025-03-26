/**
 * Test runner for TypeScript tests
 */
import { spawn } from 'child_process';
import path from 'path';

const runTest = async (testPath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(`Running test: ${testPath}`);
    
    const test = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true,
    });
    
    test.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Test passed: ${testPath}`);
        resolve(true);
      } else {
        console.error(`❌ Test failed: ${testPath}`);
        resolve(false);
      }
    });
  });
};

const main = async () => {
  console.log('🧪 Running Utility Service tests...');
  
  const tests = [
    path.join(__dirname, 'integration', 'utility-service.test.js'),
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const passed = await runTest(test);
    if (!passed) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed');
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 