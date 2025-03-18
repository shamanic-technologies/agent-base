/**
 * Chat Service
 * Handles interactions with the API gateway service for chat functionality
 */
import { Message } from "../lib/chat/types";
import * as apiGatewayService from "./apiGatewayService";

/**
 * Sends a message to the API gateway service and formats the response
 * 
 * @param prompt User's message
 * @param apiKey API key for authentication
 * @param threadId Thread ID for conversation context
 * @returns Formatted AI response message
 */
export async function sendChatMessage(
  prompt: string,
  apiKey: string,
  threadId: string = `thread-${Date.now()}`
): Promise<Message> {
  try {
    // Request body with thread ID for context
    const requestBody = {
      prompt,
      thread_id: threadId
    };

    // Get response from the API gateway service
    const response = await apiGatewayService.sendMessage(prompt, apiKey, threadId);
    
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