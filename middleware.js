// Simple middleware - only for API protection
import { NextResponse } from 'next/server';

// Public routes - allow everyone to access
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/verify',
  '/plain-login',
  '/test.html',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // For all other routes, just allow access (no redirects)
  // We'll handle authentication on the client side
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};