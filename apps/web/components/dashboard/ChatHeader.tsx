/**
 * Chat Header Component
 * 
 * Header for the chat panel with controls
 */
import { Button } from "../../components/ui/button";
import { Bot, RefreshCw, Sparkles, ToggleLeft, ToggleRight, Code } from "lucide-react";

interface ChatHeaderProps {
  resetConversation: () => void;
  toggleStreaming: () => void;
  toggleDebugPanel: () => void;
  useStreaming: boolean;
  showDebugPanel: boolean;
}

/**
 * Header with controls for the chat interface
 */
export function ChatHeader({ 
  resetConversation, 
  toggleStreaming, 
  toggleDebugPanel, 
  useStreaming, 
  showDebugPanel 
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-3 h-16">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-medium">AI Chat</h2>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          onClick={resetConversation}
          title="Start a new conversation"
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          New Chat
        </Button>
        
        <Button
          onClick={toggleStreaming}
          title={useStreaming ? "Switch to regular API mode" : "Switch to streaming API mode"}
          variant="outline"
          size="sm"
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
          onClick={toggleDebugPanel}
          title="Toggle Debug Panel"
          variant={showDebugPanel ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-1"
        >
          <Code className="h-4 w-4 mr-1" />
          {showDebugPanel ? "Hide Debug" : "Show Debug"}
        </Button>
      </div>
    </div>
  );
} 