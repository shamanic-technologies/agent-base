/**
 * Get Secret API Endpoint
 * 
 * Retrieves a secret from Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/google-secret-manager';
import { GetSecretResponse } from '@agent-base/agents';

/**
 * GET handler for retrieving secrets by secretType
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { secretType: string } }
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    const { secretType } = params;
    
    if (!userIdFromHeader) {
      return NextResponse.json(
        { success: false, error: 'User ID is required in x-user-id header' },
        { status: 400 }
      );
    }

    if (!secretType) {
      return NextResponse.json(
        { success: false, error: 'Secret type is required' },
        { status: 400 }
      );
    }

    const result = await getSecret(userIdFromHeader, secretType);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Secret not found' },
        { status: 404 }
      );
    }

    const response: GetSecretResponse = {
      success: true,
      data: {
        value: result.data
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error retrieving secret:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 