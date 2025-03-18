/**
 * Google Sign-In Button Component
 * Provides a styled button for authenticating with Google via auth-service
 */
'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';

/**
 * Sign in with Google using auth-service via the web gateway
 * @param onSuccess Optional callback when sign-in is successful
 */
export function GoogleSignInButton({ 
  onSuccess 
}: { 
  onSuccess?: () => void 
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Get the current origin to pass to auth service
      const origin = window.location.origin;
      
      // Use the web gateway URL for auth service requests
      const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
      
      // Redirect to the auth service's OAuth endpoint via the web gateway
      window.location.href = `${webGatewayUrl}/oauth/google?origin=${encodeURIComponent(origin)}`;
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Sign-in error. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {/* Google Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-5 h-5"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  );
} 