/**
 * Store Secret API Endpoint
 * 
 * Stores a secret in Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { storeSecret } from '@/lib/google-secret-manager';
import { StoreSecretRequest, ServiceResponse, ErrorResponse } from '@agent-base/types';

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
        { success: false, error: 'userId is required in x-user-id header' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (!secretType) {
      return NextResponse.json(
        { success: false, error: 'secretType is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (!secretValue) {
      return NextResponse.json(
        { success: false, error: 'secretValue is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Store the secret
    const storeResponse = await storeSecret(body, userId);

    if (!storeResponse.success) {
      return NextResponse.json(
        { success: false, error: storeResponse.error || 'Failed to store secret' } as ErrorResponse,
        { status: 500 }
      );
    }

    const response: ServiceResponse<string> = {
      success: true,
      data: storeResponse.data
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error storing secret:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ErrorResponse,
      { status: 500 }
    );
  }
} 