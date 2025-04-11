/**
 * Get Secret API Endpoint
 * 
 * Retrieves a secret from Google Secret Manager
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/google-secret-manager';
import { GetSecretResponse, ErrorResponse, ServiceResponse } from '@agent-base/agents';

/**
 * GET handler for retrieving secrets
 * Handles both path-based and query parameter-based requests
 */
export async function GET(
  request: NextRequest
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    
    // Check if secretType is in the URL path or query parameters
    const url = new URL(request.url);
    let secretType = '';
    
    // Try to get from path first (last segment of the path)
    const pathParts = url.pathname.split('/');
    if (pathParts.length > 0) {
      const lastSegment = pathParts[pathParts.length - 1];
      // Only use the last segment if it's not 'get-secret' itself
      if (lastSegment && lastSegment !== 'get-secret') {
        secretType = lastSegment;
      }
    }
    
    // If not found in path, try query parameter
    if (!secretType) {
      const queryParam = url.searchParams.get('secretType');
      if (queryParam) {
        secretType = queryParam;
      }
    }
    
    // Log for debugging
    console.log(`Attempting to get secret with user_id: ${userIdFromHeader}, secretType: ${secretType}, full URL: ${url.toString()}`);
    
    if (!userIdFromHeader) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'User ID is required in x-user-id header'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!secretType) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Secret type is required in URL path or as a query parameter'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const result = await getSecret(userIdFromHeader, secretType);

    if (!result.success) {
      console.log(`Secret not found for user_id: ${userIdFromHeader}, secretType: ${secretType}`);
      const errorResponse: ErrorResponse = {
        success: false,
        error: result.error || 'Secret not found'
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log(`Successfully retrieved secret for user_id: ${userIdFromHeader}, secretType: ${secretType}`);
    const response: GetSecretResponse = {
      success: true,
      data: {
        value: result.data
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error retrieving secret:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Failed to retrieve secret',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 