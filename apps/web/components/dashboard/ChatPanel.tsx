/**
 * Chat Panel Component
 * 
 * Displays a chat interface for interacting with AI agents
 */
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SendHorizontal, Bot, User, Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Enhanced chat panel component for interacting with AI agents
 * Professional UI with improved visuals and interactions
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
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
    <Card className="flex flex-col h-full border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle>AI Assistant</CardTitle>
            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
              Beta
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-gray-600">
          Ask questions or give instructions to your AI assistant
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 max-h-[500px] bg-gray-50">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`px-4 py-3 rounded-lg max-w-[85%] flex items-start gap-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white ml-12 shadow-sm' 
                    : 'bg-white text-gray-800 mr-12 border border-gray-100 shadow-sm'
                }`}
              >
                {message.role === 'assistant' && (
                  <Bot className="h-5 w-5 mt-1 flex-shrink-0 text-blue-600" />
                )}
                <div className="break-words">{message.content}</div>
                {message.role === 'user' && (
                  <User className="h-5 w-5 mt-1 flex-shrink-0 text-blue-100" />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-white border border-gray-100 text-gray-400 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t p-3 bg-white">
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
            className="flex-1 border-gray-200 focus-visible:ring-blue-500"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <SendHorizontal className="h-4 w-4 mr-1" />
            <span>Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 