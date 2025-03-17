/**
 * Authentication Middleware
 * Redirects unauthenticated users to the auth service
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected paths that require authentication
 */
const PROTECTED_PATHS = ['/chat', '/dashboard'];

/**
 * Public paths that don't need to check authentication
 */
const PUBLIC_PATHS = [
  '/',
  '/auth/callback',
  '/api',
  '/health',
];

/**
 * Middleware function to handle authentication on each request
 * @param req The incoming request
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip authentication check for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path)) || 
      pathname.match(/\.(js|css|ico|png|jpg|svg|webp)$/)) {
    return NextResponse.next();
  }
  
  // Check if the path requires authentication
  const requiresAuth = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  if (requiresAuth) {
    // Check for the JWT authentication cookie
    const authToken = req.cookies.get('auth-token');
    
    // If no auth token, redirect to the home page
    if (!authToken?.value) {
      console.log('No authentication token found, redirecting to home');
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
  matcher: [
    // Exclude static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 