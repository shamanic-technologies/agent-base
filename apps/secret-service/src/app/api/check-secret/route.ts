/**
 * Check Secret API Endpoint
 * 
 * Checks if a secret exists for a given user
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkSecretExists } from '@/lib/google-secret-manager';
import { CheckSecretRequest, CheckSecretResponse } from '@agent-base/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, secretType } : CheckSecretRequest = body;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!secretType) {
      return NextResponse.json(
        { error: 'secretType is required' },
        { status: 400 }
      );
    }

    // Check if the secret exists
    const result: CheckSecretResponse = await checkSecretExists({ userId, secretType });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error checking secret:', error);
    return NextResponse.json(
      {
        error: 'Failed to check if secret exists',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 