/**
 * Claude ReAct Agent Implementation
 * 
 * This file implements a ReAct agent using Anthropic Claude.
 * Uses the AgentConfig and utility tools for a clean implementation.
 */

// Import required dependencies
import { Tool } from "@langchain/core/tools";
import { HelloWorldGreetingTool, HelloWorldEchoTool } from '../utility';
import { AgentConfig, createAgent } from '../../';

// Model configuration
const CLAUDE_MODEL_NAME = "claude-3-7-sonnet-20250219";

/**
 * Process a user prompt with the Claude ReAct agent
 */
export async function processWithReActAgent(prompt: string) {
  // Create agent configuration
  const agentConfig: AgentConfig = {
    modelConfig: {
      modelName: CLAUDE_MODEL_NAME,
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      temperature: 0,
    },
    tools: [
      { tool: new HelloWorldGreetingTool() },
      { tool: new HelloWorldEchoTool() }
    ],
    systemPrompt: `You are a helpful AI assistant that follows the ReAct framework.
For each request, think through the problem step by step.
Break down complex requests into smaller parts.
When using tools, consider which tool is appropriate, what input it needs, and how to interpret its output.`,
    verbose: process.env.NODE_ENV !== 'production'
  };
  
  // Create and use the agent processor
  const processInput = createAgent(agentConfig);
  return processInput(prompt);
} 