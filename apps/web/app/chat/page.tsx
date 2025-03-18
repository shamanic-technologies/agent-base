'use client';

import { ChatUI } from '../../components/chat-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { validateAuth } from '../../lib/auth/auth-service';

/**
 * Chat Page Component
 * Protected page that displays the chat interface
 * Uses auth-service cookies for authentication
 */
export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await validateAuth();
        
        if (!userData) {
          router.push('/');
          return;
        }
        
        // User is authenticated
        setUser(userData);
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

  return <ChatUI />;
} 