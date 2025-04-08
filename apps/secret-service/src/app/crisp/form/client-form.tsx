'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardFooter } from "@/components/ui/card"; // Import CardFooter if needed here
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Copy, Check, PartyPopper, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// --- Configuration ---
// Base URL for Crisp settings
const CRISP_SETTINGS_URL = 'https://app.crisp.chat/settings/website';

// Get the base URL for the webhook from environment variables
const CRISP_WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL 
    ? `${process.env.NEXT_PUBLIC_WEBHOOK_URL}/api/webhooks/crisp` 
    : null;

// Suggested name for the webhook in Crisp
const SUGGESTED_WEBHOOK_NAME = 'Agent Base Integration';

/**
 * Client component containing the multi-step Crisp configuration form logic.
 */
export default function CrispClientForm() {
    const [currentStep, setCurrentStep] = useState<number>(1); // 1: Navigate, 2: Add Hook, 3: Website ID, 4: Success
    const [crispWebsiteId, setCrispWebsiteId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState<string | null>(null); // Will be set by postMessage
    const { toast } = useToast();
    const [webhookNameCopied, setWebhookNameCopied] = useState(false);
    const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null); // State to store userId from URL

    /**
     * Effect to get origin from opener and userId from query params
     */
    useEffect(() => {
        // Function to parse query parameters
        const getQueryParam = (param: string): string | null => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        };

        // Get userId from URL
        const userIdFromUrl = getQueryParam('userId');
        if (userIdFromUrl) {
            console.log("Received userId from URL:", userIdFromUrl);
            setUserId(userIdFromUrl);
        } else {
            console.error("Error: userId not found in URL query parameters.");
            // Optionally, show an error to the user or disable the form
            setSubmitError("Configuration error: Missing user identification.");
        }

        // Function to handle messages from opener
        const handleMessage = (event: MessageEvent) => {
            // Basic security check for origin
            if (!event.data || event.data.type !== 'origin_request_response' || !event.data.origin) {
                return;
            }
            // Validate origin format (basic check)
            try {
                const receivedOrigin = new URL(event.data.origin).origin;
                console.log("Received origin from opener:", receivedOrigin);
                setOrigin(receivedOrigin);
            } catch (e) {
                console.error("Invalid origin received from opener:", event.data.origin);
                // Handle invalid origin - maybe show an error?
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []); // Empty dependency array means this runs once on mount

    // Reset copy states after timeout
    useEffect(() => {
        if (webhookNameCopied) {
            const timer = setTimeout(() => setWebhookNameCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [webhookNameCopied]);
    
    useEffect(() => {
        if (webhookUrlCopied) {
            const timer = setTimeout(() => setWebhookUrlCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [webhookUrlCopied]);

    // Effect to auto-close on success step
    useEffect(() => {
        let closeTimer: NodeJS.Timeout | null = null;
        if (currentStep === 4) {
            console.log("Success step reached. Starting auto-close timer.");
            closeTimer = setTimeout(() => {
                console.log("Auto-closing window.");
                window.close();
            }, 3000); // Auto-close after 3 seconds
        }
        
        // Cleanup timer if component unmounts or step changes before timeout
        return () => {
            if (closeTimer) {
                clearTimeout(closeTimer);
            }
        };
    }, [currentStep]);

    // Function to copy webhook URL to clipboard
    const copyWebhookUrl = () => {
        if (!CRISP_WEBHOOK_URL) {
             console.error("Cannot copy: Webhook URL is not configured or base URL is missing.");
             return;
        }
        navigator.clipboard.writeText(CRISP_WEBHOOK_URL).then(() => {
            setWebhookUrlCopied(true);
        }).catch(err => {
            console.error('Failed to copy webhook URL: ', err);
        });
    };

    // Function to copy suggested webhook name to clipboard
    const copyWebhookName = () => {
        navigator.clipboard.writeText(SUGGESTED_WEBHOOK_NAME).then(() => {
            setWebhookNameCopied(true);
        }).catch(err => {
            console.error('Failed to copy webhook name: ', err);
        });
    };

    // Handles moving to the next step
    const handleNextStep = () => {
        setCurrentStep((prevStep) => prevStep + 1);
    };

    /**
     * Handles the form submission to save the Crisp Website ID.
     */
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (currentStep !== 3) return; // Only submit on step 3

        setIsLoading(true);
        setSubmitError(null); // Reset any previous errors

        // Validate userId state
        if (!userId) {
            console.error("Submission Error: userId not available.");
            setIsLoading(false);
            setSubmitError("Cannot save: User identification is missing.");
            return;
        }

        if (!crispWebsiteId.trim()) {
            console.error("Validation Error: Crisp Website ID cannot be empty.");
            setIsLoading(false);
            setSubmitError("Crisp Website ID cannot be empty");
            return;
        }

        // We no longer block submission if origin is missing

        try {
            // Call the generic store-secret endpoint
            const response = await fetch('/api/store-secret', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Use the actual userId from state
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    secretType: 'crisp_website_id',
                    secretValue: crispWebsiteId.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to save Crisp secret.');
            }

            console.log("Crisp configuration saved successfully.");
            
            // Notify opener, only if origin is verified
            if (origin) {
                window.opener?.postMessage({ success: true, type: 'crisp_setup_complete' }, origin);
            } else {
                console.warn("Origin not verified, cannot post message to opener.");
            }

            // Move to success step instead of closing
            setCurrentStep(4);

        } catch (error: any) {
            console.error("Error saving Crisp secret:", error);
            const errorMessage = error.message || "An unknown error occurred";
            setSubmitError(errorMessage);
            
            // Show error toast
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
            
            // Notify opener of failure but don't close, only if origin is verified
            if (origin) {
                 window.opener?.postMessage({ success: false, error: errorMessage, type: 'crisp_setup_complete' }, origin);
            } else {
                 console.warn("Origin not verified, cannot post failure message to opener.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Function to manually close the window
    const handleCloseWindow = () => {
        console.log("Manual close requested.");
        window.close();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enhanced Stepper - Show all steps completed on step 4 */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex flex-col items-center">
                            <div 
                                className={`flex items-center justify-center h-8 w-8 rounded-full border-2 
                                ${currentStep === 4 ? 'bg-blue-100 text-blue-700 border-blue-600' : // All steps done style
                                  currentStep === step 
                                    ? 'bg-blue-600 text-white border-blue-700' 
                                    : currentStep > step 
                                        ? 'bg-blue-100 text-blue-700 border-blue-600' 
                                        : 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                                }`}
                            >
                                {currentStep > step ? '✓' : step}
                            </div>
                            <span className={`mt-1 text-xs font-medium ${currentStep === 4 ? 'text-blue-600' : currentStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
                                {step === 1 ? 'Navigate' : step === 2 ? 'Configure' : 'Connect'}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="relative flex h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 mt-1">
                    <div 
                        className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: currentStep === 4 ? '100%' : `${((currentStep - 1) / 2) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Step 1: Navigate to Web Hooks */}
            {currentStep === 1 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Step 1: Go to Crisp Web Hooks</h3>
                     <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                        <AlertTitle className="font-semibold">Action Required in Crisp</AlertTitle>
                        <AlertDescription className="text-sm">
                            Please navigate to the webhook settings section in your Crisp dashboard.
                            <ol className="list-decimal list-inside space-y-2 mt-3 pl-1">
                                <li>
                                    <a href={CRISP_SETTINGS_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline inline-flex items-center">
                                        Go to Crisp Website Settings <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </li>
                                <li>Navigate to <span className="font-medium">Workspace Settings</span> &gt; <span className="font-medium">Advanced Configuration</span> &gt; <span className="font-medium">Web Hooks</span> section.</li>
                                <li>Click <span className="font-medium">"Add a Web Hook"</span>.</li>
                            </ol>
                        </AlertDescription>
                    </Alert>
                   
                    <div className="flex justify-end pt-2">
                        <Button 
                            type="button" 
                            onClick={handleNextStep} 
                            className="min-w-[120px]"
                        >
                            Next Step
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Add Webhook Details */}
            {currentStep === 2 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Step 2: Add Webhook Details</h3>
                     <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                        <AlertTitle className="font-semibold">Action Required in Crisp</AlertTitle>
                        <AlertDescription className="text-sm">
                            Configure the webhook details in Crisp as follows:
                             <ol className="list-decimal list-inside space-y-2 mt-3 pl-1">
                               <li>
                                    Enter a name for the hook:
                                     <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded mt-1 text-xs font-medium border border-gray-200 dark:border-gray-700">
                                        <span className="truncate flex-1 text-gray-700 dark:text-gray-300 font-mono">{SUGGESTED_WEBHOOK_NAME}</span>
                                        <div className="flex items-center">
                                            {webhookNameCopied && (
                                                <span className="text-xs text-green-600 mr-1 animate-fade-in font-mono">
                                                    Copied!
                                                </span>
                                            )}
                                            <Button type="button" size="sm" variant="outline" onClick={copyWebhookName} className="h-6 px-1.5">
                                                {webhookNameCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    Paste this URL into the "URL To Be Called" field:
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded mt-1 text-xs font-mono border border-gray-200 dark:border-gray-700">
                                        <span className="truncate flex-1">
                                            {CRISP_WEBHOOK_URL || 'Error: Base Webhook URL not configured'} 
                                        </span>
                                        <div className="flex items-center">
                                            {webhookUrlCopied && (
                                                <span className="text-xs text-green-600 mr-1 animate-fade-in font-mono">
                                                    Copied!
                                                </span>
                                            )}
                                            <Button type="button" size="sm" variant="outline" onClick={copyWebhookUrl} className="h-6 px-1.5" disabled={!CRISP_WEBHOOK_URL}>
                                                {webhookUrlCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                     {!CRISP_WEBHOOK_URL && <p className='text-xs text-red-500 mt-1'>Error: Base Webhook URL (NEXT_PUBLIC_WEBHOOK_URL) not configured in environment.</p>}
                                </li>
                                <li>Ensure the <span className="font-medium">"message:send"</span> event is checked under "Filter Events".</li>
                                <li>Click <span className="font-medium">"Add Hook Target"</span> to save.</li>
                             </ol>
                        </AlertDescription>
                    </Alert>
                   
                    <div className="flex justify-between pt-2">
                        <Button 
                            type="button" 
                            onClick={() => setCurrentStep(1)} 
                            variant="outline" 
                            className="min-w-[120px]"
                        >
                            Back
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleNextStep} 
                            className="min-w-[120px]"
                        >
                            Next Step
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Website ID Input */}
            {currentStep === 3 && (
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Step 3: Enter Crisp Website ID</h3>
                    <div className="space-y-3">
                        <Label htmlFor="crisp-website-id" className="text-base">Crisp Website ID</Label>
                        <div className="relative">
                            <Input
                                id="crisp-website-id"
                                type="text"
                                placeholder="Paste your Website ID here"
                                value={crispWebsiteId}
                                onChange={(e) => setCrispWebsiteId(e.target.value)}
                                required
                                disabled={isLoading}
                                aria-describedby="crisp-id-description"
                                className={`h-10 pr-10 font-mono ${crispWebsiteId ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                            />
                            {crispWebsiteId && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <Check className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                        
                        {submitError && (
                            <Alert variant="destructive" className="text-sm">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {submitError}
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 mr-2">
                                    <ExternalLink className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <a 
                                        href={CRISP_SETTINGS_URL} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Open Crisp Settings
                                    </a>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                        Navigate to Website Settings &gt; Setup & Integrations to find your Website ID
                                    </p>
                                </div>
                            </div>
                        </Alert>
                    </div>

                    <div className="flex justify-between pt-4"> 
                        <Button 
                            type="button" 
                            onClick={() => setCurrentStep(2)} 
                            variant="outline" 
                            className="min-w-[120px]"
                            disabled={isLoading}
                        >
                            Back
                        </Button>
                        <Button 
                            type="submit" 
                            className="min-w-[120px]" 
                            disabled={isLoading || !crispWebsiteId.trim()}
                        >
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
                    </div>
                </div>
            )}
            
            {/* Step 4: Success Screen */}
            {currentStep === 4 && (
                <div className="space-y-4 text-center">
                     <div className="flex justify-center">
                        <PartyPopper className="h-12 w-12 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold">Connection Successful!</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your Crisp account is now connected. This window will close automatically.
                    </p>
                    
                    <div className="pt-4">
                        <Button 
                            type="button" 
                            onClick={handleCloseWindow} 
                            variant="outline" 
                            className="min-w-[120px]"
                        >
                            <X className="h-4 w-4 mr-1"/> Close Now
                        </Button>
                    </div>
                </div>
            )}
        </form>
    );
} 