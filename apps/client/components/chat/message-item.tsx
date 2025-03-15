"use client";

import { Bot, MessageSquare, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/chat/types";

interface MessageItemProps {
  message: Message;
  isLoading?: boolean;
}

/**
 * MessageItem Component
 * Renders an individual chat message with appropriate styling based on the message type
 */
export function MessageItem({ message, isLoading = false }: MessageItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 pb-4",
        message.type === "user" && "flex-row-reverse"
      )}
    >
      <Avatar className={message.type === "user" ? "bg-primary" : "bg-muted"}>
        {message.type === "user" ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-muted">
            <Bot className="h-4 w-4 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>
      <div 
        className={cn(
          "flex flex-col max-w-[75%] rounded-md px-4 py-3 text-sm relative group",
          message.type === "user" ? 
            "bg-primary text-primary-foreground" : 
            "bg-muted text-foreground"
        )}
      >
        <span className="text-xs mb-1 opacity-70 flex items-center gap-2">
          {message.type === "user" ? "You" : "AI"}
          {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </span>
        <div className="whitespace-pre-wrap">
          {message.text.split('\n').map((line, i) => {
            if (line.startsWith('[Using tool:') || line.startsWith('[Starting tool:')) {
              return <div key={i} className="text-blue-600 dark:text-blue-400 italic my-1">{line}</div>;
            } else if (line.startsWith('[Tool Result:')) {
              return <div key={i} className="text-green-600 dark:text-green-400 italic my-1">{line}</div>;
            } else {
              return <div key={i}>{line}</div>;
            }
          })}
        </div>
      </div>
    </div>
  );
} 