/**
 * Store Secret API Endpoint
 * 
 * Stores a secret in Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { storeSecret } from '@/lib/google-secret-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, secretType, secretValue } = body;

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

    if (!secretValue) {
      return NextResponse.json(
        { error: 'secretValue is required' },
        { status: 400 }
      );
    }

    // Store the secret
    const result = await storeSecret(userId, secretType, secretValue);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to store secret' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error storing secret:', error);
    return NextResponse.json(
      {
        error: 'Failed to store secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 