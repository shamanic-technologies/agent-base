/**
 * Root Layout
 * 
 * Provides the global layout structure and NextAuth session context
 */
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Tool Authentication Service',
  description: 'Authentication service for AI agent tools',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
      )}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
} 