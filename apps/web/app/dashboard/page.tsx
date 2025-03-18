'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Header, 
  APIKeySection, 
  UtilitiesSection,
  ChatPanel,
  utilityCategories 
} from '../../components/dashboard';
import type { ChatPanelRef } from '../../components/dashboard/ChatPanel';

/**
 * Professional Dashboard Page
 * Displays user's API key, available utilities, and an integrated chat interface
 */
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; picture: string; email: string; id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  
  // Reference to the ChatPanel component
  const chatPanelRef = useRef<ChatPanelRef>(null);
  
  // Function to send message to chat
  const sendMessageToChat = (message: string) => {
    if (chatPanelRef.current) {
      chatPanelRef.current.sendMessage(message);
    }
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Call our server-side API route instead of directly calling web gateway
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          console.error('Failed to fetch users data');
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.data.items.length > 0) {
          // Use the most recently created user
          const userData = data.data.items[data.data.items.length - 1];
          
          setUser({
            id: userData.id,
            name: userData.data.name || "User",
            picture: userData.data.picture || "",
            email: userData.data.email || ""
          });
          
          // Fetch API key after getting user data
          fetchApiKey(userData.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Fetch API key for user
  const fetchApiKey = async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingKey(true);
    try {
      // Call our server-side API route instead of directly calling web gateway
      const existingKeysResponse = await fetch(`/api/keys?userId=${userId}`);
      const existingKeysData = await existingKeysResponse.json();
      
      if (existingKeysData.success && existingKeysData.data && existingKeysData.data.length > 0) {
        // User already has a key, use the existing one
        setApiKey(`helloworld_xxxx_${existingKeysData.data[0].keyPrefix.substring(10)}`);
      } else {
        // Create new key for user
        const response = await fetch('/api/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name: 'Default HelloWorld Key'
          }),
        });
        
        const data = await response.json();
        
        if (data.success && data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          console.error('Failed to generate API key');
          setApiKey(''); // Set empty API key on failure
        }
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      setApiKey(''); // Set empty API key on error
    } finally {
      setIsLoadingKey(false);
    }
  };
  
  // Regenerate API key
  const regenerateApiKey = async () => {
    if (!user?.id) return;
    
    setIsLoadingKey(true);
    try {
      // Call our server-side API route instead of directly calling web gateway
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: 'Regenerated HelloWorld Key'
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        // Set key to be visible when regenerated
        setIsKeyVisible(true);
      } else {
        console.error('Failed to regenerate API key');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
    } finally {
      setIsLoadingKey(false);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].substring(0, 1).toUpperCase();
    
    return (nameParts[0].substring(0, 1) + nameParts[nameParts.length - 1].substring(0, 1)).toUpperCase();
  };

  // Handle logout
  const handleLogout = () => {
    // In a real app, clear auth tokens, cookies, etc.
    console.log('Logging out...');
    router.push('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        user={user} 
        isLoading={isLoading} 
        getUserInitials={getUserInitials}
        handleLogout={handleLogout}
      />

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - API Key and Utilities */}
          <div className="space-y-6">
            {/* Welcome and API Key Section */}
            <APIKeySection 
              userId={user?.id} 
              apiKey={apiKey} 
              isLoadingKey={isLoadingKey} 
              regenerateApiKey={regenerateApiKey} 
            />

            {/* Available Utilities */}
            <UtilitiesSection 
              utilityCategories={utilityCategories} 
              sendMessage={sendMessageToChat}
            />
          </div>
          
          {/* Right Column - Chat Interface */}
          <div className="space-y-6 lg:h-[calc(100vh-150px)]">
            <ChatPanel ref={chatPanelRef} apiKey={apiKey} />
          </div>
        </div>
      </main>
    </div>
  );
} 