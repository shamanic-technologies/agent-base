'use client';

/**
 * Sign In Page
 * 
 * Page for OAuth authentication with scopes passed via query parameters
 */
import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
// Fix the TypeScript error by explicitly importing types from next-auth
import type { SignInOptions } from 'next-auth/react';

// Loading fallback for Suspense
function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Loading...
            </h1>
            
            <div className="flex justify-center py-8">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [toolName, setToolName] = useState<string | null>(null);

  // Parse required scopes from URL and add base scopes
  const requestedScopes = searchParams.get('scopes') || '';
  const baseScopes = 'openid email profile';
  const scopes = requestedScopes ? `${baseScopes} ${requestedScopes}` : baseScopes;
  console.log('scopes', scopes);
  
  const callbackUrl = searchParams.get('callbackUrl') || '/auth/callback';

  useEffect(() => {
    // Set tool name if present in URL
    const toolParam = searchParams.get('toolName');
    if (toolParam) {
      setToolName(decodeURIComponent(toolParam));
    }
  }, [searchParams]);

  // Start auth flow with Google
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', 
        { callbackUrl }, 
        { scope: scopes }
      );
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {toolName 
                ? `Connect your Google account to use ${toolName}`
                : 'Connect your Google account'
              }
            </h1>
            
            <p className="text-center text-gray-500 mb-6">
              This connection is needed to access your Google data securely
            </p>
            
            {/* Google Sign-in Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 rounded-md 
                         bg-white text-black border border-gray-300 
                         hover:bg-gray-50 transition-colors shadow-sm mb-6
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                         disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </div>
              ) : (
                <>
                  <div className="mr-3 flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  </div>
                  <span className="font-medium">Continue with Google</span>
                </>
              )}
            </button>
            
            <div className="flex items-center my-4">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="px-2 text-xs text-gray-500 font-medium">SECURE CONNECTION</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Encrypted and secure connections</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <svg className="mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span>Minimum permissions required</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <svg className="mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Your data remains private and secure</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 py-3">
            <div className="w-full text-center text-xs text-gray-500 font-mono">
              © Agent Base Authentication
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <React.Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </React.Suspense>
  );
} 