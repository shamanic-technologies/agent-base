/**
 * Model Service Test Script
 * 
 * A simple script to test if the Model Service is working properly.
 * This sends a POST request to the /generate endpoint and logs the response.
 */
const http = require('http');

// The prompt to send to the Model Service
const testPrompt = 'Hello, World!';

// The request body
const requestBody = JSON.stringify({
  prompt: testPrompt
});

// Request options
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

console.log('🧪 Testing Model Service at http://localhost:3001/generate');
console.log(`🔤 Sending prompt: "${testPrompt}"`);

// Send the request
const req = http.request(options, (res) => {
  console.log(`🔄 Status Code: ${res.statusCode}`);
  
  let data = '';
  
  // Collect the response data
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Process the complete response
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n✅ Test succeeded! Response:');
      console.log(JSON.stringify(response, null, 2));
      
      // Validate the response structure
      if (response.generated_text && response.model && response.tokens) {
        console.log('\n✅ Response structure is valid');
      } else {
        console.log('\n⚠️ Warning: Response structure is not as expected');
      }
    } catch (/** @type {any} */ error) {
      console.error('\n❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

// Handle request errors
req.on('error', (/** @type {any} */ error) => {
  console.error('\n❌ Error making request:', error.message);
  console.log('Is the Model Service running at http://localhost:3001?');
});

// Send the request body
req.write(requestBody);
req.end();

// Instructions for running
console.log('\n📋 Running this test:');
console.log('1. Make sure the Model Service is running (tsx watch src/index.ts)');
console.log('2. Execute this test with: node test-model-service.js'); 