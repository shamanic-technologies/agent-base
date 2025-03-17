/**
 * Message Item Component
 * 
 * Displays an individual chat message with user/AI styling
 */
import { Bot, User, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';
import { Message } from '../../lib/chat/types';

interface MessageItemProps {
  message: Message;
  isLoading?: boolean;
}

/**
 * Renders an individual chat message with appropriate styling based on the message type
 */
export function MessageItem({ message, isLoading = false }: MessageItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 pb-4",
        message.type === "user" ? "flex-row-reverse" : ""
      )}
    >
      <Avatar className={message.type === "user" ? "bg-blue-600" : "bg-gray-100"}>
        {message.type === "user" ? (
          <AvatarFallback className="bg-blue-600 text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-gray-100">
            <Bot className="h-4 w-4 text-gray-800" />
          </AvatarFallback>
        )}
      </Avatar>
      <div 
        className={cn(
          "flex flex-col max-w-[75%] rounded-md px-4 py-3 text-sm relative group",
          message.type === "user" ? 
            "bg-blue-600 text-white" : 
            "bg-gray-100 text-gray-800"
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