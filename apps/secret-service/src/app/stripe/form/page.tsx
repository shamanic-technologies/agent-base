/**
 * Stripe API Key Input Form Page
 * 
 * This page provides a form for users to input their Stripe API keys
 * It is designed to be embedded in an iframe by the main application
 */
import React from 'react';
import ClientForm from './client-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Loading skeleton to show while form is loading
function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-200/20 rounded-md"></div>
      <div className="h-10 bg-gray-200/20 rounded-md"></div>
      <div className="h-10 bg-gray-200/20 rounded-md"></div>
    </div>
  );
}

export default function StripeFormPage() {
  return (
    <Card className="w-full max-w-md border border-border/40 shadow-lg bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-center">Connect Stripe Account</CardTitle>
        <CardDescription className="text-center">
          Your Stripe API keys are needed to perform operations with your Stripe account.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <React.Suspense fallback={<FormSkeleton />}>
          <ClientForm />
        </React.Suspense>
      </CardContent>
      
      <CardFooter className="flex flex-col text-xs text-muted-foreground">
        <p>Your keys are stored securely and are not accessible by the AI Agent.</p>
        <p className="mt-1">Only authorized operations will use these keys.</p>
      </CardFooter>
    </Card>
  );
} 