"use client";

import { useState, FormEvent, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "./ui/utils";
import { MessageSquare, Bot, Send, RefreshCw, Code, X, Sparkles, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Loader2, SendHorizontal } from "lucide-react";
import { callAgentBase, streamAgentBase } from "../lib/client-api";

// Define types for chat messages
type MessageType = 'user' | 'ai';

interface Message {
  id: string;
  type: MessageType;
  text: string;
  rawResponse?: any; // Store the raw response for debug panel
  chunks?: any[]; // Store stream chunks for debug panel
  createdAt: Date;
}

/**
 * Modern Chat UI Component
 * A sleek chat interface with avatars, improved message styling and animations
 * Uses secure server-side API key handling
 * Supports both regular and streaming API calls with debug panel
 */
export function ChatUI() {
  // State for messages and UI
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hello! I am a HelloWorld AI agent. How can I help you today?',
      createdAt: new Date()
    }
  ]);
  // Add thread_id state to maintain conversation context
  const [threadId, setThreadId] = useState<string>(`thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useStreaming, setUseStreaming] = useState<boolean>(false); // Default to regular mode instead of streaming
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);
  const [streamChunks, setStreamChunks] = useState<any[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<{[key: string]: boolean}>({});
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamingMessage]);

  // Toggle debug panel
  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };

  // Toggle streaming mode
  const toggleStreaming = () => {
    setUseStreaming(!useStreaming);
  };

  // Reset conversation to start fresh
  const resetConversation = () => {
    // Generate a new thread ID
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Reset the conversation state
    setThreadId(newThreadId);
    setMessages([{
      id: '1',
      type: 'ai',
      text: 'Hello! I am a HelloWorld AI agent. How can I help you today?',
      createdAt: new Date()
    }]);
    setCurrentStreamingMessage(null);
    setStreamChunks([]);
    setPrompt('');
    
    console.log(`Started new conversation with thread ID: ${newThreadId}`);
  };

  // Toggle message expansion in debug panel
  const toggleMessageExpansion = (id: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Get all debug data for display
  const getAllDebugData = () => {
    return {
      thread_id: threadId,
      streaming_active: !!currentStreamingMessage,
      current_streaming_chunks: streamChunks,
      current_text: currentStreamingMessage?.text || "",
      message_history: messages
        .filter(msg => msg.type === 'ai' && (msg.rawResponse || msg.chunks))
        .map(msg => {
          if (msg.chunks && msg.chunks.length > 0) {
            return {
              message_id: msg.id,
              text: msg.text,
              raw_chunks: msg.chunks
            };
          }
          
          if (msg.rawResponse) {
            return {
              message_id: msg.id,
              text: msg.text,
              raw_response: msg.rawResponse
            };
          }
          
          return {
            message_id: msg.id,
            text: msg.text
          };
        })
    };
  };

  // Handle regular (non-streaming) API call
  const handleRegularSubmit = async (userPrompt: string) => {
    try {
      // Make the API call with the correct parameters, including thread_id
      const response = await callAgentBase(
        '/api/generate', 
        'POST', 
        { 
          prompt: userPrompt,
          thread_id: threadId // Pass thread_id to maintain conversation context
        }
      );
      
      console.log("API Response:", response);
      
      // Process the response to extract text
      let formattedContent = "I processed your request.";
      let toolsUsed = [];
      
      // Process messages from the response
      if (Array.isArray(response.messages) && response.messages.length > 0) {
        // Skip the first message (usually the user input)
        // Only process the most recent AI message instead of all AI messages
        // This prevents duplicate content from previous messages
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
      
      // Add AI message to the chat
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        text: formattedContent.trim(),
        rawResponse: response, // Store the direct response for debugging
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto select this message in debug panel if enabled
      if (showDebugPanel) {
        setSelectedMessageId(aiMessage.id);
      }
      
    } catch (error: any) {
      console.error('API error:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        text: `Error: ${error.message || 'An error occurred'}`,
        rawResponse: { error: error.message || 'Unknown error' },
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle streaming API call
  const handleStreamingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: prompt,
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    // Initialize a streaming message
    const streamingMsgId = (Date.now() + 1).toString();
    const initialStreamingMessage: Message = {
      id: streamingMsgId,
      type: "ai",
      text: "",
      chunks: [],
      createdAt: new Date(),
    };

    setCurrentStreamingMessage(initialStreamingMessage);
    setStreamChunks([]);
    
    // Track accumulated text from stream chunks
    let accumulatedText = "";

    // Handle individual stream chunks 
    const handleChunk = (chunk: any) => {
      const timestamp = new Date().toISOString();
      
      // Track chunks for debug panel
      setStreamChunks(prev => [...prev, {
        index: prev.length,
        timestamp,
        data: chunk
      }]);
      
      // Update the text based on chunk type
      if (chunk.type === "on_chat_model_stream") {
        // Regular text output from the model
        if (chunk.data?.chunk?.content) {
          accumulatedText += chunk.data.chunk.content;
        }
      } 
      // Handle tool-related chunks
      else if (chunk.type === "on_tool_start" || chunk.type === "on_tool_end") {
        const toolName = chunk.data?.name || "unknown";
        
        if (chunk.type === "on_tool_start") {
          accumulatedText += `\n[Starting tool: ${toolName}]\n`;
        } else if (chunk.type === "on_tool_end") {
          const result = chunk.data?.output || "";
          let formattedResult = typeof result === 'object' ? 
            JSON.stringify(result, null, 2) : String(result);
          
          accumulatedText += `\n[Tool Result: ${toolName}]\n${formattedResult}\n`;
        }
      }
      // Handle error chunks
      else if (chunk.type === "error") {
        accumulatedText += `\n[Error: ${chunk.data?.error || "Unknown error"}]\n`;
      }
      
      // Update the streaming message with the new text
      setCurrentStreamingMessage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          text: accumulatedText,
          chunks: [...(prev.chunks || []), chunk]
        };
      });
    };

    try {
      // Start streaming with thread_id for conversation context
      const cleanup = streamAgentBase(
        '/api/generate/stream',
        {
          prompt: prompt.trim(),
          thread_id: threadId, // Pass thread_id to maintain conversation context
          stream_modes: ["messages", "events"]
        },
        handleChunk,
        () => {
          setIsLoading(false);
          setCurrentStreamingMessage(null);
        },
        (error) => {
          setIsLoading(false);
          setCurrentStreamingMessage(null);
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "ai",
              text: `An error occurred: ${error.message}`,
              createdAt: new Date(),
            },
          ]);
        }
      );

      // Finalizing the streaming process
      if (currentStreamingMessage) {
        setMessages(prev => [...prev, { 
          ...currentStreamingMessage, 
          text: accumulatedText || "I processed your request.",
          chunks: streamChunks 
        }]);
      }
    } catch (error) {
      console.error("Streaming error:", error);
      
      // Add an error message to the chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "ai",
          text: `An error occurred while processing your request: ${error}`,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessage(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) {
      return;
    }
    
    // Use either streaming or regular API based on setting
    if (useStreaming) {
      await handleStreamingSubmit(e);
    } else {
      // Add user message to chat first for regular mode
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        text: prompt,
        createdAt: new Date(),
      };
      
      setMessages([...messages, userMessage]);
      setPrompt('');
      setIsLoading(true);
      
      await handleRegularSubmit(prompt.trim());
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex-none flex items-center justify-between border-b px-6 py-3 h-16">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">HelloWorld AI Client</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={resetConversation}
            title="Start a new conversation with a fresh thread ID"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            New Conversation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStreaming}
            title={useStreaming ? "Switch to regular API mode" : "Switch to streaming API mode"}
            className="flex items-center gap-1"
          >
            <Sparkles className="h-4 w-4" />
            {useStreaming ? (
              <>
                <span>Streaming</span>
                <ToggleRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                <span>Regular</span>
                <ToggleLeft className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
          <Button 
            variant={showDebugPanel ? "default" : "outline"} 
            size="sm" 
            onClick={toggleDebugPanel}
            title="Toggle Debug Panel"
          >
            <Code className="h-4 w-4 mr-2" />
            {showDebugPanel ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden relative flex">
        {/* Main chat area */}
        <div className={cn("flex-1 relative", showDebugPanel && "border-r")}>
          <ScrollArea className="h-full absolute inset-0">
            <div className="flex flex-col gap-4 p-4 pb-20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3 pb-4",
                    message.type === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar className={message.type === "user" ? "bg-primary" : "bg-muted"}>
                    {message.type === "user" ? (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <MessageSquare className="h-4 w-4" />
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div 
                    className={cn(
                      "flex flex-col max-w-[75%] rounded-md px-4 py-3 text-sm relative group",
                      message.type === "user" ? 
                        "bg-primary text-primary-foreground" : 
                        "bg-muted text-foreground"
                    )}
                  >
                    <span className="text-xs mb-1 opacity-70">
                      {message.type === "user" ? "You" : "AI"}
                    </span>
                    <div className="whitespace-pre-wrap">
                      {message.text.split('\n').map((line, i) => {
                        if (line.startsWith('[Using tool:') || line.startsWith('[Starting tool:')) {
                          return <div key={i} className="text-blue-600 dark:text-blue-400 italic my-1">{line}</div>;
                        } else if (line.startsWith('[Tool Result:')) {
                          return <div key={i} className="text-green-600 dark:text-green-400 italic my-1">{line}</div>;
                        } else {
                          return <div key={i}>{line}</div>;
                        }
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Currently streaming message */}
              {currentStreamingMessage && (
                <div
                  className="flex items-start gap-3 pb-4"
                >
                  <Avatar className="bg-muted">
                    <AvatarFallback className="bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={cn(
                      "flex flex-col max-w-[75%] rounded-md px-4 py-3 text-sm relative group",
                      "bg-muted text-foreground"
                    )}
                  >
                    <span className="text-xs mb-1 opacity-70 flex items-center gap-2">
                      AI <RefreshCw className="h-3 w-3 animate-spin" />
                    </span>
                    <p className="whitespace-pre-wrap">{currentStreamingMessage.text || 'Thinking...'}</p>
                  </div>
                </div>
              )}
              
              {/* Loading indicator (only shown for non-streaming mode) */}
              {isLoading && !currentStreamingMessage && (
                <div className="flex items-start gap-3 pb-4">
                  <Avatar className="bg-muted">
                    <AvatarFallback className="bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col max-w-[75%] rounded-md px-4 py-3 bg-muted text-foreground text-sm">
                    <span className="text-xs mb-1 opacity-70">AI</span>
                    <div className="flex gap-2 items-center">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <p>Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>
        </div>
        
        {/* Debug panel */}
        {showDebugPanel && (
          <div className="w-2/5 relative border-l bg-gray-50 dark:bg-gray-900">
            <div className="absolute top-2 right-2 z-10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleDebugPanel}
                title="Close Debug Panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-full">
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-2">Debug Panel - Raw Data</h3>
                
                {/* Thread ID indicator */}
                <div className="text-xs mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <span className="font-semibold">Current Thread ID:</span> {threadId}
                </div>
                
                {/* Streaming status indicator */}
                {currentStreamingMessage && (
                  <div className="text-xs mb-2 text-blue-500 font-semibold">
                    Live Streaming Active - {streamChunks.length} chunks received
                  </div>
                )}
                
                {/* Current streaming chunks */}
                {currentStreamingMessage && streamChunks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold mb-1">Live Stream Chunks:</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto whitespace-pre-wrap max-h-[calc(100vh-400px)]">
                      {JSON.stringify(streamChunks, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Message history with raw responses */}
                <div>
                  <h4 className="text-xs font-semibold mb-1">Message History:</h4>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    {messages
                      .filter(msg => msg.type === 'ai' && (msg.rawResponse || msg.chunks))
                      .map(msg => (
                        <div key={msg.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div 
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={() => toggleMessageExpansion(msg.id)}
                          >
                            <div className="flex items-center">
                              {expandedMessages[msg.id] ? (
                                <ChevronDown className="h-3 w-3 mr-1" />
                              ) : (
                                <ChevronRight className="h-3 w-3 mr-1" />
                              )}
                              <span className="text-xs font-medium mr-2">Message {msg.id}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {msg.rawResponse ? 'Regular Response' : 'Stream Chunks'} 
                                {msg.chunks && ` (${msg.chunks.length} chunks)`}
                              </span>
                            </div>
                          </div>
                          
                          {expandedMessages[msg.id] && (
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 text-xs">
                              <div className="mb-2">
                                <span className="font-semibold">Text:</span> {msg.text}
                              </div>
                              
                              {msg.rawResponse && (
                                <div>
                                  <h5 className="font-semibold text-xs mb-2">Raw Response:</h5>
                                  {msg.rawResponse.messages && (
                                    <div className="mb-2">
                                      <h6 className="text-xs font-medium mb-1">Messages ({msg.rawResponse.messages.length}):</h6>
                                      {msg.rawResponse.messages.map((message: any, idx: number) => (
                                        <div key={idx} className="mb-2 border-l-2 border-gray-300 pl-2">
                                          <div className="text-xs mb-1">
                                            <span className="font-medium">Type:</span> {message.type || 'unknown'}
                                            {message.kwargs?.additional_kwargs?.role && (
                                              <span className="ml-2 text-blue-500">
                                                Role: {message.kwargs.additional_kwargs.role}
                                              </span>
                                            )}
                                          </div>
                                          {message.kwargs?.content && (
                                            <div className="mt-1">
                                              <div className="text-xs font-medium">Content:</div>
                                              {typeof message.kwargs.content === 'string' ? (
                                                <div className="text-xs pl-2 break-words">{message.kwargs.content}</div>
                                              ) : Array.isArray(message.kwargs.content) ? (
                                                <div>
                                                  {message.kwargs.content.map((item: any, contentIdx: number) => (
                                                    <div key={contentIdx} className="text-xs pl-2 mt-1">
                                                      <span className="font-medium">{item.type || 'item'}:</span> {' '}
                                                      {item.text || JSON.stringify(item)}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-xs pl-2">{JSON.stringify(message.kwargs.content)}</div>
                                              )}
                                            </div>
                                          )}
                                          {message.kwargs?.tool_calls && message.kwargs.tool_calls.length > 0 && (
                                            <div className="mt-1">
                                              <div className="text-xs font-medium">Tool Calls:</div>
                                              {message.kwargs.tool_calls.map((tool: any, toolIdx: number) => (
                                                <div key={toolIdx} className="text-xs pl-2">
                                                  <span className="font-medium">{tool.name}:</span> {JSON.stringify(tool.args)}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md overflow-auto whitespace-pre-wrap max-h-[300px] text-xs">
                                    {JSON.stringify(msg.rawResponse, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {msg.chunks && msg.chunks.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-xs mb-2">Stream Chunks ({msg.chunks.length}):</h5>
                                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md overflow-auto whitespace-pre-wrap max-h-[300px] text-xs">
                                    {JSON.stringify(msg.chunks, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      
      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !prompt.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
} 