'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Auth Callback Page
 * Handles the callback from the authentication service
 * Redirects users to the dashboard after successful authentication
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Get the authentication token from the URL or cookies
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Store the token in a cookie
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      // Redirect to the dashboard
      router.push('/dashboard');
    } else {
      // If there's no token, redirect to the home page
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center">
        <h1 className="text-xl font-medium text-gray-700 mb-2">Signing you in...</h1>
        <p className="text-gray-500">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
} 