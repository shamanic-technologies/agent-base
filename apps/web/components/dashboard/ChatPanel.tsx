/**
 * Chat Panel Component
 * 
 * Displays a chat interface for interacting with AI agents
 */
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, ForwardRefRenderFunction } from 'react';
import { Card } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { MessageItem } from './MessageItem';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { DebugPanel } from './DebugPanel';
import { cn } from '../../lib/utils';
import { Message } from '../../lib/chat/types';
import * as chatService from '../../services/chatService';

export interface ChatPanelRef {
  sendMessage: (message: string) => void;
}

interface ChatPanelProps {
  apiKey?: string;
}

/**
 * Chat panel component for interacting with AI agents
 */
const ChatPanelComponent: ForwardRefRenderFunction<ChatPanelRef, ChatPanelProps> = (props, ref) => {
  const { apiKey } = props;
  
  // Thread ID to maintain conversation context
  const [threadId, setThreadId] = useState<string>(`thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  
  // Message state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hello! I\'m your AI assistant. How can I help you today?',
      createdAt: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Streaming state
  const [useStreaming, setUseStreaming] = useState<boolean>(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);
  const [streamChunks, setStreamChunks] = useState<any[]>([]);
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (message: string) => {
      handleExternalMessage(message);
    }
  }));

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      text: 'Hello! I\'m your AI assistant. How can I help you today?',
      createdAt: new Date()
    }]);
    setCurrentStreamingMessage(null);
    setStreamChunks([]);
    setInput('');
    setError(null);
    
    console.log(`Started new conversation with thread ID: ${newThreadId}`);
  };

  // Handle external messages (like from tool test buttons)
  const handleExternalMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: message,
      createdAt: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        throw new Error("API key is not configured");
      }
      
      // Get response from service
      const aiMessage = await chatService.sendChatMessage(message, apiKey, threadId);
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error handling external message:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      createdAt: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        throw new Error("API key is not configured");
      }
      
      // Get response from service
      const aiMessage = await chatService.sendChatMessage(input, apiKey, threadId);
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
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
          <ScrollArea className="h-full">
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
              
              {/* Loading indicator */}
              {isLoading && !currentStreamingMessage && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-800">
                    <div className="animate-pulse flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-lg bg-red-50 text-red-800 text-sm">
                    {error}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && (
          <div className="w-1/3 border-l">
            <DebugPanel 
              debugData={{
                thread_id: threadId,
                streaming_active: useStreaming && !!currentStreamingMessage,
                current_streaming_chunks: streamChunks,
                current_text: currentStreamingMessage?.text || "",
                message_history: messages.map(m => ({
                  id: m.id,
                  type: m.type,
                  text: m.text,
                  timestamp: m.createdAt.toISOString(),
                  raw: m.rawResponse
                }))
              }}
            />
          </div>
        )}
      </div>
      
      <div className="border-t p-4 bg-background">
        <ChatInput 
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
};

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(ChatPanelComponent);
ChatPanel.displayName = 'ChatPanel'; 