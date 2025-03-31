/**
 * Jest configuration
 */
export default {
  // Specify test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: ['**/tests/**/*.test.js'],
  
  // Process ESM modules
  transform: {},
  extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
  
  // Verbose output for debugging
  verbose: true,
  
  // Working with ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}; 