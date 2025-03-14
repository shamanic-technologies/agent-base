/**
 * Test script for the ReAct agent implementation
 * 
 * This script tests the ReAct agent directly without starting the Express server.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage } = require('@langchain/core/messages');
const { DynamicTool } = require('@langchain/core/tools');

/**
 * Formats AI message content for display
 * @param {any} content - The content to format
 * @returns {string} - Formatted string
 */
function formatMessageContent(content) {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    // Handle array of content blocks (Claude format)
    return content
      .filter(block => block && typeof block === 'object' && block.type === 'text')
      .map(block => block.text)
      .join('\n');
  } else {
    // Fallback for unexpected formats
    return JSON.stringify(content);
  }
}

async function runTest() {
  try {
    console.log("🧪 Testing ReAct Agent directly...");
    
    // Create a model - no API key needed, will try to use from environment
    const model = new ChatAnthropic({
      modelName: "claude-3-7-sonnet-20250219",
      temperature: 0
    });
    
    // Create a properly structured echo tool using DynamicTool
    const echoTool = new DynamicTool({
      name: "echo",
      description: "Echoes back the input provided by the user",
      func: async (input) => {
        console.log(`Echo tool called with: ${input}`);
        return `Echoing: ${input}`;
      }
    });
    
    // Create tools array with just one tool
    const tools = [echoTool];
    
    // Create agent using the prebuilt ReAct agent creator
    const agent = createReactAgent({
      llm: model,
      tools
    });
    
    // Create a test prompt
    const testPrompt = "Hello, can you echo this message back to me?";
    console.log(`🔤 Testing with prompt: "${testPrompt}"`);
    
    // Create a human message from the prompt
    const message = new HumanMessage(testPrompt);
    
    // Invoke the agent
    console.log("⏳ Invoking agent...");
    const result = await agent.invoke({ messages: [message] });
    
    // Check if we have a valid result with messages
    if (!result || !result.messages || !result.messages.length) {
      throw new Error("No valid response from agent");
    }
    
    // Get the last message from the result
    const lastMessage = result.messages[result.messages.length - 1];
    
    // Format the content for display
    const formattedContent = formatMessageContent(lastMessage.content);
    
    console.log("\n✅ Agent response:");
    console.log(formattedContent);
    
    return {
      success: true,
      response: formattedContent
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error testing ReAct agent:", errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Run the test
runTest().then(result => {
  if (result && result.success) {
    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  } else {
    console.log("\n❌ Test failed:", result?.error || "Unknown error");
    process.exit(1);
  }
}); 