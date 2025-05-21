import { NextResponse } from 'next/server';

/**
 * Health check endpoint for the Tool Auth Service.
 * Returns a 200 OK response if the service is running.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'tool-auth-service' });
} 