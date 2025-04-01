"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();
  
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
      
      // Send a message to the parent window
      window.parent.postMessage(
        {
          type: 'STRIPE_KEYS_SAVED',
          userId: params.userId,
          conversationId: params.conversationId,
          success: true,
        },
        '*'
      );
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Send error message to parent
      window.parent.postMessage(
        {
          type: 'STRIPE_KEYS_SAVED',
          userId: params.userId,
          conversationId: params.conversationId,
          success: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        },
        '*'
      );
    }
  };
  
  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
        <p className="font-medium">Stripe API keys saved successfully!</p>
        <p className="text-sm">You can now proceed with Stripe operations.</p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <p className="font-medium">Error saving Stripe API keys</p>
        <p className="text-sm">{errorMessage}</p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {(params.keyType === 'publishable_key' || params.keyType === 'both') && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="publishable_key">
            Publishable Key
          </label>
          <input
            id="publishable_key"
            type="text"
            placeholder="pk_test_..."
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            {...register('publishable_key', { required: true })}
          />
          {errors.publishable_key && (
            <p className="text-red-500 text-xs italic">
              Publishable key is required and must start with "pk_"
            </p>
          )}
        </div>
      )}
      
      {(params.keyType === 'secret_key' || params.keyType === 'both') && (
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="secret_key">
            Secret Key
          </label>
          <input
            id="secret_key"
            type="password"
            placeholder="sk_test_..."
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            {...register('secret_key', { required: true })}
          />
          {errors.secret_key && (
            <p className="text-red-500 text-xs italic">
              Secret key is required and must start with "sk_"
            </p>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {status === 'submitting' ? 'Saving...' : 'Save Keys'}
        </button>
      </div>
    </form>
  );
} 