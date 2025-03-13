/**
 * HelloWorld Greeting Tool
 * 
 * A simple tool that greets users with a friendly message.
 * This serves as an example of a basic LangChain tool implementation.
 */

import { Tool } from "@langchain/core/tools";

/**
 * A simple HelloWorld tool that greets the user
 * Demonstrates basic tool implementation with error handling
 */
export class HelloWorldGreetingTool extends Tool {
  name = "hello_world_greeting";
  description = "Greets the user with a friendly message including their name";
  
  async _call(input: string): Promise<string> {
    console.log(`Greeting user with input: ${input}`);
    try {
      // Validate input
      if (!input || input.trim() === "") {
        return "Hello there! I didn't catch your name, but it's nice to meet you anyway!";
      }
      
      // Process the greeting
      const name = input.trim();
      return `Hello, ${name}! It's wonderful to meet you. I hope you're having a great day!`;
    } catch (error) {
      console.error("Error in HelloWorldGreetingTool:", error);
      return `I encountered an error while trying to greet you: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 