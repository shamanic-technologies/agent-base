'use client';

/**
 * Authentication Callback Page
 * 
 * This page is displayed after successful OAuth authentication
 * It automatically closes the popup/modal after authentication
 */
import React, { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Loading fallback for Suspense
function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md px-6">
        <Card className="border shadow-xl bg-white dark:bg-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
          
          <CardHeader>
            <CardTitle className="text-center text-xl">Loading authentication...</CardTitle>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading, please wait...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const { data: session, status } = useSession();
  const [countdown, setCountdown] = useState(5);
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Only proceed when we have the session data and authentication is complete
    if (status === 'authenticated' && session) {
      // Start the countdown to auto-close
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            window.close();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session, status]);

  // Tech-styled loading UI
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative bg-slate-50 dark:bg-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 w-full max-w-md px-6">
          <Card className="border shadow-xl bg-white dark:bg-slate-950">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
            
            <CardHeader>
              <CardTitle className="text-center text-xl">Verifying authentication...</CardTitle>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              </div>
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Establishing secure connection</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-slate-50 dark:bg-slate-900">
      {/* Simple tech background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <Card className="border shadow-xl bg-white dark:bg-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
          
          <CardHeader className="pb-4">
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full 
              ${status === 'authenticated' 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'bg-red-100 dark:bg-red-900'
              }`}
            >
              {status === 'authenticated' ? (
                <svg 
                  className="h-10 w-10 text-green-600 dark:text-green-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <svg 
                  className="h-10 w-10 text-red-600 dark:text-red-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>
            
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              {status === 'authenticated' 
                ? 'Authentication successful!' 
                : 'Authentication failed'}
            </CardTitle>
            
            <CardDescription className="text-center pt-2 text-gray-500 dark:text-gray-400">
              {status === 'authenticated'
                ? 'You have successfully connected your Google account. You can now continue with your task.'
                : 'There was a problem authenticating your account. Please try again.'}
            </CardDescription>
          </CardHeader>
          
          {status === 'authenticated' && (
            <CardContent className="text-center pb-6">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <svg className="h-4 w-4 text-blue-600 dark:text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-500">
                  Auto-closing in <span className="font-bold">{countdown}</span> seconds
                </p>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${(countdown / 5) * 100}%` }}
                ></div>
              </div>
            </CardContent>
          )}
          
          <CardFooter className="flex justify-center pb-6 pt-2">
            <button 
              onClick={() => window.close()}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Close Window
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <React.Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </React.Suspense>
  );
} 