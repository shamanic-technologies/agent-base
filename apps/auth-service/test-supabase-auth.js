/**
 * Supabase Auth Service Test Script
 * 
 * This script tests the basic functionality of the Auth Service with Supabase.
 * Run this script after starting the auth service to ensure everything is working as expected.
 */
const axios = require('axios');

// Configuration
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3005';
const TEST_EMAIL = 'test@example.com'; // Replace with a valid test email
const TEST_PASSWORD = 'Test123!@#'; // Replace with a valid test password

// Test functions
async function testHealthEndpoint() {
  try {
    console.log('Testing health endpoint...');
    const response = await axios.get(`${AUTH_SERVICE_URL}/health`);
    
    if (response.data.status === 'healthy') {
      console.log('✅ Health check successful!');
      return true;
    } else {
      console.log('❌ Health check failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed with error:', error.message);
    return false;
  }
}

async function testHelloWorldEndpoint() {
  try {
    console.log('Testing helloworld endpoint...');
    const response = await axios.get(`${AUTH_SERVICE_URL}/helloworld`);
    
    if (response.data.message.includes('Supabase Auth')) {
      console.log('✅ Hello world endpoint successful!');
      return true;
    } else {
      console.log('❌ Hello world endpoint failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Hello world endpoint failed with error:', error.message);
    return false;
  }
}

async function testRegistration() {
  try {
    console.log('Testing user registration...');
    
    // Note: This may fail if the user already exists
    // It's okay if this fails with a "User already registered" error
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('✅ Registration endpoint responded:', response.data.success);
    return true;
  } catch (error) {
    // Check if error is due to user already registered
    if (error.response && error.response.data && error.response.data.error && 
        error.response.data.error.includes('already registered')) {
      console.log('⚠️ Registration failed because user already exists (expected)');
      return true;
    }
    
    console.error('❌ Registration endpoint failed with error:', 
      error.response ? error.response.data : error.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('Testing user login...');
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      console.log('✅ Login successful!');
      
      // Store the tokens for validation test
      const session = response.data.data.session;
      return session ? session.access_token : null;
    } else {
      console.log('❌ Login failed!');
      return null;
    }
  } catch (error) {
    console.error('❌ Login failed with error:', 
      error.response ? error.response.data : error.message);
    return null;
  }
}

async function testTokenValidation(accessToken) {
  if (!accessToken) {
    console.log('⚠️ Skipping token validation due to missing token');
    return false;
  }
  
  try {
    console.log('Testing token validation...');
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/auth/validate`,
      { token: accessToken }
    );
    
    if (response.data.success) {
      console.log('✅ Token validation successful!');
      return true;
    } else {
      console.log('❌ Token validation failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Token validation failed with error:', 
      error.response ? error.response.data : error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Auth Service tests...\n');
  
  // Basic connectivity
  const healthCheck = await testHealthEndpoint();
  const helloWorld = await testHelloWorldEndpoint();
  
  if (!healthCheck || !helloWorld) {
    console.error('❌ Basic connectivity tests failed. Is the auth service running?');
    return;
  }
  
  // Auth flow
  await testRegistration();
  const accessToken = await testLogin();
  await testTokenValidation(accessToken);
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('Unexpected error running tests:', error);
}); 