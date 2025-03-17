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

  // Test auth service connection
  const testConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL + '/health');
      
      if (response.ok) {
        const data = await response.json();
        setTestMessage(`Auth service status: ${data.status || 'connected'}`);
      } else {
        setTestMessage('Connection failed: ' + response.statusText);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setTestMessage('Connection failed. Please check if the auth service is running.');
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
          {/* Auth Status */}
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-center">
            <p className="text-blue-700 font-medium">Authentication Method</p>
            <p className="text-blue-600">Passport.js with Google OAuth</p>
          </div>
          
          {/* Google Sign-In Button */}
          <div className="mt-6">
            <GoogleSignInButton />
          </div>
          
          <div className="pt-4 border-t border-gray-200 mt-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={testConnection}
              disabled={isLoading}
            >
              Test Auth Service Connection
            </Button>
            
            {testMessage && (
              <p className={`mt-2 p-2 text-sm text-center rounded ${
                testMessage.includes('failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {testMessage}
              </p>
            )}
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 