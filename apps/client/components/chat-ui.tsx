"use client";

import { useState, FormEvent, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "./ui/utils";
import { MessageSquare, Bot, Send, RefreshCw } from "lucide-react";
import { callAgentBase } from "../lib/client-api";

// Define types for chat messages
type MessageType = 'user' | 'ai';

interface Message {
  id: string;
  type: MessageType;
  text: string;
}

/**
 * Modern Chat UI Component
 * A sleek chat interface with avatars, improved message styling and animations
 * Uses secure server-side API key handling
 */
export function ChatUI() {
  // State for messages
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hello! I am a HelloWorld AI agent. How can I help you today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      return;
    }
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: prompt
    };
    
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    
    try {
      // Call the API with the user's prompt using our secure client
      const response = await callAgentBase('/api/generate', 'POST', { 
        prompt: prompt.trim() 
      });
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.generated_text || 'I processed your request.'
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      // Add error message to chat
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Error: ${error.message || 'An error occurred'}`
      };
      
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex-none flex items-center justify-between border-b px-6 py-3 h-16">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">HelloWorld AI Client</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Using secure server-side API authentication
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden relative">
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
                    "flex flex-col max-w-[75%] rounded-md px-4 py-3 text-sm",
                    message.type === "user" ? 
                      "bg-primary text-primary-foreground" : 
                      "bg-muted text-foreground"
                  )}
                >
                  <span className="text-xs mb-1 opacity-70">
                    {message.type === "user" ? "You" : "AI"}
                  </span>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
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
      
      <form onSubmit={handleSubmit} className="flex-none flex gap-2 p-4 absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 border-t">
        <Input
          placeholder="Type your message..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </form>
    </div>
  );
} 