'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { PartyPopper, X } from 'lucide-react';

// --- Interfaces ---
interface StepDefinition {
  title: string;
  component?: React.ReactNode; // Make component optional as children can be used
}

interface FormTemplateProps {
  title: string;
  steps: StepDefinition[];
  currentStepIndex: number;
  isLoading: boolean;
  isSuccess: boolean;
  successMessage: string;
  children?: ReactNode; // To allow passing custom content/buttons if needed
  onCloseWindow: () => void;
  submitButton?: ReactNode; // Allow parent to pass a custom submit button
  backButton?: ReactNode;   // Allow parent to pass a custom back button
  nextButton?: ReactNode;   // Allow parent to pass a custom next button
}

export const FormTemplate: React.FC<FormTemplateProps> = ({
  title,
  steps,
  currentStepIndex,
  isLoading, // Needed for disabling buttons potentially
  isSuccess,
  successMessage,
  children, // Render the specific step component passed as children
  onCloseWindow, // Callback to close the window
  submitButton, // Optional custom submit button
  backButton,   // Optional custom back button
  nextButton,   // Optional custom next button
}) => {

    // --- Auto-close Effect ---
    useEffect(() => {
        let closeTimer: NodeJS.Timeout | null = null;
        if (isSuccess) {
            console.log("Success state reached. Starting auto-close timer.");
            closeTimer = setTimeout(() => {
                console.log("Auto-closing window.");
                onCloseWindow();
            }, 3000);
        }
        return () => { if (closeTimer) clearTimeout(closeTimer); };
    }, [isSuccess, onCloseWindow]);

    // --- Render Logic ---
    const totalSteps = steps.length;
    const CurrentStepDefinition = steps[currentStepIndex];
    const CurrentStepComponent = CurrentStepDefinition?.component; // Component defined in step config
    const isLastStep = currentStepIndex === totalSteps - 1;

    if (isSuccess) {
        // Success Screen
        return (
            <div className="space-y-4 text-center p-6">
                <div className="flex justify-center">
                    <PartyPopper className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Connection Successful!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {successMessage} This window will close automatically.
                </p>
                <div className="pt-4">
                    <Button type="button" onClick={onCloseWindow} variant="outline" className="min-w-[120px]">
                        <X className="h-4 w-4 mr-1"/> Close Now
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6"> {/* Added padding here */}
            {/* Title and Stepper */}
            <div className="mb-6">
                 <h2 className="text-center text-xl font-semibold mb-4">{title}</h2>
                {totalSteps > 1 && ( // Only show stepper if more than one step
                    <>
                        <div className="flex items-center justify-between mb-2">
                            {steps.map((step, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 ${
                                        currentStepIndex === index ? 'bg-blue-600 text-white border-blue-700' :
                                        currentStepIndex > index ? 'bg-blue-100 text-blue-700 border-blue-600' :
                                        'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                                    }`}>
                                        {currentStepIndex > index ? '✓' : index + 1}
                                    </div>
                                    <span className={`mt-1 text-xs font-medium ${currentStepIndex >= index ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="relative flex h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 mt-1">
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
                                style={{ width: totalSteps > 1 ? `${(currentStepIndex / (totalSteps - 1)) * 100}%` : (currentStepIndex === 0 ? '0%' : '100%')}} // Handle single step case
                            ></div>
                        </div>
                    </>
                )}
            </div>

            {/* Render the current step component passed via children prop */}
            {children}
            
            {/* Render provided navigation buttons */}
             {(backButton || nextButton || submitButton) && (
                 <div className={`flex pt-4 ${backButton ? 'justify-between' : 'justify-end'}`}>
                    {backButton}
                    {isLastStep ? submitButton : nextButton}
                 </div>
             )}
        </div>
    );
}; 