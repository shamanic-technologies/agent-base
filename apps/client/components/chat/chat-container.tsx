"use client";

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageItem } from './message-item';
import { ChatHeader } from './chat-header';
import { ChatInput } from './chat-input';
import { DebugPanel } from './debug-panel';
import { Message } from '@/lib/chat/types';
import { sendRegularChatRequest, startStreamingChatSession, processStreamChunk } from '@/lib/chat/service';

/**
 * Chat Container Component
 * Main component that combines all chat UI elements and handles chat logic
 */
export function ChatContainer() {
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
  // Thread ID to maintain conversation context
  const [threadId, setThreadId] = useState<string>(`thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useStreaming, setUseStreaming] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);
  const [streamChunks, setStreamChunks] = useState<any[]>([]);
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
      
      // Process the chunk and update accumulated text
      accumulatedText = processStreamChunk(chunk, accumulatedText);
      
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
      const cleanup = startStreamingChatSession(
        prompt.trim(),
        threadId,
        handleChunk,
        () => {
          // On complete
          setIsLoading(false);
          
          // Add the final message to the chat history
          if (currentStreamingMessage && accumulatedText) {
            const finalMessage: Message = {
              ...currentStreamingMessage,
              text: accumulatedText,
              chunks: streamChunks
            };
            
            setMessages(prev => [...prev, finalMessage]);
          }
          
          setCurrentStreamingMessage(null);
        },
        (error) => {
          // On error
          setIsLoading(false);
          setCurrentStreamingMessage(null);
          
          // Add error message to chat
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
    } catch (error: any) {
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
      
      setMessages(prev => [...prev, userMessage]);
      setPrompt('');
      setIsLoading(true);
      
      // Call the regular API
      try {
        const aiMessage = await sendRegularChatRequest(prompt.trim(), threadId);
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error("API error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <ChatHeader
        resetConversation={resetConversation}
        toggleStreaming={toggleStreaming}
        toggleDebugPanel={toggleDebugPanel}
        useStreaming={useStreaming}
        showDebugPanel={showDebugPanel}
      />
      
      <div className="flex-1 overflow-hidden relative flex">
        {/* Main chat area */}
        <div className={cn("flex-1 relative", showDebugPanel && "border-r")}>
          <ScrollArea className="h-full absolute inset-0">
            <div className="flex flex-col gap-4 p-4 pb-20">
              {/* Render all messages */}
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                />
              ))}
              
              {/* Currently streaming message */}
              {currentStreamingMessage && (
                <MessageItem
                  message={currentStreamingMessage}
                  isLoading={true}
                />
              )}
              
              {/* Loading indicator (only shown for non-streaming mode) */}
              {isLoading && !currentStreamingMessage && (
                <div className="flex items-start gap-3 pb-4">
                  <div className="flex flex-col max-w-[75%] rounded-md px-4 py-3 bg-muted text-foreground text-sm ml-10">
                    <span className="text-xs mb-1 opacity-70">AI is thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>
        </div>
        
        {/* Debug panel */}
        {showDebugPanel && (
          <DebugPanel
            messages={messages}
            threadId={threadId}
            streamChunks={streamChunks}
            currentStreamingMessage={currentStreamingMessage}
            onClose={toggleDebugPanel}
          />
        )}
      </div>
      
      {/* Message Input Form */}
      <ChatInput
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
} 