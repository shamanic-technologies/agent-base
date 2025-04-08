import React from 'react';
import CrispClientForm from './client-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Server component page for Crisp configuration.
 * Renders the main card layout and embeds the client form component.
 */
export default function CrispFormPage() {
    // TODO: Fetch any necessary server-side data if needed (e.g., user/org info for display)
    // const userData = await getUserData(); // Example

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Configure Crisp Integration</CardTitle>
                    <CardDescription>
                        Enter your Crisp Website ID to connect your account. You can find this ID in your Crisp settings under Website Settings &gt; Setup Instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Pass any server-fetched data as props if needed */}
                    <CrispClientForm /> 
                </CardContent>
                {/* CardFooter can be added here or within ClientForm if needed */}
            </Card>
        </div>
    );
} 