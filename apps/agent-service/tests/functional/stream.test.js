/**
 * Simple Streaming Test for ReAct Agent
 * 
 * This script tests the basic streaming capabilities of the ReAct agent.
 */

// Import required dependencies
require('dotenv').config({ path: '.env.local' });
const { createReactAgentWrapper } = require('../../dist/react-agent');
const { HumanMessage } = require('@langchain/core/messages');
const { UtilityHelloWorldEcho } = require('../../dist/lib/utility/utility_helloworldecho');

// Main test function
async function runStreamTest() {
  console.log('🧪 Testing Basic ReAct Agent Streaming...');
  
  try {
    // Set up tools for the agent
    const tools = [new UtilityHelloWorldEcho()];
    
    // Create a unique conversation ID for this test
    const conversationId = `test-stream-${Date.now()}`;
    console.log(`Using conversation ID: ${conversationId}`);
    
    // Create ReAct agent wrapper
    console.log('Creating ReAct agent wrapper...');
    const wrapper = createReactAgentWrapper({
      tools,
      modelName: 'claude-3-7-sonnet-20250219',
      temperature: 0,
      conversationId: conversationId
    });
    
    const { streamAgent } = wrapper;
    if (!streamAgent) {
      throw new Error('streamAgent function not found in wrapper');
    }
    
    // Create simple test prompt
    const testPrompt = "Hello";
    console.log(`🔤 Testing with prompt: "${testPrompt}"`);
    
    // Create human message
    const message = new HumanMessage(testPrompt);
    
    // Start streaming
    console.log('⏳ Starting stream...');
    
    // Specify the stream modes
    const streamModes = ['messages', 'events'];
    console.log(`Using stream modes: ${streamModes.join(', ')}`);
    
    // Start streaming agent
    let chunkCount = 0;
    for await (const chunk of streamAgent([message], streamModes)) {
      chunkCount++;
      
      // Just log that we received a chunk
      if (chunkCount <= 3) {
        console.log(`Received chunk #${chunkCount} (${typeof chunk})`);
      } else if (chunkCount === 4) {
        console.log('Receiving more chunks...');
      }
    }
    
    console.log(`✅ Stream completed with ${chunkCount} chunks received`);
    
    // If we got any chunks, consider the test successful
    return { success: chunkCount > 0, chunkCount };
  } catch (error) {
    // Handle error safely
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Stream test failed with exception: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// Run the test and output results
runStreamTest()
  .then(result => {
    if (result && result.success) {
      console.log(`\n✅ Streaming test successful! Received ${result.chunkCount} chunks.`);
      process.exit(0);
    } else {
      console.log(`\n❌ Streaming test failed: ${result?.error || 'No chunks received'}`);
      process.exit(1);
    }
  })
  .catch(error => {
    // Handle error safely
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Unexpected error in test:', errorMessage);
    process.exit(1);
  }); 