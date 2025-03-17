import { NextRequest, NextResponse } from 'next/server';

// Protected paths that require authentication
const PROTECTED_PATHS = ['/home', '/admin'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If path needs authentication
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    // Check for auth-token cookie
    const authToken = request.cookies.get('auth-token');
    
    // No auth token = redirect to sign-in
    if (!authToken?.value) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  }

  // Allow access for authenticated routes or public routes
  return NextResponse.next();
}
