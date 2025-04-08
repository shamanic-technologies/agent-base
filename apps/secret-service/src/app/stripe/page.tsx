import { Suspense } from 'react';
import StripeFormClient from './StripeFormClient'; // Assuming this will be the client component name
import { Card, CardContent } from "@/components/ui/card";

/**
 * Server component page for Stripe setup.
 * Wraps the client component in Suspense.
 */
export default function StripeSetupPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}> 
            <Card className="w-full max-w-lg shadow-xl border border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                    <StripeFormClient />
                </CardContent>
            </Card>
        </Suspense>
    );
} 