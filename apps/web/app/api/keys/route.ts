/**
 * API Route: Keys
 * Securely manages API keys via web gateway
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
    const gatewayApiKey = process.env.GATEWAY_API_KEY;

    if (!webGatewayUrl || !gatewayApiKey) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(`${webGatewayUrl}/keys/keys?userId=${userId}`, {
      headers: {
        'x-api-key': gatewayApiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch keys' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in keys API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
    const gatewayApiKey = process.env.GATEWAY_API_KEY;

    if (!webGatewayUrl || !gatewayApiKey) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(`${webGatewayUrl}/keys/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': gatewayApiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create key' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in keys API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 