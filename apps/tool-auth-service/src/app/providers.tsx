'use client';

/**
 * Client Providers
 * 
 * Contains all client-side providers including NextAuth SessionProvider
 */
import { SessionProvider } from 'next-auth/react';

/**
 * Wraps the application with required providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
} 