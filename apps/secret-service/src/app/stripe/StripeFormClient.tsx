'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Check, Eye, EyeOff } from 'lucide-react'; // Icons for Stripe
import { useToast } from "@/hooks/use-toast";
import { FormTemplate } from '@/components/form/FormTemplate'; // Import the template

// --- Stripe Specific Config & Components ---
const STRIPE_DASHBOARD_URL = 'https://dashboard.stripe.com/apikeys';
const SECRET_TYPE_STRIPE = 'stripe_api_key'; // Changed from stripe_api_keys for consistency

interface StripeStepProps {
  secretKey: string;
  setSecretKey: (value: string) => void;
  publishableKey: string;
  setPublishableKey: (value: string) => void;
  isLoading?: boolean;
  submitError?: string | null;
}

// Stripe only needs one input step
const StripeInputStep: React.FC<StripeStepProps> = ({
  isLoading, 
  secretKey,
  setSecretKey,
  publishableKey,
  setPublishableKey,
  submitError 
}) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      {/* Secret Key Input */}
      <div className="space-y-2">
        <Label htmlFor="secret-key" className="text-base">Stripe Secret Key</Label>
        <div className="relative">
          <Input
            id="secret-key"
            type={showSecret ? 'text' : 'password'}
            placeholder="Paste your Secret Key here (sk_live_... or sk_test_...)"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            required
            disabled={isLoading}
            className={`h-10 pr-10 font-mono ${secretKey ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Publishable Key Input */}
      <div className="space-y-2">
        <Label htmlFor="publishable-key" className="text-base">Stripe Publishable Key</Label>
        <Input
          id="publishable-key"
          type="text"
          placeholder="Paste your Publishable Key here (pk_live_... or pk_test_...)"
          value={publishableKey}
          onChange={(e) => setPublishableKey(e.target.value)}
          required
          disabled={isLoading}
          className={`h-10 font-mono ${publishableKey ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
        />
      </div>

      {/* Error Display */}
      {submitError && (
          <Alert variant="destructive" className="text-sm">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
          </Alert>
      )}

      {/* Help Text */}
      <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-center">
              <div className="flex-shrink-0 mr-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                  <a href={STRIPE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Find your API Keys in Stripe Dashboard
                  </a>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Create or reveal both a **Secret key** (starting with `sk_`) and a **Publishable key** (starting with `pk_`).
                  </p>
              </div>
          </div>
      </Alert>
    </div>
  );
};

// --- Main Client Component ---
export default function StripeFormClient() {
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0); // Always 0 for Stripe
    const [secretKey, setSecretKey] = useState('');
    const [publishableKey, setPublishableKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState<string | null>(null);
    const { toast } = useToast();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    // Define Stripe steps (only one)
    const steps = [
        { title: "Connect", component: <StripeInputStep isLoading={isLoading} secretKey={secretKey} setSecretKey={setSecretKey} publishableKey={publishableKey} setPublishableKey={setPublishableKey} submitError={submitError} /> },
    ];

    // --- Effects ---
    // Get userId and origin
    useEffect(() => {
        const getQueryParam = (param: string): string | null => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        };
        const userIdFromUrl = getQueryParam('userId');
        if (userIdFromUrl) {
             setUserId(userIdFromUrl);
        } else {
            console.error("Error: userId not found in URL query parameters.");
            setSubmitError("Configuration error: Missing user identification.");
        }
        const handleMessage = (event: MessageEvent) => {
            if (!event.data || event.data.type !== 'origin_request_response' || !event.data.origin) return;
            try {
                const receivedOrigin = new URL(event.data.origin).origin;
                setOrigin(receivedOrigin);
            } catch (e) { console.error("Invalid origin:", event.data.origin); }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // --- Handlers ---
    const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        
        setIsLoading(true);
        setSubmitError(null);

        if (!userId) {
            setSubmitError("Cannot save: User identification is missing.");
            setIsLoading(false); return;
        }
        if (!secretKey.trim() || !publishableKey.trim()) {
            setSubmitError("Both Secret Key and Publishable Key are required.");
            setIsLoading(false); return;
        }
        // Basic validation for key prefixes
        if (!secretKey.trim().startsWith('sk_')) {
             setSubmitError("Invalid Secret Key format. It should start with \"sk_\".");
             setIsLoading(false); return;
        }
         if (!publishableKey.trim().startsWith('pk_')) {
             setSubmitError("Invalid Publishable Key format. It should start with \"pk_\".");
             setIsLoading(false); return;
        }

        try {
            // Prepare the secret value as an object containing both keys
            const secretValue = {
                secret_key: secretKey.trim(),
                publishable_key: publishableKey.trim()
            };
            
            const response = await fetch('/api/store-secret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                // Send the object as the secretValue
                body: JSON.stringify({ secretType: SECRET_TYPE_STRIPE, secretValue: secretValue }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || `Failed to save Stripe keys.`);
            }
            if (origin) {
                window.opener?.postMessage({ success: true, type: 'stripe_setup_complete' }, origin);
            } else { console.warn("Origin not verified."); }
            setIsSuccess(true);
        } catch (error: any) {
            const errorMessage = error.message || "An unknown error occurred";
            setSubmitError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            if (origin) {
                 window.opener?.postMessage({ success: false, error: errorMessage, type: 'stripe_setup_complete' }, origin);
            } else { console.warn("Origin not verified."); }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseWindow = () => window.close();

    // --- Render ---
    return (
        <form onSubmit={handleSubmit}> 
            <FormTemplate
                title="Configure Stripe Integration"
                steps={steps} // Single step
                currentStepIndex={currentStepIndex}
                isLoading={isLoading}
                isSuccess={isSuccess}
                successMessage="Your Stripe account is now connected."
                onCloseWindow={handleCloseWindow}
                // Pass only the submit button for single-step forms
                submitButton={
                     <Button type="submit" className="min-w-[120px]" disabled={isLoading || !secretKey.trim() || !publishableKey.trim()}>
                         {isLoading ? (
                              <div className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Saving...
                              </div>
                          ) : 'Save and Connect'}
                     </Button>
                }
            >
                {/* Render the single step component, add check for undefined */}
                {steps[currentStepIndex]?.component}
            </FormTemplate>
        </form>
    );
} 