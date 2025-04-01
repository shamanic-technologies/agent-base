/**
 * Health Check API Endpoint
 * 
 * Provides a simple status check for the Secret Service
 */
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return a successful health check response
    return NextResponse.json(
      {
        status: 'healthy',
        service: 'secret-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 