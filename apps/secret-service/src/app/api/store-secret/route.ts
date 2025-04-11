/**
 * Store Secret API Endpoint
 * 
 * Stores a secret in Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { storeSecret } from '@/lib/google-secret-manager';
import { StoreSecretRequest, StoreSecretResponse } from '@agent-base/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Get userId from request header
    const userIdFromHeader = request.headers.get('x-user-id');
    const { secretType, secretValue }: StoreSecretRequest = body;
    
    // Only use userId from header (from API gateway)
    const userId = userIdFromHeader;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required in x-user-id header' } as StoreSecretResponse,
        { status: 400 }
      );
    }

    if (!secretType) {
      return NextResponse.json(
        { success: false, error: 'secretType is required' } as StoreSecretResponse,
        { status: 400 }
      );
    }

    if (!secretValue) {
      return NextResponse.json(
        { success: false, error: 'secretValue is required' } as StoreSecretResponse,
        { status: 400 }
      );
    }

    // Store the secret
    const result: StoreSecretResponse = await storeSecret(body, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to store secret' } as StoreSecretResponse,
        { status: 500 }
      );
    }

    const response: StoreSecretResponse = {
      success: true,
      message: result.message
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error storing secret:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as StoreSecretResponse as StoreSecretResponse,
      { status: 500 }
    );
  }
} 