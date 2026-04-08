import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

// Public routes - allow everyone to access
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Role-specific dashboard routes
const ROLE_DASHBOARDS = {
  'ADMIN': '/dashboard/admin',
  'MANAGER': '/dashboard/manager',
  'EDITOR': '/dashboard/editor',
  'VIEWER': '/dashboard/viewer',
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Get token from Authorization header or cookie
  let token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    token = request.cookies.get('accessToken')?.value;
  }
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For API routes without token, return 401
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Verify token
  const { valid, decoded } = await verifyAccessToken(token);
  
  if (!valid && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  if (!valid && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};