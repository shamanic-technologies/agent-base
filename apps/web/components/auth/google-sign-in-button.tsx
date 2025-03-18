/**
 * Google Sign-In Button Component
 * Provides a styled button for authenticating with Google via auth-service
 */
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";

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
      
      // Use the server-side API route for secure Google auth initiation
      window.location.href = '/api/auth/google-auth';
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Sign-in error. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      className="w-full bg-white text-black hover:bg-gray-100 border border-gray-300 flex items-center justify-center gap-2"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {/* Google Icon */}
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="matrix(1, 0, 0, 1, 0, 0)">
          <path
            d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.229,1.564-1.54,2.426-3.1,2.426 c-2.341,0-3.818-1.312-3.818-3.536c0-2.224,1.478-3.536,3.818-3.536c1.001,0,1.875,0.283,2.431,0.786l1.391-1.391 c-0.911-0.823-2.225-1.309-3.822-1.309c-3.122,0-5.545,2.313-5.545,5.45c0,3.136,2.313,5.45,5.668,5.45 c3.495,0,5.4-2.258,5.4-5.45v-0.8h-7.867V12.151z"
            fill="#4285F4"
          ></path>
          <path
            d="M8.364,14.364L8.364,14.364c1.196,0,2.131-0.935,2.131-2.101l0.02-6.232C10.515,4.858,9.561,3.95,8.364,3.95 c-1.2,0-2.182,0.908-2.182,2.081v6.232C6.182,13.429,7.168,14.364,8.364,14.364z"
            fill="#EA4335"
          ></path>
          <path
            d="M8.364,14.364L8.364,14.364c-1.2,0-2.182-0.935-2.182-2.101V9.096c0,1.165,0.982,2.101,2.182,2.101 c1.196,0,2.151-0.935,2.151-2.101v3.167C10.515,13.429,9.561,14.364,8.364,14.364z"
            fill="#FBBC05"
          ></path>
          <path
            d="M8.364,6.192L8.364,6.192c1.196,0,2.151,0.935,2.151,2.101V6.031c0-1.173-0.955-2.081-2.151-2.081 c-1.2,0-2.182,0.908-2.182,2.081v2.263C6.182,7.126,7.168,6.192,8.364,6.192z"
            fill="#34A853"
          ></path>
        </g>
      </svg>
      
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
} 