"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Message } from "@/lib/chat/types";

interface DebugPanelProps {
  messages: Message[];
  threadId: string;
  streamChunks: any[];
  currentStreamingMessage: Message | null;
  onClose: () => void;
}

/**
 * Debug Panel Component
 * Displays debugging information about API calls and streaming data
 */
export function DebugPanel({ 
  messages, 
  threadId, 
  streamChunks, 
  currentStreamingMessage, 
  onClose 
}: DebugPanelProps) {
  const [expandedMessages, setExpandedMessages] = useState<{[key: string]: boolean}>({});
  
  // Toggle message expansion in debug panel
  const toggleMessageExpansion = (id: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  return (
    <div className="w-2/5 relative border-l bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-2 right-2 z-10">
        <Button 
          onClick={onClose}
          title="Close Debug Panel"
          className="h-8 w-8 p-0"
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
  );
} 