'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Copy, Check, Settings, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { FormTemplate } from '@/components/form/FormTemplate'; // Import the template
import { WebhookProvider, WebhookResponse, CrispWebhook } from '@agent-base/agents';

// --- Crisp Specific Config & Components ---
const CRISP_SETTINGS_URL = 'https://app.crisp.chat/settings/website';
const baseWebhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL?.replace(new RegExp('\\/$'), ''); // Remove trailing slash if present
const CRISP_WEBHOOK_URL = baseWebhookUrl
    ? `${baseWebhookUrl}/api/webhooks/crisp`
    : null;
const SUGGESTED_WEBHOOK_NAME = 'Agent Base Integration';
const SECRET_TYPE_CRISP = 'crisp_website_id';

interface CrispStepProps {
  handleNextStep?: () => void;
  copyToClipboard?: (text: string, type: 'name' | 'url') => void;
  copyStatus?: { nameCopied: boolean; urlCopied: boolean };
  secretValue?: string;
  setSecretValue?: (value: string) => void;
  isLoading?: boolean;
  submitError?: string | null;
}

const CrispStep1: React.FC<CrispStepProps> = ({ handleNextStep }) => (
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
        {/* Button moved to template */}
    </div>
);

const CrispStep2: React.FC<CrispStepProps> = ({ copyToClipboard, copyStatus }) => (
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
                                {copyStatus?.nameCopied && <span className="text-xs text-green-600 mr-1 animate-fade-in font-mono">Copied!</span>}
                                <Button type="button" size="sm" variant="outline" onClick={() => copyToClipboard?.(SUGGESTED_WEBHOOK_NAME, 'name')} className="h-6 px-1.5">
                                    {copyStatus?.nameCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    </li>
                    <li>
                        Paste this URL into the "URL To Be Called" field:
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded mt-1 text-xs font-mono border border-gray-200 dark:border-gray-700">
                            <span className="truncate flex-1">{CRISP_WEBHOOK_URL || 'Error: Base Webhook URL not configured'}</span>
                            <div className="flex items-center">
                                {copyStatus?.urlCopied && <span className="text-xs text-green-600 mr-1 animate-fade-in font-mono">Copied!</span>}
                                <Button type="button" size="sm" variant="outline" onClick={() => CRISP_WEBHOOK_URL && copyToClipboard?.(CRISP_WEBHOOK_URL, 'url')} className="h-6 px-1.5" disabled={!CRISP_WEBHOOK_URL}>
                                    {copyStatus?.urlCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
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
        {/* Buttons moved to template */}
    </div>
);

const CrispStep3: React.FC<CrispStepProps> = ({ isLoading, secretValue = '', setSecretValue = () => {}, submitError }) => (
    <div className="space-y-3">
        <Label htmlFor="secret-value" className="text-base">Crisp Website ID</Label>
        <div className="relative">
            <Input
                id="secret-value"
                type="text"
                placeholder="Paste your Website ID here"
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                required
                disabled={isLoading}
                aria-describedby="secret-value-description"
                className={`h-10 pr-10 font-mono ${secretValue ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
            />
            {secretValue && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="h-4 w-4" />
                </div>
            )}
        </div>
        {submitError && (
            <Alert variant="destructive" className="text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
            </Alert>
        )}
         <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
             <div className="flex items-center">
                 <div className="flex-shrink-0 mr-2">
                     <ExternalLink className="h-4 w-4 text-blue-600" />
                 </div>
                 <div>
                     <a href={CRISP_SETTINGS_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                         Open Crisp Settings
                     </a>
                     <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                         Navigate to Website Settings &gt; Setup & Integrations to find your Website ID
                     </p>
                 </div>
             </div>
         </Alert>
         {/* Button moved to template */}
    </div>
);

// --- Main Client Component ---
export default function CrispFormClient() {
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [secretValue, setSecretValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState<string | null>(null);
    const { toast } = useToast();
    const [copyStatus, setCopyStatus] = useState({ nameCopied: false, urlCopied: false });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    // --- Handlers --- (Define handlers before defining steps that use them)
    const copyToClipboard = (text: string, type: 'name' | 'url') => {
        navigator.clipboard.writeText(text).then(() => {
            const statusKey = type === 'name' ? 'nameCopied' : 'urlCopied';
            setCopyStatus(prev => ({ ...prev, [statusKey]: true }));
             toast({ title: "Copied!", description: `${type === 'name' ? 'Webhook name' : 'Webhook URL'} copied.`, duration: 1500 });
        }).catch(err => {
             console.error('Failed to copy:', err)
             toast({ title: "Copy Failed", variant: "destructive" });
        });
    };

    const handleNextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const handleBackStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (currentStepIndex !== steps.length - 1) return;

        setIsLoading(true);
        setSubmitError(null);

        if (!userId) {
            setSubmitError("Cannot save: User identification is missing.");
            setIsLoading(false); return;
        }
        if (!secretValue.trim()) {
            setSubmitError("Crisp Website ID cannot be empty");
            setIsLoading(false); return;
        }

        try {
            // 1. First store the secret
            const storeResponse = await fetch('/api/store-secret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ secretType: SECRET_TYPE_CRISP, secretValue: secretValue.trim() }),
            });
            const storeResult = await storeResponse.json();
            if (!storeResponse.ok || !storeResult.success) {
                throw new Error(storeResult.error || storeResult.message || `Failed to save Crisp secret.`);
            }

            // 2. Then set up the webhook
            const agentId = new URLSearchParams(window.location.search).get('agentId');
            if (agentId) {
                console.log(`Setting up webhook for agent ${agentId}`);
                
                // Create webhook data using the Webhook interface
                const webhookData: CrispWebhook & { agent_id: string } = {
                    webhook_provider_id: WebhookProvider.CRISP,
                    user_id: userId,
                    agent_id: agentId,
                    webhook_credentials: {
                        website_id: secretValue.trim()
                    }
                };
                
                const webhookResponse = await fetch('/api/setup-webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookData),
                });
                
                const webhookResult = await webhookResponse.json() as WebhookResponse;
                if (!webhookResponse.ok || !webhookResult.success) {
                    console.warn("Webhook setup failed, but secret was stored successfully:", webhookResult.error);
                    // Don't throw error here, as we still want to consider the overall flow successful
                    // The secret is stored, which is the most important part
                }
            } else {
                console.log("No agentId provided in URL, skipping webhook setup");
            }
            
            // 3. Notify parent window and update UI state
            if (origin) {
                window.opener?.postMessage({ success: true, type: 'crisp_setup_complete' }, origin);
            } else { console.warn("Origin not verified."); }
            setIsSuccess(true);
        } catch (error: any) {
            const errorMessage = error.message || "An unknown error occurred";
            setSubmitError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            if (origin) {
                 window.opener?.postMessage({ success: false, error: errorMessage, type: 'crisp_setup_complete' }, origin);
            } else { console.warn("Origin not verified."); }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseWindow = () => window.close();
    
    // Define Crisp steps *after* handlers are defined
    const steps = [
        { title: "Navigate", component: <CrispStep1 handleNextStep={handleNextStep} /> }, // Pass only needed props
        { title: "Configure", component: <CrispStep2 copyToClipboard={copyToClipboard} copyStatus={copyStatus} /> },
        { title: "Connect", component: <CrispStep3 isLoading={isLoading} secretValue={secretValue} setSecretValue={setSecretValue} submitError={submitError} /> },
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

    // Reset copy states
     useEffect(() => {
        Object.entries(copyStatus).forEach(([key, value]) => {
            if (value) {
                const timer = setTimeout(() => setCopyStatus(prev => ({ ...prev, [key]: false })), 2000);
                return () => clearTimeout(timer);
            }
        });
    }, [copyStatus]);

    // --- Render ---
    return (
        <form onSubmit={handleSubmit}> {/* Form wrapper needed for submission */}
            <FormTemplate
                title="Configure Crisp Integration"
                steps={steps}
                currentStepIndex={currentStepIndex}
                isLoading={isLoading}
                isSuccess={isSuccess}
                successMessage="Your Crisp account is now connected."
                onCloseWindow={handleCloseWindow}
                // Pass navigation buttons as props to the template
                backButton={
                    currentStepIndex > 0 ? (
                        <Button type="button" onClick={handleBackStep} variant="outline" className="min-w-[120px]" disabled={isLoading}>
                            Back
                        </Button>
                    ) : null
                }
                nextButton={
                    currentStepIndex < steps.length - 1 ? (
                         <Button type="button" onClick={handleNextStep} className="min-w-[120px]" disabled={isLoading}>
                            Next Step
                        </Button>
                    ) : null
                }
                submitButton={
                    currentStepIndex === steps.length - 1 ? (
                        <Button type="submit" className="min-w-[120px]" disabled={isLoading || !secretValue.trim()}>
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
                    ) : null
                }
            >
                {/* Render the current step component defined in the steps array */}
                {steps[currentStepIndex]?.component} 
            </FormTemplate>
        </form>
    );
} 