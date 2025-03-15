'use client';

import { useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Profile Page Error Component
 * Displays when an error occurs while loading the profile page
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Profile page error:', error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-500">Error Loading Profile</CardTitle>
          <CardDescription>
            {error.message || 'An unexpected error occurred while loading your profile.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <p className="text-center text-muted-foreground mb-4">
            Please try again later or contact support if the problem persists.
          </p>
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          <Button onClick={() => reset()} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => router.push('/chat')}>
            Back to Chat
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 