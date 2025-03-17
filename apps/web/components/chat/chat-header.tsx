"use client";

import { Button } from "../ui/button";
import { Bot, RefreshCw, Sparkles, ToggleLeft, ToggleRight, Code } from "lucide-react";
import { UserProfileMenu } from "./user-profile-menu";
import { logout } from "../../lib/auth/auth-service";

interface ChatHeaderProps {
  resetConversation: () => void;
  toggleStreaming: () => void;
  toggleDebugPanel: () => void;
  useStreaming: boolean;
  showDebugPanel: boolean;
}

/**
 * Chat Header Component
 * Header with app title and control buttons for the chat interface
 */
export function ChatHeader({ 
  resetConversation, 
  toggleStreaming, 
  toggleDebugPanel, 
  useStreaming, 
  showDebugPanel 
}: ChatHeaderProps) {
  // Logout handler function
  const handleLogout = async () => {
    try {
      const success = await logout();
      
      if (success) {
        console.log('Successfully logged out');
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  return (
    <header className="flex-none flex items-center justify-between border-b px-6 py-3 h-16">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold">HelloWorld AI Client</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={resetConversation}
          title="Start a new conversation with a fresh thread ID"
          className="flex items-center gap-1 bg-primary text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          New Conversation
        </Button>
        <Button
          onClick={toggleStreaming}
          title={useStreaming ? "Switch to regular API mode" : "Switch to streaming API mode"}
          className="flex items-center gap-1 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
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
          className={showDebugPanel 
            ? "flex items-center bg-primary text-primary-foreground" 
            : "flex items-center border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"}
        >
          <Code className="h-4 w-4 mr-2" />
          {showDebugPanel ? "Hide Debug" : "Show Debug"}
        </Button>
        
        {/* User Profile Menu */}
        <div className="ml-2 border-l pl-4">
          <UserProfileMenu 
            user={{
              name: "Kevin Lourd",
              email: "kevin@example.com",
              // You can add an avatarUrl here if available
            }} 
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
} 