/**
 * API Route: Users
 * Securely fetches user data from the database service via web gateway
 */
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
    const gatewayApiKey = process.env.GATEWAY_API_KEY;

    if (!webGatewayUrl || !gatewayApiKey) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(`${webGatewayUrl}/database/db/users`, {
      headers: {
        'x-api-key': gatewayApiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch users data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in users API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 