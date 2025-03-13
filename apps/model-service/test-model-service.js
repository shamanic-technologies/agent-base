/**
 * Model Service Test Script
 * 
 * A simple script to test if the Model Service is working properly.
 * This sends a POST request to the /generate endpoint and logs the response.
 */
const http = require('http');

// Generate a thread ID for multi-turn conversation
const threadId = `thread_${Date.now()}`;

// Get command line arguments
const args = process.argv.slice(2);
const shouldUseThread = args.includes('--thread') || args.includes('-t');
const followupTest = args.includes('--followup') || args.includes('-f');

// The prompt to send to the Model Service - using a more complex reasoning task
let testPrompt = followupTest 
  ? 'And if the train travels at 90 km/h, how long would it take?' 
  : 'If a train travels at 120 km/h, how long will it take to travel 450 km? Please show your reasoning.';

// The request body
const requestBody = JSON.stringify({
  prompt: testPrompt,
  ...(shouldUseThread && { thread_id: threadId })
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

console.log('🧪 Testing LangGraph ReAct Agent Service at http://localhost:3001/generate');
console.log(`🔤 Sending prompt: "${testPrompt}"`);
if (shouldUseThread) {
  console.log(`🧵 Using thread ID: ${threadId}`);
  if (followupTest) {
    console.log('📝 This is a follow-up test to demonstrate conversation memory');
  } else {
    console.log('📝 Run with --thread --followup to test conversation continuity');
  }
}

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
        
        // Check for reasoning patterns in the response
        const responseText = response.generated_text;
        const hasReasoning = 
          responseText.includes('Reasoning') || 
          responseText.includes('reasoning') || 
          responseText.includes('think') || 
          responseText.includes('calculate');
        
        const hasCalculation = 
          responseText.includes('calculator') || 
          responseText.includes('calculation') || 
          responseText.includes('divide') || 
          (responseText.includes('450') && responseText.includes('120')) ||
          (followupTest && responseText.includes('90'));
        
        const hasAnswer = 
          responseText.includes('3.75') || 
          responseText.includes('3.75 hours') || 
          responseText.includes('3 hours and 45 minutes') ||
          (followupTest && (
            responseText.includes('5 hours') || 
            responseText.includes('5.0 hours') || 
            responseText.includes('5:00')
          ));
        
        console.log('  Response contains reasoning:', hasReasoning ? '✅' : '❌');
        console.log('  Response contains calculation:', hasCalculation ? '✅' : '❌');
        console.log('  Response contains correct answer:', hasAnswer ? '✅' : '❌');
        
        if (hasReasoning && hasCalculation && hasAnswer) {
          console.log('\n✅ LangGraph ReAct agent is working correctly!');
        } else {
          console.log('\n⚠️ LangGraph ReAct agent response is missing expected reasoning patterns');
        }
        
        if (shouldUseThread && !followupTest) {
          console.log('\n📝 To test conversation memory, run:');
          console.log(`node test-model-service.js --thread --followup`);
          console.log(`This will send a follow-up question using the same thread ID (${threadId})`);
        }
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
console.log('   Or try with a persistent thread: node test-model-service.js --thread'); 