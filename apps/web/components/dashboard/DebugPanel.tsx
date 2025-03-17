/**
 * Debug Panel Component
 * 
 * Displays detailed information about chat requests and responses for debugging
 */
import { ScrollArea } from "../../components/ui/scroll-area";
import { DebugData } from "../../lib/chat/types";
import { Button } from "../../components/ui/button";
import { Code2, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";

interface DebugPanelProps {
  debugData: DebugData;
}

/**
 * Debug panel component for showing technical details of chat interactions
 */
export function DebugPanel({ debugData }: DebugPanelProps) {
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  // Handle copying content to clipboard
  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedState({ ...copiedState, [id]: true });
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedState({ ...copiedState, [id]: false });
    }, 2000);
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-l">
      <div className="border-b p-3">
        <h3 className="text-lg font-semibold flex items-center">
          <Code2 className="mr-2 h-5 w-5" />
          Debug Information
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Technical details about the current conversation
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Thread info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Thread ID</h4>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-2"
                onClick={() => handleCopy('thread-id', debugData.thread_id)}
              >
                {copiedState['thread-id'] ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto">
              {debugData.thread_id}
            </pre>
          </div>
          
          {/* Streaming state */}
          <div>
            <h4 className="font-medium">Streaming Status</h4>
            <div className="mt-1 flex items-center">
              <div 
                className={`h-2.5 w-2.5 rounded-full mr-2 ${
                  debugData.streaming_active ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm">
                {debugData.streaming_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          {/* Current streaming chunks */}
          {debugData.streaming_active && debugData.current_streaming_chunks.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Current Streaming Chunks</h4>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2"
                  onClick={() => handleCopy(
                    'streaming-chunks', 
                    JSON.stringify(debugData.current_streaming_chunks, null, 2)
                  )}
                >
                  {copiedState['streaming-chunks'] ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto max-h-60">
                {JSON.stringify(debugData.current_streaming_chunks, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Message History */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Message History</h4>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-2"
                onClick={() => handleCopy(
                  'message-history', 
                  JSON.stringify(debugData.message_history, null, 2)
                )}
              >
                {copiedState['message-history'] ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto max-h-80">
              {JSON.stringify(debugData.message_history, null, 2)}
            </pre>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 