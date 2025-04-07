"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

// Define form schema
const formSchema = z.object({
  publishable_key: z.string().min(10).startsWith('pk_'),
  secret_key: z.string().min(10).startsWith('sk_'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClientForm() {
  const searchParams = useSearchParams();
  const [params, setParams] = useState({
    userId: '',
    conversationId: '',
    keyType: 'both',
    description: 'Your Stripe API keys are needed to perform operations with your Stripe account'
  });
  
  // Get URL parameters safely (server and client side)
  useEffect(() => {
    setParams({
      userId: searchParams.get('userId') || '',
      conversationId: searchParams.get('conversationId') || '',
      keyType: searchParams.get('keyType') || 'both',
      description: searchParams.get('description') || 'Your Stripe API keys are needed to perform operations with your Stripe account'
    });
  }, [searchParams]);
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>();
  
  // Watch for input changes to show the checkmark
  const watchPublishableKey = watch('publishable_key', '');
  const watchSecretKey = watch('secret_key', '');
  
  // Validate key formats
  const isValidPublishableKey = watchPublishableKey?.trim().length >= 10 && watchPublishableKey?.trim().startsWith('pk_');
  const isValidSecretKey = watchSecretKey?.trim().length >= 10 && watchSecretKey?.trim().startsWith('sk_');
  
  const onSubmit = async (data: FormValues) => {
    if (!params.userId || !params.conversationId) {
      setStatus('error');
      setErrorMessage('Missing required parameters: userId or conversationId');
      return;
    }
    
    setStatus('submitting');
    
    try {
      // Store the keys
      const response = await fetch('/api/store-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': params.userId,
        },
        body: JSON.stringify({
          userId: params.userId,
          secretType: 'stripe_api_keys',
          secretValue: data,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to store Stripe API keys');
      }
      
      setStatus('success');
      
      // Get the target origin from environment variables
      const targetOrigin = process.env.NEXT_PUBLIC_MAIN_APP_ORIGIN;
      
      if (!targetOrigin) {
        console.error("Error: NEXT_PUBLIC_MAIN_APP_ORIGIN is not set. Cannot send success message.");
      } else {
        // Standardized success message payload
        const messagePayload = { 
          type: 'setup_success', 
          provider: 'stripe' 
        };
        try {
          // Try sending to window.opener first, as it's often more reliable for popups
          if (window.opener) {
            console.log(`Attempting to send message to window.opener with origin: ${targetOrigin}`);
            window.opener.postMessage(messagePayload, targetOrigin);
            console.log("Message sent via window.opener.");
          } else if (window.parent && window.parent !== window) {
            // Fallback to window.parent if opener is not available (e.g., iframes)
            console.log(`Attempting to send message to window.parent with origin: ${targetOrigin}`);
            window.parent.postMessage(messagePayload, targetOrigin);
            console.log("Message sent via window.parent.");
          } else {
            console.error("Could not find window.opener or valid window.parent to send message.");
          }
        } catch (err) {
          console.error("Error during postMessage transmission:", err);
        }
      }
      
      // Close the popup after a short delay
      setTimeout(() => {
        console.log("Closing popup.");
        window.close();
      }, 2000); 
      
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Error is displayed within the popup, no need to postMessage error back
    }
  };
  
  if (status === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="font-medium text-lg">API keys saved successfully!</h3>
        <p className="text-center text-sm mt-1">You can now proceed with Stripe operations.</p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-medium text-lg">Error saving API keys</h3>
        <p className="text-center text-sm mt-1">{errorMessage}</p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {(params.keyType === 'publishable_key' || params.keyType === 'both') && (
        <div className="space-y-2">
          <Label htmlFor="publishable_key">Publishable Key</Label>
          <div className="relative">
            <Input
              id="publishable_key"
              placeholder="pk_test_..."
              className="font-mono pr-10"
              {...register('publishable_key', { required: true })}
            />
            {isValidPublishableKey && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            )}
          </div>
          {errors.publishable_key && (
            <p className="text-destructive text-sm">
              Publishable key is required and must start with &quot;pk_&quot;
            </p>
          )}
        </div>
      )}
      
      {(params.keyType === 'secret_key' || params.keyType === 'both') && (
        <div className="space-y-2">
          <Label htmlFor="secret_key">Secret Key</Label>
          <div className="relative">
            <Input
              id="secret_key"
              type="password"
              placeholder="sk_test_..."
              className="font-mono pr-10"
              {...register('secret_key', { required: true })}
            />
            {isValidSecretKey && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            )}
          </div>
          {errors.secret_key && (
            <p className="text-destructive text-sm">
              Secret key is required and must start with &quot;sk_&quot;
            </p>
          )}
        </div>
      )}
      
      <Button
        type="submit"
        disabled={status === 'submitting' || !isValidPublishableKey || !isValidSecretKey}
        className="w-full font-medium"
      >
        {status === 'submitting' ? 'Saving...' : 'Save Keys'}
      </Button>
    </form>
  );
} 