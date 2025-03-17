"use client";

import { FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, SendHorizontal } from "lucide-react";

interface ChatInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Chat Input Component
 * Handles user input for sending messages
 */
export function ChatInput({ prompt, setPrompt, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t bg-background">
      <div className="flex items-center space-x-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !prompt.trim()}
          className="bg-primary text-primary-foreground"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
} 