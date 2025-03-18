/**
 * Server-side API route to securely initiate Google authentication
 * This calls the web gateway with the API key, then redirects to Google
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const webGatewayUrl = process.env.NEXT_PUBLIC_WEB_GATEWAY_URL;
  const gatewayApiKey = process.env.GATEWAY_API_KEY;
  
  // Get the current origin for the return URL
  const origin = request.nextUrl.origin;
  
  try {
    // Call the auth service via gateway with API key
    const response = await fetch(`${webGatewayUrl}/oauth/google?origin=${encodeURIComponent(origin)}`, {
      method: 'GET',
      headers: {
        'x-api-key': gatewayApiKey || '',
      },
      // Don't follow redirects automatically, we need to handle them manually
      redirect: 'manual',
    });
    
    // For OAuth flow, we expect a 302 redirect status code
    if (response.status >= 300 && response.status < 400) {
      // Get the redirect URL from the Location header
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        // Forward the redirect to the client
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to initiate Google authentication'
      }, { status: response.status });
    }
    
    // If we somehow get here without a redirect, try to get the URL from response
    const responseData = await response.json().catch(() => ({}));
    return NextResponse.json(responseData || { 
      success: false, 
      error: 'Missing redirect from authentication service' 
    });
    
  } catch (error) {
    console.error('Error initiating Google auth:', error);
    return NextResponse.json({
      success: false,
      error: 'Could not contact authentication service'
    }, { status: 500 });
  }
} 