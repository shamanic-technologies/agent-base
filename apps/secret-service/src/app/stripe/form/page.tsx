/**
 * Stripe API Key Input Form Page
 * 
 * This page provides a form for users to input their Stripe API keys
 * It is designed to be embedded in an iframe by the main application
 */
import React from 'react';
import ClientForm from './client-form';

// Loading skeleton to show while form is loading
function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  );
}

export default function StripeFormPage() {
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Connect Stripe Account</h2>
      <p className="mb-6 text-gray-600">
        Your Stripe API keys are needed to perform operations with your Stripe account.
      </p>
      
      <React.Suspense fallback={<FormSkeleton />}>
        <ClientForm />
      </React.Suspense>
      
      <div className="mt-6 text-xs text-gray-500">
        <p>Your keys are stored securely and are not accessible by the AI Agent.</p>
        <p className="mt-1">Only authorized operations will use these keys.</p>
      </div>
    </div>
  );
} 