/**
 * API route to handle proxy requests to the Agent Base
 * This keeps the API key secure on the server side
 */
import { NextRequest, NextResponse } from 'next/server';
import { callServerProxyApi } from '../../../lib/api';

// POST handler for proxy requests
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { endpoint, method = 'POST', data } = body;
    
    // Validate required fields
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing required field: endpoint' },
        { status: 400 }
      );
    }
    
    // Call the proxy service
    const result = await callServerProxyApi(endpoint, method, data);
    
    // Return the result
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Proxy API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred while calling the proxy service' },
      { status: 500 }
    );
  }
}

// GET handler for testing connection
export async function GET() {
  try {
    // Test the connection to the proxy service
    const result = await callServerProxyApi('/api/proxy-mode', 'GET');
    
    return NextResponse.json({
      status: 'connected',
      message: 'Successfully connected to the Agent Base service',
      result
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    
    return NextResponse.json(
      {
        status: 'failed',
        error: error.message || 'Failed to connect to the Agent Base service'
      },
      { status: 500 }
    );
  }
} 