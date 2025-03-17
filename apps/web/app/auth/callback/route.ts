import { NextRequest, NextResponse } from 'next/server';

/**
 * Super simple callback handler for auth-service
 */
export async function GET(request: NextRequest) {
  // Just redirect to /home - auth-service has already set the cookie
  return NextResponse.redirect(new URL('/home', request.url));
}
