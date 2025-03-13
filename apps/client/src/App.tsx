import { useState, FormEvent, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Define types for chat messages
type MessageType = 'user' | 'ai';

interface Message {
  id: string;
  type: MessageType;
  text: string;
}

function App() {
  // State for API key and messages
  const [apiKey, setApiKey] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hello! I am a HelloWorld AI agent. Enter your API key and ask me anything!'
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
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
      // Call the API with the user's prompt
      const response = await axios.post(
        'http://localhost:3002/api/v1/generate',
        { prompt: prompt.trim() },
        { headers: { 'x-api-key': apiKey } }
      );
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.data.generated_text
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      let errorMessage = 'An error occurred';
      
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Invalid API key. Please check your API key.';
        } else {
          errorMessage = error.response.data.error || errorMessage;
        }
      }
      
      // Add error message to chat
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Error: ${errorMessage}`
      };
      
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-container">
      <header>
        <h1>HelloWorld AI Client</h1>
        <div className="api-key-container">
          <input
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="api-key-input"
          />
        </div>
      </header>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <span className="message-label">{message.type === 'user' ? 'You' : 'AI'}</span>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <span className="message-label">AI</span>
              <p>Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="prompt-form">
        <input
          type="text"
          placeholder="Type your message..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="prompt-input"
        />
        <button type="submit" disabled={isLoading} className="send-button">
          Send
        </button>
      </form>
    </div>
  );
}

export default App; 