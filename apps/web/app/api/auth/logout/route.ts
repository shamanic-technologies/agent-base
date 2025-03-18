/**
 * Server-side API route to securely handle logout
 * This allows us to use the API key without exposing it to the client
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
  const gatewayApiKey = process.env.GATEWAY_API_KEY;
  
  // Forward cookies from the request
  const cookies = request.cookies.toString();
  
  try {
    const response = await fetch(`${webGatewayUrl}/auth/logout`, {
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
    console.error('Error during logout:', error);
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
} 