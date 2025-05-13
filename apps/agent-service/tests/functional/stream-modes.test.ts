/**
 * Test All Streaming Agent Modes
 * 
 * Script to test all possible streaming modes of the LangGraph agent implementation
 * displaying parsed JSON chunks for comparison.
 */

import { HumanMessage } from "@langchain/core/messages";
import { UtilityListUtilities, UtilityGetUtilityInfo, UtilityCallUtility } from "../../src/lib/utility";
import { createReactAgentWrapper } from "../../src/lib/react-agent";
import { StreamMode } from "@langchain/langgraph";
import * as dotenv from "dotenv";
import { NodeId, NodeType, ReactAgentWrapperConfig } from "../../src/types/agent-config";

// Load environment variables from .env file
dotenv.config({ path: '.env' });

// All available stream modes to test
const ALL_STREAM_MODES: StreamMode[] = [
  'messages',
  'debug',
  'values',
  'updates',
  'custom'
];

/**
 * Test each streaming mode individually and a combined mode
 */
async function testAllStreamModes() {
  console.log("STREAMING MODES COMPARISON TEST\n");
  console.log("This test will demonstrate the output format for each stream mode\n");
  
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: No ANTHROPIC_API_KEY found in environment variables");
    console.error("Please set the ANTHROPIC_API_KEY environment variable and try again");
    return;
  }
  
  try {

    
    // Create a simple "Hey" message
    const message = new HumanMessage("What time is it?");
    const nodeId = 'agent_react' as NodeId;
    const nodeType = NodeType.AGENT;

    // Test each mode individually
    for (const mode of ALL_STREAM_MODES) {

      const conversationId = `test-stream-${Date.now()}`;
      
      // Create utilities
      const listUtilities = new UtilityListUtilities({
        conversationId: conversationId,
        parentNodeId: nodeId,
        parentNodeType: nodeType
      });
      const getUtilityInfo = new UtilityGetUtilityInfo({
        conversationId: conversationId,
        parentNodeId: nodeId,
        parentNodeType: nodeType
      });
      const callUtility = new UtilityCallUtility({
        conversationId: conversationId,
        parentNodeId: nodeId,
        parentNodeType: nodeType
      });
      
      // Use all utilities
      const tools = [
        listUtilities,
        getUtilityInfo,
        callUtility
      ];

          // Create the real streaming agent
      const { streamAgentFunction } = createReactAgentWrapper({
        tools,
        modelName: "claude-3-7-sonnet-20250219",
        temperature: 0,
        conversationId: conversationId,
        nodeId: nodeId,
        nodeType: nodeType,
        parentNodeId: null,
        parentNodeType: null
      } as ReactAgentWrapperConfig);

      await testSingleMode(mode, streamAgentFunction, message);
      console.log("\n" + "=".repeat(100) + "\n");
    }
   
  } catch (error) {
    console.error("Error calling streaming agent:", error);
  }
}

/**
 * Test a specific streaming mode and show parsed JSON output
 */
async function testSingleMode(mode: StreamMode | StreamMode[], streamAgent: any, message: HumanMessage) {
  const modes = Array.isArray(mode) ? mode : [mode];
  const modeTitle = Array.isArray(mode) ? mode.join(" + ") : mode;
  
  console.log(`\n${"*".repeat(20)} STREAM MODE: ${modeTitle} ${"*".repeat(20)}\n`);
  console.log(`Sending: "Hey" to agent with stream_mode=[${modes.map(m => `"${m}"`).join(", ")}]\n`);
  
  const stream = streamAgent([message], modes);
  
  let chunkCount = 0;
  
  // Process and display all chunks as parsed JSON
  for await (const chunk of stream) {
    chunkCount++;
    try {
      // Parse the JSON chunk
      const parsedChunk = JSON.parse(chunk);
      
      console.log(`--- CHUNK #${chunkCount} (${parsedChunk.event || 'unknown'}) ---`);
      console.log(JSON.stringify(parsedChunk, null, 2));
      console.log("");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error parsing chunk #${chunkCount}: ${errorMessage}`);
      console.log("Raw chunk:", chunk);
    }
  }
  
  console.log(`\n--- Summary for '${modeTitle}' mode ---`);
  console.log(`Total chunks: ${chunkCount}`);
}

// Run the test
testAllStreamModes()
  .then(() => console.log("\nAll stream mode tests completed successfully"))
  .catch((error) => console.error("Test execution error:", error)); 