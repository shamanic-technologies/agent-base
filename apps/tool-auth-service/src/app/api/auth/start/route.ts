import { NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const state = searchParams.get('state');
  const scopes = searchParams.get('scopes');
  const callbackUrl = searchParams.get('callbackUrl');

  if (!state) {
    return new Response('Missing state parameter', { status: 400 });
  }

  const redirectUrl = new URL('/api/auth/signin', req.nextUrl.origin);
  if (callbackUrl) {
    redirectUrl.searchParams.set('callbackUrl', callbackUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  
  const cookieValue = JSON.stringify({ state, scopes: scopes || '' });

  // Use a single, secure, http-only cookie to pass state and scopes through the OAuth flow.
  response.cookies.set('next-auth.dynamic-params', cookieValue, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return response;
} 