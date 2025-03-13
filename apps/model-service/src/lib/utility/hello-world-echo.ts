/**
 * HelloWorld Echo Tool
 * 
 * A simple tool that echoes back the user's input with formatting.
 * This serves as an example of a basic LangChain tool implementation.
 */

import { Tool } from "@langchain/core/tools";

/**
 * A HelloWorld echo tool that simply returns the input with additional formatting
 * Demonstrates another simple tool implementation pattern
 */
export class HelloWorldEchoTool extends Tool {
  name = "hello_world_echo";
  description = "Echoes back the input text with some formatting";
  
  async _call(input: string): Promise<string> {
    console.log(`Echoing input: ${input}`);
    try {
      // Validate input
      if (!input || input.trim() === "") {
        return "You didn't provide any text to echo!";
      }
      
      // Format and return the input
      const formattedOutput = `🔊 ECHO: "${input.trim()}" 🔊`;
      return formattedOutput;
    } catch (error) {
      console.error("Error in HelloWorldEchoTool:", error);
      return `I encountered an error while echoing your text: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 