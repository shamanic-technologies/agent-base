import { z } from "zod";


export interface ActionData {
    conversationId: string;
    toolCall: ToolCall;
    toolResult: ToolResult;
}

export interface Action extends ActionData{
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  args: z.ZodObject<any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}