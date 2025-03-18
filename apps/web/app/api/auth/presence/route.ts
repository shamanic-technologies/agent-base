/**
 * Server-side API route to securely handle user presence updates
 * This allows us to use the API key without exposing it to the client
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
  const gatewayApiKey = process.env.GATEWAY_API_KEY;
  
  // Forward cookies from the request
  const cookies = request.cookies.toString();
  
  // Get the request body
  const body = await request.json();
  
  try {
    const response = await fetch(`${webGatewayUrl}/auth/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'x-api-key': gatewayApiKey || '',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    // Return the response from the web gateway
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user presence:', error);
    return NextResponse.json({ success: false, error: 'Failed to update presence' }, { status: 500 });
  }
} 