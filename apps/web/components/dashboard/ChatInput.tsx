/**
 * Chat Input Component
 * 
 * Input field for sending messages to the chat
 */
import { FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loader2, SendHorizontal } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Input component for chat messages
 */
export function ChatInput({ input, setInput, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        disabled={isLoading}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
              onSubmit(e as unknown as FormEvent<HTMLFormElement>);
            }
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
} 