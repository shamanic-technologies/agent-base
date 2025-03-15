'use client';

import { Button } from '../components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleSignInButton } from '../components/auth/google-sign-in-button';

/**
 * Landing Page Component
 * Displays a welcome message and sign-in options
 * Including Google OAuth with auth-service
 */
export default function Home() {
  const router = useRouter();
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Original demo sign-in (kept for backward compatibility)
  const handleDemoSignIn = async () => {
    try {
      setIsLoading(true);
      // Call the auth service's login endpoint
      const response = await fetch(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          // Using the demo user credentials from auth-service
          username: 'demo',
          password: 'password123',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // The server now sets cookies, we don't need to store tokens in localStorage
        // Redirect to chat page
        router.push('/chat');
      } else {
        console.error('Sign-in failed:', data.error);
        alert('Sign-in failed: ' + data.error);
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      alert('Sign-in error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL + '/helloworld');
      const data = await response.json();
      setTestMessage(data.message || 'Connection successful!');
    } catch (error) {
      console.error('Connection test error:', error);
      setTestMessage('Connection failed. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Hello World AI</h1>
          <p className="mt-2 text-gray-600">Your intelligent AI assistant</p>
        </div>
        
        <div className="mt-8 space-y-4">
          {/* Google Sign-In Button */}
          <div className="mb-4">
            <GoogleSignInButton />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">Or continue with</span>
            </div>
          </div>
          
          {/* Original Demo Sign-In */}
          <Button 
            className="w-full py-6 text-lg" 
            onClick={handleDemoSignIn}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In with Demo Account'}
          </Button>
          
          <div className="pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={testConnection}
              disabled={isLoading}
            >
              Test Auth Service Connection
            </Button>
            
            {testMessage && (
              <p className="mt-2 p-2 text-sm text-center bg-gray-50 rounded">
                {testMessage}
              </p>
            )}
          </div>
          
          <p className="text-center text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 