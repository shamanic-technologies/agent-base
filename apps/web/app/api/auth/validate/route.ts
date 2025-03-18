/**
 * Server-side API route to securely validate authentication
 * This allows us to use the API key without exposing it to the client
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
  const gatewayApiKey = process.env.GATEWAY_API_KEY;
  
  // Forward cookies from the request
  const cookies = request.cookies.toString();
  
  try {
    const response = await fetch(`${webGatewayUrl}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'x-api-key': gatewayApiKey || '',
      },
    });
    
    const data = await response.json();
    
    // Return the response from the web gateway
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error validating authentication:', error);
    return NextResponse.json({ success: false, error: 'Authentication validation failed' }, { status: 500 });
  }
} 