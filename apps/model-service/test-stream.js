/**
 * Testing script for ReAct Agent Streaming Functionality
 * 
 * This script tests the streaming capabilities of the ReAct agent
 * without starting the Express server.
 */

// Import required dependencies
require('dotenv').config({ path: '.env.local' });
const { createReactAgentWrapper } = require('./dist/react-agent');
const { HumanMessage } = require('@langchain/core/messages');
// Fix import to use the correct path where UtilityHelloWorldEcho is exported
const { UtilityHelloWorldEcho } = require('./dist/lib/utility/utility_helloworldecho');

// Main test function
async function runStreamTest() {
  console.log('🧪 Testing ReAct Agent Streaming Functionality...');
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    console.error('Please make sure your .env.local file contains a valid ANTHROPIC_API_KEY');
    console.error('You can get an API key from https://console.anthropic.com/');
    return { success: false, error: 'Missing API key' };
  }
  
  try {
    // Set up tools for the agent
    const tools = [new UtilityHelloWorldEcho()];
    
    // Create conversation ID for this test
    const conversationId = `test-stream-${Date.now()}`;
    console.log(`Using conversation ID: ${conversationId}`);

    // Log the API key availability (don't show the actual key)
    console.log(`API key available: ${!!process.env.ANTHROPIC_API_KEY}`);
    
    // Create ReAct agent with enhanced error handling
    console.log('Creating ReAct agent wrapper...');
    const wrapper = createReactAgentWrapper({
      tools,
      modelName: 'claude-3-7-sonnet-20250219',
      temperature: 0,
      conversationId: conversationId
    });
    
    // Log what functions are available in the wrapper
    console.log('Available functions in wrapper:', Object.keys(wrapper));
    
    const { streamAgent } = wrapper;
    if (!streamAgent) {
      throw new Error('streamAgent function not found in wrapper');
    }
    
    // Create test prompt
    const testPrompt = "Hello, can you echo this message back to me?";
    console.log(`🔤 Testing with prompt: "${testPrompt}"`);
    
    // Create human message
    const message = new HumanMessage(testPrompt);
    
    // Start streaming and capture events
    console.log('⏳ Starting stream...');
    let chunks = [];
    let endTriggered = false;
    let content = '';
    
    console.log('Stream events:');
    console.log('-------------');
    
    // Add a manual "start" event to make sure our event tracking works
    const manualStartEvent = {
      event: "manual_start",
      data: { message: "Starting test stream" }
    };
    console.log(`[${manualStartEvent.event}] ${JSON.stringify(manualStartEvent.data)}...`);
    chunks.push(manualStartEvent);
    
    // Start streaming agent - no need to pass thread_id as it's in the wrapper
    let streamCount = 0;
    for await (const chunk of streamAgent([message])) {
      streamCount++;
      
      // Log the raw chunk for debugging
      console.log(`\n--- Raw Chunk (${typeof chunk}): ---`);
      console.log(chunk);
      console.log(`---------------------------`);
      
      // Look for the echo response directly in the raw chunk
      if (typeof chunk === 'string' && chunk.includes('Echoing input:')) {
        const match = chunk.match(/Echoing input: (.*)/);
        if (match && match[1]) {
          content = match[1];
          console.log(`📢 Extracted echo content: "${content}"`);
        }
      }
      
      // Check if chunk is a string containing JSON with message content
      if (typeof chunk === 'string') {
        try {
          const jsonData = JSON.parse(chunk);
          // Look for messages in the agent response
          if (jsonData.agent && jsonData.agent.messages) {
            const messages = jsonData.agent.messages;
            // Find the tool message with echo content
            for (const msg of messages) {
              if (msg.kwargs && msg.kwargs.content && msg.kwargs.content.includes('ECHO:')) {
                const echoMatch = msg.kwargs.content.match(/🔊 ECHO: "(.*)" 🔊/);
                if (echoMatch && echoMatch[1]) {
                  content = echoMatch[1];
                  console.log(`📢 Extracted echo from JSON: "${content}"`);
                }
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors for this check
        }
      }
      
      // If the raw chunk is the echo response, use it as content directly
      if (typeof chunk === 'string' && chunk.startsWith('Echoing input:')) {
        content = chunk.replace('Echoing input:', '').trim();
        console.log(`📢 Direct echo content: "${content}"`);
      }
      
      // Handle potential errors in JSON parsing
      let parsedChunk;
      try {
        if (typeof chunk === 'string') {
          parsedChunk = JSON.parse(chunk);
        } else {
          parsedChunk = { event: "non_string", data: { type: typeof chunk } };
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`Error parsing chunk: ${errorMessage}`);
        // For non-JSON data, create an ad-hoc event structure
        if (typeof chunk === 'string') {
          if (chunk.includes('Echoing input:')) {
            parsedChunk = { 
              event: "tool_output", 
              data: { message: chunk.trim() } 
            };
          } else {
            parsedChunk = { 
              event: "parse_error", 
              data: { raw: chunk.substring(0, 50) } 
            };
          }
        } else {
          parsedChunk = { 
            event: "unknown_type", 
            data: { type: typeof chunk } 
          };
        }
      }
      
      // Log and store the chunk
      console.log(`[${parsedChunk.event || 'unknown'}] ${JSON.stringify(parsedChunk.data || {})}...`);
      chunks.push(parsedChunk);
      
      // Check for end event or errors
      if (parsedChunk.event === 'on_chain_end') {
        endTriggered = true;
        console.log('✅ Detected on_chain_end event!');
      }
      
      // Capture output content if available
      if (parsedChunk.event === 'on_chat_model_stream' && parsedChunk.data?.chunk) {
        content += parsedChunk.data.chunk;
      }
    }
    
    console.log('-------------');
    console.log(`🔢 Received ${chunks.length} chunks (${streamCount} from stream)`);
    
    // Validate results with more info on failure
    if (streamCount === 0) {
      console.log('\n❌ Stream test failed: No chunks received from stream');
      return { success: false, chunks, content, reason: 'no_chunks' };
    }
    
    // Consider success if we got content back, even without a formal on_chain_end event
    if (content) {
      console.log(`\n✅ Final content: "${content}"`);
      return { success: true, chunks, content };
    }
    
    // Check if we have raw JSON response with messages from the agent
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && typeof lastChunk.data === 'string') {
      try {
        const jsonData = JSON.parse(lastChunk.data);
        if (jsonData.agent && jsonData.agent.messages && jsonData.agent.messages.length > 0) {
          console.log('\n✅ Detected valid agent response with messages');
          return { success: true, chunks, content: 'JSON response with agent messages' };
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    // If no content and no end event, then we fail
    if (!endTriggered) {
      console.log('\n❌ Stream test failed: No end event received and no content generated');
      const events = chunks.map(c => c.event || 'unknown').join(', ');
      console.log(`Events received: ${events}`);
      return { success: false, chunks, content, reason: 'no_content_or_end', events };
    }
  } catch (error) {
    // Handle error safely, ensuring error is treated as any type
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Stream test failed with exception: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return { success: false, error: errorMessage };
  }
}

// Run the test and output results
runStreamTest()
  .then(result => {
    if (result && result.success) {
      console.log('\n✅ Streaming test successful!');
      process.exit(0);
    } else {
      console.log(`\n❌ Streaming test failed: ${result?.error || 'Unknown error'}`);
      process.exit(1);
    }
  })
  .catch(error => {
    // Handle error safely, ensuring error is treated as any type
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Unexpected error in test:', errorMessage);
    process.exit(1);
  }); 