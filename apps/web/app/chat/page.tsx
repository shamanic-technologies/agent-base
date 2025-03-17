'use client';

import { ChatUI } from '../../components/chat-ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Chat Page Component
 * Protected page that displays the chat interface
 * Uses auth-service cookies for authentication
 */
export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Get test parameters from URL
  const testMessage = searchParams.get('test');
  const testUtility = searchParams.get('utility');
  const conversationId = searchParams.get('conversation');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // The auth service now uses cookies, so we don't need to send the token
        const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/auth/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Important: include credentials to send cookies with the request
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (!data.success) {
          router.push('/');
          return;
        }
        
        // User is authenticated
        setUser(data.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check error:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in the useEffect
  }

  return <ChatUI testMessage={testMessage} testUtility={testUtility} initialConversationId={conversationId} />;
} 