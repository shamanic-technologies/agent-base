/**
 * Chat Service
 * Handles API interactions for both regular and streaming chat requests
 */

import { callAgentBase, streamAgentBase } from "../client-api";
import { Message } from "./types";

/**
 * Sends a regular (non-streaming) chat request to the API
 * @param prompt The user's prompt message
 * @param threadId The conversation thread ID
 * @returns The formatted AI response message
 */
export async function sendRegularChatRequest(
  prompt: string, 
  threadId: string
): Promise<Message> {
  try {
    // Make the API call with the correct parameters, including thread_id
    const response = await callAgentBase(
      '/api/generate', 
      'POST', 
      { 
        prompt,
        thread_id: threadId
      }
    );
    
    console.log("API Response:", response);
    
    // Process the response to extract text
    let formattedContent = "I processed your request.";
    let toolsUsed = [];
    
    // Process messages from the response
    if (Array.isArray(response.messages) && response.messages.length > 0) {
      // Skip the first message (usually the user input)
      // Only process the most recent AI message
      const userMessages = response.messages.filter((m: any) => m.type === 'constructor' && 
          m.id && Array.isArray(m.id) && m.id[2] === 'HumanMessage');
      
      const aiMessages = response.messages.filter((m: any) => m.type === 'constructor' && 
          m.id && Array.isArray(m.id) && (m.id[2] === 'AIMessageChunk' || m.id[2] === 'AIMessage'));
      
      // Process only the last AI message (most recent response)
      const lastAiMessage = aiMessages.length > 0 ? [aiMessages[aiMessages.length - 1]] : [];
      
      let contentParts = [];
      
      for (const message of lastAiMessage) {
        console.log("Processing message type:", message.type);
        
        // Handle AI assistant messages (LangChain format)
        if (message.type === 'constructor' && message.id && Array.isArray(message.id) && 
            (message.id[2] === 'AIMessageChunk' || message.id[2] === 'AIMessage')) {
          
          // Handle content field which can be string or array
          if (message.kwargs?.content) {
            if (typeof message.kwargs.content === 'string') {
              contentParts.push(message.kwargs.content);
            } else if (Array.isArray(message.kwargs.content)) {
              // Extract text content from array
              const textItems = message.kwargs.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text);
              
              if (textItems.length > 0) {
                contentParts.push(textItems.join('\n'));
              }
              
              // Handle tool calls
              const toolUseItems = message.kwargs.content
                .filter((item: any) => item.type === 'tool_use');
              
              for (const toolItem of toolUseItems) {
                const toolName = toolItem.name || 'unknown tool';
                contentParts.push(`[Starting tool: ${toolName}]`);
                toolsUsed.push(toolName);
              }
            }
          }
        }
      }
      
      // Separately process tool messages that might be related to this exchange
      const toolMessages = response.messages.filter((m: any) => m.type === 'constructor' && 
          m.id && Array.isArray(m.id) && m.id[2] === 'ToolMessage');
      
      // We'll take the last tool messages since the first user message
      const latestToolMessages = toolMessages.length > userMessages.length 
          ? toolMessages.slice(-(toolMessages.length - userMessages.length + 1)) 
          : toolMessages;
          
      for (const message of latestToolMessages) {
        const toolName = message.kwargs?.name || 'unknown tool';
        const toolContent = message.kwargs?.content || '';
        
        contentParts.push(`[Tool Result: ${toolName}]\n${toolContent}`);
      }
      
      if (contentParts.length > 0) {
        formattedContent = contentParts.join('\n\n');
      }
    }
    
    // Return the AI message
    return {
      id: Date.now().toString(),
      type: 'ai',
      text: formattedContent.trim(),
      rawResponse: response, // Store the direct response for debugging
      createdAt: new Date()
    };
    
  } catch (error: any) {
    console.error('API error:', error);
    
    // Return error message
    return {
      id: Date.now().toString(),
      type: 'ai',
      text: `Error: ${error.message || 'An error occurred'}`,
      rawResponse: { error: error.message || 'Unknown error' },
      createdAt: new Date()
    };
  }
}

/**
 * Starts a streaming chat session with the API
 * @param prompt The user's prompt message
 * @param threadId The conversation thread ID
 * @param onChunk Callback function for handling stream chunks
 * @param onComplete Callback function when streaming completes
 * @param onError Callback function for stream errors
 * @returns Cleanup function for stream
 */
export function startStreamingChatSession(
  prompt: string,
  threadId: string,
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: any) => void
) {
  return streamAgentBase(
    '/api/generate/stream',
    {
      prompt: prompt.trim(),
      thread_id: threadId,
      stream_modes: ["messages", "events"]
    },
    onChunk,
    onComplete,
    onError
  );
}

/**
 * Process text from streaming chunks
 * @param chunk The stream chunk to process
 * @param accumulatedText Current accumulated text
 * @returns Updated text after processing this chunk
 */
export function processStreamChunk(chunk: any, accumulatedText: string): string {
  let updatedText = accumulatedText;
  
  if (chunk.type === "on_chat_model_stream") {
    // Regular text output from the model
    if (chunk.data?.chunk?.content) {
      updatedText += chunk.data.chunk.content;
    }
  } 
  // Handle tool-related chunks
  else if (chunk.type === "on_tool_start" || chunk.type === "on_tool_end") {
    const toolName = chunk.data?.name || "unknown";
    
    if (chunk.type === "on_tool_start") {
      updatedText += `\n[Starting tool: ${toolName}]\n`;
    } else if (chunk.type === "on_tool_end") {
      const result = chunk.data?.output || "";
      let formattedResult = typeof result === 'object' ? 
        JSON.stringify(result, null, 2) : String(result);
      
      updatedText += `\n[Tool Result: ${toolName}]\n${formattedResult}\n`;
    }
  }
  // Handle error chunks
  else if (chunk.type === "error") {
    updatedText += `\n[Error: ${chunk.data?.error || "Unknown error"}]\n`;
  }
  
  return updatedText;
} 