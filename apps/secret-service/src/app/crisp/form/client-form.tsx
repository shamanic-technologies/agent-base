'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardFooter } from "@/components/ui/card"; // Import CardFooter if needed here

/**
 * Client component containing the Crisp configuration form logic.
 * Handles input, submission, API calls, and communication with the opener window.
 */
export default function CrispClientForm() {
    const [crispWebsiteId, setCrispWebsiteId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState<string | null>(null); // Will be set by postMessage

    /**
     * Effect to listen for the origin message from the opener window.
     */
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            console.log('Popup received message:', event.data, 'from origin:', event.origin);

            // Verify the message structure and that the sender matches the origin in the data
            if (event.data && 
                event.data.type === 'origin_request_response' && 
                typeof event.data.origin === 'string' &&
                event.origin === event.data.origin) { // <<< Key check: sender IS who they claim to be in the data
                
                console.log(`Received and verified origin from opener: ${event.origin}`);
                setOrigin(event.origin); // Store the verified origin
            } else {
                console.warn('Ignoring message: Invalid format or origin mismatch.', {
                    senderOrigin: event.origin,
                    dataType: event.data?.type,
                    dataOrigin: event.data?.origin
                });
            }
        };

        window.addEventListener('message', handleMessage);
        console.log('Popup message listener added. Waiting for origin message.');

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener('message', handleMessage);
            console.log('Popup message listener removed.');
        };
    }, []); // Empty dependency array means this runs once on mount

    /**
     * Handles the form submission to save the Crisp Website ID.
     */
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        if (!crispWebsiteId.trim()) {
            console.error("Validation Error: Crisp Website ID cannot be empty.");
            setIsLoading(false);
            return;
        }

        if (!origin) {
            // This should ideally not happen if the button is disabled correctly
            console.error("Cannot send postMessage: Origin not received from opener or was invalid.");
            setIsLoading(false);
            return;
        }

        try {
            // Authentication token (if needed) should be handled by the application's
            // authentication flow (e.g., passed via query params or fetched client-side).
            // const token = getAuthTokenFromSomewhere();

            // Call the generic store-secret endpoint
            const response = await fetch('/api/store-secret', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // If using token-based auth, include the Authorization header:
                    // ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    secretType: 'crisp_website_id', // Use a consistent type name
                    secretValue: crispWebsiteId.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to save Crisp secret.');
            }

            console.log("Crisp configuration saved successfully.");
            
            // Notify opener and close
            window.opener?.postMessage({ success: true, type: 'crisp_setup_complete' }, origin);
            setTimeout(() => window.close(), 1000);

        } catch (error: any) {
            console.error("Error saving Crisp secret:", error);
            // Notify opener of failure
            window.opener?.postMessage({ success: false, error: error.message, type: 'crisp_setup_complete' }, origin);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="crisp-website-id">Crisp Website ID</Label>
                <Input
                    id="crisp-website-id"
                    type="text"
                    placeholder="Enter your Crisp Website ID"
                    value={crispWebsiteId}
                    onChange={(e) => setCrispWebsiteId(e.target.value)}
                    required
                    disabled={isLoading}
                    aria-describedby="crisp-id-description"
                />
                {/* Removed CardDescription from here as it's in the parent page.tsx */}
                 <p id="crisp-id-description" className="text-sm text-gray-500 dark:text-gray-400">
                    This ID links your Agent Base to your Crisp account.
                 </p>
            </div>

            {/* TODO: Add User/Org context display if needed */}
            {/* <p className="text-sm text-gray-500 dark:text-gray-400">Configuring for: [User/Org Name]</p> */}

            <CardFooter className="p-0 pt-4"> {/* Adjust padding if needed */}
                <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !origin} // <<< Disable button if origin is not set
                >
                    {isLoading ? 'Saving...' : (
                        !origin ? 'Waiting for connection...' : 'Save and Connect' // <<< Update button text
                    )}
                </Button>
            </CardFooter>
        </form>
    );
} 