/**
 * Chat Panel Component
 * 
 * Displays a chat interface for interacting with AI agents
 */
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, ForwardRefRenderFunction } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SendHorizontal, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatPanelRef {
  sendMessage: (message: string) => void;
}

interface ChatPanelProps {}

/**
 * Chat panel component for interacting with AI agents
 */
const ChatPanelComponent: ForwardRefRenderFunction<ChatPanelRef, ChatPanelProps> = (props, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (message: string) => {
      handleExternalMessage(message);
    }
  }));

  // Scroll to the bottom of the chat whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle messages sent from external components
  const handleExternalMessage = (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: message
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Simulate AI response after delay
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'assistant',
        content: `I received your message: "${message}". This is a placeholder response as the real AI integration is not implemented in this demo.`
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Handle sending a message from input
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate AI response after delay
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'assistant',
        content: `I received your message: "${input}". This is a placeholder response as the real AI integration is not implemented in this demo.`
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>AI Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`px-4 py-2 rounded-lg max-w-[80%] flex items-start gap-2 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white ml-10' 
                    : 'bg-gray-100 text-gray-800 mr-10'
                }`}
              >
                {message.role === 'assistant' && (
                  <Bot className="h-5 w-5 mt-1 flex-shrink-0" />
                )}
                <div className="break-words">{message.content}</div>
                {message.role === 'user' && (
                  <User className="h-5 w-5 mt-1 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-800">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex w-full items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
            <SendHorizontal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(ChatPanelComponent);
ChatPanel.displayName = 'ChatPanel'; 