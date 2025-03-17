/**
 * Chat UI Component
 * 
 * This file is now a thin wrapper around the modular chat components.
 * The implementation has been split into multiple files for better maintainability:
 * 
 * - /components/chat/chat-container.tsx - Main container component
 * - /components/chat/chat-header.tsx - Header with controls
 * - /components/chat/chat-input.tsx - User input form
 * - /components/chat/message-item.tsx - Individual message display
 * - /components/chat/debug-panel.tsx - Debug panel for API responses
 * 
 * Types and business logic are in:
 * - /lib/chat/types.ts - Type definitions
 * - /lib/chat/service.ts - API and processing logic
 */

"use client";

import { ChatContainer } from './chat';

// Simple wrapper component around ChatContainer
export function ChatUI() {
  return <ChatContainer />;
} 