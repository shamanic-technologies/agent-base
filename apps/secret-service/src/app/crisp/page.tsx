import { Suspense } from 'react';
import CrispFormClient from './CrispFormClient';
import { Card, CardContent } from "@/components/ui/card";

/**
 * Server component page for Crisp setup.
 * Wraps the client component in Suspense.
 */
export default function CrispSetupPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}> 
            <Card className="w-full max-w-lg shadow-xl border border-gray-200 dark:border-gray-700">
                {/* Remove CardContent padding, template handles it */}
                <CardContent className="p-0"> 
                    <CrispFormClient />
                </CardContent>
            </Card>
        </Suspense>
    );
} 