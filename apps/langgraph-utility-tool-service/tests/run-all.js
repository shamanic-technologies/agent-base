/**
 * Test runner for the Utility Service
 * 
 * Runs all available tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Define color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Log with colors
function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

// Print header
log('', COLORS.bright);
log('🧪 UTILITY SERVICE TEST RUNNER', COLORS.bright + COLORS.blue);
log('================================', COLORS.bright + COLORS.blue);
log('');

// Track if any test fails
let hasFailures = false;

// Helper to run a test with proper output
function runTest(name, command) {
  log(`Running ${name}...`, COLORS.cyan);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${name} tests passed\n`, COLORS.green);
    return true;
  } catch (error) {
    log(`❌ ${name} tests failed\n`, COLORS.red);
    hasFailures = true;
    return false;
  }
}

// Run the tests
runTest('Integration Tests', 'node tests/integration/utility-service.test.js');

// Final results
log('');
if (hasFailures) {
  log('❌ Some tests failed', COLORS.bright + COLORS.red);
  process.exit(1);
} else {
  log('✅ All tests passed successfully!', COLORS.bright + COLORS.green);
  process.exit(0);
} 