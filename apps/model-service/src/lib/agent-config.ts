/**
 * Agent Configuration Types
 * 
 * This file contains type definitions for configuring agents.
 * These types help standardize how agents are configured across the application.
 */

import { Tool } from "@langchain/core/tools";

/**
 * Model provider configuration options
 */
export type ModelProviderConfig = {
  modelName: string;
  apiKey: string;
  temperature: number;
  maxTokens?: number;
  modelParams?: Record<string, any>;
};

/**
 * Tool configuration
 */
export type ToolConfig = {
  tool: Tool;
  enabled?: boolean;
};

/**
 * Agent configuration type
 */
export type AgentConfig = {
  modelConfig: ModelProviderConfig;
  tools: ToolConfig[];
  systemPrompt: string;
  callbacks?: {
    onStart?: (input: string) => void;
    onComplete?: (result: any) => void;
    onError?: (error: Error) => void;
  };
  timeout?: number;
  verbose?: boolean;
  requestIdPrefix?: string;
}; 