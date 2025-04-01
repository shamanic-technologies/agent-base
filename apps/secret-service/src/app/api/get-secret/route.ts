/**
 * Get Secret API Endpoint
 * 
 * Retrieves a secret from Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/google-secret-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, secretType } = body;

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

    // Get the secret
    const result = await getSecret(userId, secretType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to retrieve secret' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error getting secret:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 